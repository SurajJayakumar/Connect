"use client";

import { useEffect, useRef, useState } from "react";
import { Video, Camera, Mic, MicOff, PhoneOff, Users, AlertCircle, CheckCircle, Loader } from "lucide-react";

export default function VideoCall() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<string>("Initializing webcam...");
  const [webcamActive, setWebcamActive] = useState<boolean>(false);
  const [serverConnected, setServerConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [inCall, setInCall] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [roomId, setRoomId] = useState<string>("");
  const [inputRoomId, setInputRoomId] = useState<string>("");
  const [participants, setParticipants] = useState<number>(1);

  // WebRTC related state
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);

  // Start webcam on mount
  useEffect(() => {
    const getWebcam = async () => {
      try {
        setStatus("Requesting camera and microphone access...");
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 },
          audio: true
        });
        
        localStream.current = stream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          
          // Add event listener to confirm video is playing
          localVideoRef.current.onloadedmetadata = () => {
            if (localVideoRef.current) {
              localVideoRef.current.play()
                .then(() => {
                  setWebcamActive(true);
                  setStatus("Camera active. Ready to connect.");
                })
                .catch(err => {
                  setStatus(`Error playing video: ${err.message}`);
                });
            }
          };
        } else {
          setStatus("Video element not found");
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
        setStatus(`Camera access denied or not available: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    
    // Define the initializePeerConnection function inside useEffect
    const initializePeerConnection = () => {
      // Create a new RTCPeerConnection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Add event handlers
      pc.onicecandidate = handleICECandidate;
      pc.ontrack = handleTrackEvent;
      pc.oniceconnectionstatechange = handleICEConnectionStateChange;

      peerConnection.current = pc;
    };
    
    getWebcam();
    
    // Simulate server connection check
    setTimeout(() => {
      setServerConnected(true);
      setStatus("Ready to start or join a call");
    }, 1000);
    
    // Setup WebRTC peer connection
    initializePeerConnection();
    
    // Cleanup
    return () => {
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
    };
  }, []); // Empty dependency array is fine now since all used functions are defined inside

  const handleICECandidate = (event: RTCPeerConnectionIceEvent) => {
    if (event.candidate) {
      // In a real app, you would send this candidate to the other peer via your signaling server
      console.log("New ICE candidate:", event.candidate);
    }
  };

  const handleTrackEvent = (event: RTCTrackEvent) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = event.streams[0];
      setParticipants(2);
      setStatus("Connected to remote peer");
    }
  };

  const handleICEConnectionStateChange = () => {
    if (peerConnection.current) {
      console.log("ICE connection state:", peerConnection.current.iceConnectionState);
      
      // Handle connection state changes
      if (peerConnection.current.iceConnectionState === 'disconnected' || 
          peerConnection.current.iceConnectionState === 'failed' ||
          peerConnection.current.iceConnectionState === 'closed') {
        setInCall(false);
        setParticipants(1);
        setStatus("Call ended");
      }
    }
  };

  // Create a new function to initialize peer connection for later use
  const recreatePeerConnection = () => {
    // Create a new RTCPeerConnection
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add event handlers
    pc.onicecandidate = handleICECandidate;
    pc.ontrack = handleTrackEvent;
    pc.oniceconnectionstatechange = handleICEConnectionStateChange;

    peerConnection.current = pc;
  };

  const createRoom = async () => {
    if (!peerConnection.current || !localStream.current) return;
    
    setIsConnecting(true);
    setStatus("Creating a new room...");
    
    try {
      // Add local tracks to the connection
      localStream.current.getTracks().forEach(track => {
        if (localStream.current && peerConnection.current) {
          peerConnection.current.addTrack(track, localStream.current);
        }
      });
      
      // Create offer
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      
      // Generate a random room ID
      const generatedRoomId = Math.random().toString(36).substring(2, 9);
      setRoomId(generatedRoomId);
      
      // In a real app, you would send this offer to your signaling server
      console.log("Created room with ID:", generatedRoomId);
      console.log("Offer:", offer);
      
      setInCall(true);
      setStatus(`Room created. Share ID: ${generatedRoomId}`);
    } catch (err) {
      console.error("Error creating room:", err);
      setStatus(`Failed to create room: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const joinRoom = async () => {
    if (!peerConnection.current || !localStream.current || !inputRoomId) return;
    
    setIsConnecting(true);
    setStatus(`Joining room ${inputRoomId}...`);
    
    try {
      // Add local tracks to the connection
      localStream.current.getTracks().forEach(track => {
        if (localStream.current && peerConnection.current) {
          peerConnection.current.addTrack(track, localStream.current);
        }
      });
      
      setRoomId(inputRoomId);
      
      // In a real app, you would fetch the offer from your signaling server
      // For this demo, we'll create a valid simulated offer
      // FIXED: Create a valid ice-pwd that meets the length requirements (22-256 chars)
      const validIcePwd = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // 42 characters
      
      const simulatedOffer = {
        type: 'offer',
        sdp: 'v=0\r\no=- 1234567890 1 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0 1\r\n' +
             'a=msid-semantic: WMS stream_id\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nc=IN IP4 0.0.0.0\r\n' +
             'a=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:someufragxyz\r\n' + 
             `a=ice-pwd:${validIcePwd}\r\n` +
             'a=fingerprint:sha-256 00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF\r\n' +
             'a=setup:actpass\r\na=mid:0\r\na=sendrecv\r\na=rtcp-mux\r\na=rtpmap:111 opus/48000/2\r\n' +
             'a=msid:stream_id audio_track_id\r\na=ssrc:1001 cname:somecname\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\n' +
             'c=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:someufragxyz\r\n' + 
             `a=ice-pwd:${validIcePwd}\r\n` +
             'a=fingerprint:sha-256 00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF\r\n' +
             'a=setup:actpass\r\na=mid:1\r\na=sendrecv\r\na=rtcp-mux\r\na=rtpmap:96 VP8/90000\r\n' +
             'a=msid:stream_id video_track_id\r\na=ssrc:2001 cname:somecname\r\n'
      };
      
      // Set the remote description (offer)
      await peerConnection.current.setRemoteDescription(simulatedOffer as RTCSessionDescriptionInit);
      
      // Create answer
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      
      // In a real app, you would send this answer to your signaling server
      console.log("Joined room:", inputRoomId);
      console.log("Answer:", answer);
      
      setInCall(true);
      setParticipants(2);
      setStatus("Connected to call");
    } catch (err) {
      console.error("Error joining room:", err);
      setStatus(`Failed to join room: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const endCall = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      recreatePeerConnection(); // Use the renamed function for future calls
    }
    setInCall(false);
    setParticipants(1);
    setRoomId("");
    setInputRoomId("");
    setStatus("Call ended");
  };

  const toggleMute = () => {
    if (localStream.current) {
      const audioTracks = localStream.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-black via-[#1a032e] to-black text-white">
      <div className="p-4 sm:p-6 md:p-8 w-full max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-500 to-fuchsia-500 bg-clip-text text-transparent">
          Video Call
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Local Video Section */}
          <div className="bg-purple-900/5 border border-purple-900/20 rounded-xl p-4 flex flex-col">
            <h2 className="text-lg font-medium mb-2 text-gray-300">Your Camera</h2>
            <div className="relative mb-4 flex-1">
              <video
                ref={localVideoRef}
                className="rounded-xl shadow-md border-2 border-purple-900/30 w-full h-full object-cover bg-black"
                muted
                playsInline
                autoPlay
              />
              
              {/* Processing indicator overlay */}
              {isConnecting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                  <div className="flex items-center space-x-2 bg-purple-900/80 px-4 py-2 rounded-lg border border-purple-500/40">
                    <Loader className="animate-spin h-5 w-5 text-purple-500" />
                    <span className="text-sm text-white">Connecting...</span>
                  </div>
                </div>
              )}

              {/* Mute indicator */}
              {isMuted && (
                <div className="absolute top-2 left-2 bg-red-500/80 rounded-full p-1">
                  <MicOff className="h-4 w-4 text-white" />
                </div>
              )}
            </div>

            {/* Status indicators */}
            <div className="bg-purple-900/10 border border-purple-900/30 rounded-lg p-3 mt-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Camera className="h-5 w-5 mr-2 text-purple-400" />
                  <span className="text-sm font-medium">Camera:</span>
                </div>
                <div className="flex items-center">
                  {webcamActive ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm ${webcamActive ? "text-green-500" : "text-red-500"}`}>
                    {webcamActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center">
                  <Video className="h-5 w-5 mr-2 text-purple-400" />
                  <span className="text-sm font-medium">Server:</span>
                </div>
                <div className="flex items-center">
                  {serverConnected ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm ${serverConnected ? "text-green-500" : "text-red-500"}`}>
                    {serverConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>
              </div>
              
              {/* Participants counter */}
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-purple-400" />
                  <span className="text-sm font-medium">Participants:</span>
                </div>
                <span className="text-sm text-purple-300">{participants}</span>
              </div>
              
              {/* Show status message */}
              <div className="mt-2 text-sm text-gray-400">
                Status: {status}
              </div>
            </div>
          </div>

          {/* Remote Video / Controls Section */}
          <div className="bg-purple-900/10 border border-purple-900/30 rounded-xl p-4 flex flex-col">
            {inCall ? (
              <>
                <h2 className="text-lg font-medium mb-2 text-gray-300">Remote Camera</h2>
                <div className="relative mb-4 flex-1">
                  <video
                    ref={remoteVideoRef}
                    className="rounded-xl shadow-md border-2 border-purple-900/30 w-full h-full object-cover bg-black"
                    playsInline
                    autoPlay
                  />
                </div>
                <div className="flex justify-center space-x-4 mt-4">
                  <button 
                    className="py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white rounded-xl flex items-center justify-center gap-2 transition-all"
                    onClick={toggleMute}
                  >
                    {isMuted ? (
                      <>
                        <MicOff className="h-5 w-5" />
                        Unmute
                      </>
                    ) : (
                      <>
                        <Mic className="h-5 w-5" />
                        Mute
                      </>
                    )}
                  </button>
                  <button 
                    className="py-3 px-6 bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center justify-center gap-2 transition-all"
                    onClick={endCall}
                  >
                    <PhoneOff className="h-5 w-5" />
                    End Call
                  </button>
                </div>
                
                {roomId && (
                  <div className="mt-4 bg-purple-900/20 border border-purple-900/40 rounded-lg p-3 text-center">
                    <h3 className="text-sm font-medium text-gray-400 mb-1">Room ID</h3>
                    <div className="text-lg font-mono bg-purple-900/30 px-3 py-2 rounded-md">
                      {roomId}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Share this ID with others to join your call</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col h-full justify-center">
                <h2 className="text-xl font-bold mb-6 bg-gradient-to-r from-purple-500 to-fuchsia-500 bg-clip-text text-transparent text-center">
                  Start or Join a Call
                </h2>

                <div className="space-y-6">
                  <button 
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
                    onClick={createRoom}
                    disabled={!webcamActive || isConnecting}
                  >
                    <Video className="h-5 w-5" />
                    Create New Call
                  </button>
                  
                  <div className="text-center text-gray-400">OR</div>
                  
                  <div className="space-y-3">
                    <div className="flex flex-col">
                      <label className="text-sm text-gray-400 mb-1">Enter Room ID to Join</label>
                      <input 
                        type="text" 
                        className="bg-purple-900/20 border border-purple-900/40 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter room ID..."
                        value={inputRoomId}
                        onChange={(e) => setInputRoomId(e.target.value)}
                      />
                    </div>
                    <button 
                      className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl flex items-center justify-center gap-2 transition-all"
                      onClick={joinRoom}
                      disabled={!inputRoomId || !webcamActive || isConnecting}
                    >
                      <Users className="h-5 w-5" />
                      Join Call
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}