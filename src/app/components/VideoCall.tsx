'use client';

import { useEffect, useRef, useState } from "react";
import { Video, Mic, MicOff, PhoneOff, Users, Loader } from "lucide-react";
import { collection, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function VideoCall() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("Initializing webcam...");
  const [webcamActive, setWebcamActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [inputRoomId, setInputRoomId] = useState("");

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);

  useEffect(() => {
    const getWebcam = async () => {
      try {
        setStatus("Requesting camera and microphone access...");
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStream.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.onloadedmetadata = () => {
            localVideoRef.current?.play().then(() => {
              setWebcamActive(true);
              setStatus("Camera active. Ready to connect.");
            });
          };
        }
      } catch (err) {
        setStatus(`Camera access denied: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    const setupPeer = () => {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      pc.onicecandidate = (e) => console.log("ICE candidate:", e.candidate);
      pc.ontrack = (e) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
          setStatus("Connected to peer.");
        }
      };
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log("ICE state:", state);
        if (["disconnected", "failed", "closed"].includes(state)) {
          setInCall(false);
          setStatus("Call ended.");
        }
      };

      peerConnection.current = pc;
    };

    getWebcam();
    setupPeer();
    setTimeout(() => {
      setStatus("Ready to start or join a call");
    }, 1000);

    return () => {
      localStream.current?.getTracks().forEach(track => track.stop());
      peerConnection.current?.close();
    };
  }, []);

  const createRoom = async () => {
    if (!peerConnection.current || !localStream.current) return;

    setIsConnecting(true);
    setStatus("Creating a new room...");

    try {
      localStream.current.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, localStream.current!);
      });

      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);

      const roomRef = await addDoc(collection(db, "rooms"), {
        offer: {
          type: offer.type,
          sdp: offer.sdp,
        }
      });

      const generatedRoomId = roomRef.id;
      setRoomId(generatedRoomId);
      setInCall(true);
      setStatus(`Room created. Share ID: ${generatedRoomId}`);
    } catch (err) {
      console.error("Error creating room:", err);
      setStatus("Failed to create room.");
    } finally {
      setIsConnecting(false);
    }
  };

  const joinRoom = async () => {
    if (!peerConnection.current || !localStream.current || !inputRoomId) return;

    setIsConnecting(true);
    setStatus(`Joining room ${inputRoomId}...`);

    try {
      const roomRef = doc(db, "rooms", inputRoomId);
      const roomSnap = await getDoc(roomRef);

      if (!roomSnap.exists()) {
        setStatus("Room not found.");
        return;
      }

      const roomData = roomSnap.data();
      const offer = roomData?.offer;

      if (!offer) {
        setStatus("Offer not found in the room.");
        return;
      }

      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
      localStream.current.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, localStream.current!);
      });

      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      await updateDoc(roomRef, {
        answer: {
          type: answer.type,
          sdp: answer.sdp,
        }
      });

      setRoomId(inputRoomId);
      setInCall(true);
      setStatus("Joined the room. Connected!");
    } catch (err) {
      console.error("Error joining room:", err);
      setStatus("Failed to join room.");
    } finally {
      setIsConnecting(false);
    }
  };

  const endCall = () => {
    peerConnection.current?.close();
    setInCall(false);
    setRoomId("");
    setInputRoomId("");
    setStatus("Call ended");
  };

  const toggleMute = () => {
    if (localStream.current) {
      const audioTracks = localStream.current.getAudioTracks();
      audioTracks.forEach(track => track.enabled = !track.enabled);
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
          <div className="bg-purple-900/5 border border-purple-900/20 rounded-xl p-4 flex flex-col">
            <h2 className="text-lg font-medium mb-2 text-gray-300">Your Camera</h2>
            <div className="relative mb-4 flex-1">
              <video ref={localVideoRef} className="rounded-xl border w-full h-full object-cover bg-black" muted playsInline autoPlay />
              {isConnecting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                  <div className="flex items-center space-x-2 bg-purple-900/80 px-4 py-2 rounded-lg">
                    <Loader className="animate-spin h-5 w-5 text-purple-500" />
                    <span className="text-sm">Connecting...</span>
                  </div>
                </div>
              )}
              {isMuted && (
                <div className="absolute top-2 left-2 bg-red-500/80 rounded-full p-1">
                  <MicOff className="h-4 w-4 text-white" />
                </div>
              )}
            </div>

            <div className="mt-2 text-sm text-gray-400">Status: {status}</div>
          </div>

          <div className="bg-purple-900/10 border border-purple-900/30 rounded-xl p-4 flex flex-col">
            {inCall ? (
              <>
                <h2 className="text-lg font-medium mb-2 text-gray-300">Remote Camera</h2>
                <video ref={remoteVideoRef} className="rounded-xl border w-full h-full object-cover bg-black" playsInline autoPlay />
                <div className="flex justify-center gap-4 mt-4">
                  <button onClick={toggleMute} className="px-4 py-2 bg-gray-700 text-white rounded-xl flex items-center gap-2">
                    {isMuted ? <><MicOff className="h-4 w-4" /> Unmute</> : <><Mic className="h-4 w-4" /> Mute</>}
                  </button>
                  <button onClick={endCall} className="px-4 py-2 bg-red-600 text-white rounded-xl flex items-center gap-2">
                    <PhoneOff className="h-4 w-4" /> End Call
                  </button>
                </div>
                <div className="mt-4 text-sm text-gray-400 text-center">
                  Room ID: <span className="font-mono">{roomId}</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col h-full justify-center">
                <h2 className="text-xl font-bold mb-6 bg-gradient-to-r from-purple-500 to-fuchsia-500 bg-clip-text text-transparent text-center">
                  Start or Join a Call
                </h2>

                <button onClick={createRoom} disabled={!webcamActive || isConnecting}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl mb-4">
                  <Video className="h-5 w-5 inline-block mr-2" />
                  Create New Call
                </button>

                <div className="text-center text-gray-400">OR</div>

                <input value={inputRoomId} onChange={(e) => setInputRoomId(e.target.value)}
                  className="w-full mt-4 px-4 py-2 rounded-lg bg-purple-800/30 border border-purple-500/40 text-white"
                  placeholder="Enter Room ID" />

                <button onClick={joinRoom} disabled={!inputRoomId || !webcamActive || isConnecting}
                  className="w-full py-3 mt-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl flex items-center justify-center gap-2">
                  <Users className="h-5 w-5" />
                  Join Call
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}