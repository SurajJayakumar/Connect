'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  addDoc
} from 'firebase/firestore';
import { db } from '../firebase';

// Add this type definition at the top of the file
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function VideoCall() {
  // State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callId, setCallId] = useState('');
  const [buttons, setButtons] = useState({ cam: false, call: true, answer: true, hangup: true });
  
  // Speech recognition state
  const [localTranscript, setLocalTranscript] = useState('');
  const [remoteTranscript, setRemoteTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  // Refs for video elements and unsubscribes
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const unsubOffer = useRef<() => void | undefined>(undefined);
  const unsubAnswer = useRef<() => void | undefined>(undefined);

  // STUN servers config
  const servers = {
    iceServers: [
      { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
    ],
    iceCandidatePoolSize: 10
  };

  const setupPeerConnection = () => {
    const pc = new RTCPeerConnection(servers);
    
    // Set up data channel for transcript sharing
    const dataChannel = pc.createDataChannel('transcripts', {
      ordered: true,
    });
    
    dataChannel.onopen = () => {
      console.log('Data channel opened');
    };
    
    dataChannel.onclose = () => {
      console.log('Data channel closed');
    };
    
    dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'transcript') {
          setRemoteTranscript(data.text);
        }
      } catch (err) {
        console.error('Error parsing data channel message:', err);
      }
    };
    
    dataChannelRef.current = dataChannel;
    
    pc.ondatachannel = (event) => {
      const receiveChannel = event.channel;
      receiveChannel.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'transcript') {
            setRemoteTranscript(data.text);
          }
        } catch (err) {
          console.error('Error parsing data channel message:', err);
        }
      };
    };
    
    pc.ontrack = event => {
      const remote = new MediaStream();
      event.streams[0].getTracks().forEach(track => remote.addTrack(track));
      setRemoteStream(prev => {
        prev?.getTracks().forEach(t => remote.addTrack(t));
        return remote;
      });
    };
    
    return pc;
  };

  // Initialize speech recognition
  const initSpeechRecognition = () => {
    // Check if browser supports SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported in this browser');
      return null;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US'; // Set language
    
    recognition.onresult = (event: any) => {
      let currentTranscript = '';
      
      // Get all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          currentTranscript += transcript + ' ';
        }
      }
      
      if (currentTranscript) {
        const newTranscript = localTranscript + currentTranscript;
        setLocalTranscript(newTranscript);
        
        // Send transcript to remote peer
        if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
          dataChannelRef.current.send(JSON.stringify({
            type: 'transcript',
            text: newTranscript
          }));
        }
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };
    
    return recognition;
  };

  // Toggle speech recognition
  const toggleListening = () => {
    if (isListening) {
      // Stop listening
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
    } else {
      // Start listening
      if (!recognitionRef.current) {
        recognitionRef.current = initSpeechRecognition();
      }
      
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
      }
    }
  };

  // Clear transcripts
  const clearTranscripts = () => {
    setLocalTranscript('');
    
    // Send empty transcript to remote peer
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify({
        type: 'transcript',
        text: ''
      }));
    }
  };

  // Initialize peer connection on mount
  useEffect(() => {
    pcRef.current = setupPeerConnection();
    return () => {
      localStream?.getTracks().forEach(t => t.stop());
      pcRef.current?.close();
      unsubOffer.current?.();
      unsubAnswer.current?.();
      
      // Cleanup speech recognition
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Update video element sources
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Start webcam
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      setRemoteStream(new MediaStream());
      stream.getTracks().forEach(track => pcRef.current?.addTrack(track, stream));
      setButtons({ cam: true, call: false, answer: false, hangup: true });
    } catch (err) {
      console.error('getUserMedia failed:', err);
    }
  };

  // Create call (offer)
  const createCall = async () => {
    const pc = pcRef.current!;
    const callDocRef = doc(collection(db, 'calls'));
    const offerCandidates = collection(callDocRef, 'offerCandidates');
    const answerCandidates = collection(callDocRef, 'answerCandidates');

    setCallId(callDocRef.id);

    pc.onicecandidate = e => {
      if (e.candidate) addDoc(offerCandidates, e.candidate.toJSON());
    };

    const offerDesc = await pc.createOffer();
    await pc.setLocalDescription(offerDesc);
    await setDoc(callDocRef, { offer: { type: offerDesc.type, sdp: offerDesc.sdp } }, { merge: true });

    unsubOffer.current = onSnapshot(callDocRef, snap => {
      const data = snap.data();
      if (data?.answer && !pc.currentRemoteDescription) {
        pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    unsubAnswer.current = onSnapshot(answerCandidates, snap => {
      snap.docChanges().forEach(c => {
        if (c.type === 'added') pc.addIceCandidate(new RTCIceCandidate(c.doc.data()));
      });
    });

    setButtons(b => ({ ...b, hangup: false }));
  };

  // Answer call
  const answerCall = async () => {
    const pc = pcRef.current!;
    const callDocRef = doc(db, 'calls', callId);
    const answerCandidates = collection(callDocRef, 'answerCandidates');
    const offerCandidates = collection(callDocRef, 'offerCandidates');

    pc.onicecandidate = e => {
      if (e.candidate) addDoc(answerCandidates, e.candidate.toJSON());
    };

    const snap = await getDoc(callDocRef);
    const data = snap.data();
    if (!data?.offer) {
      console.error('No offer in call');
      return;
    }

    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answerDesc = await pc.createAnswer();
    await pc.setLocalDescription(answerDesc);
    await setDoc(callDocRef, { answer: { type: answerDesc.type, sdp: answerDesc.sdp } }, { merge: true });

    unsubOffer.current = onSnapshot(offerCandidates, snap2 => {
      snap2.docChanges().forEach(c => {
        if (c.type === 'added') pc.addIceCandidate(new RTCIceCandidate(c.doc.data()));
      });
    });

    setButtons(b => ({ ...b, hangup: false }));
  };

  // Hangup
  const hangupCall = () => {
    pcRef.current?.close();
    unsubOffer.current?.();
    unsubAnswer.current?.();

    localStream?.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setCallId('');
    setLocalTranscript('');
    setRemoteTranscript('');

    // Stop speech recognition if active
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    dataChannelRef.current = null;
    pcRef.current = setupPeerConnection();
    setButtons({ cam: false, call: true, answer: true, hangup: true });
  };

  return (
    <div className="p-6 bg-gradient-to-br from-black to-purple-900 min-h-screen text-purple-100">
      <h1 className="text-4xl mb-6 font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-200">Video Call</h1>
      <div className="space-y-8">
        {/* Webcam */}
        <section className="bg-black/40 p-6 rounded-xl backdrop-blur-sm border border-purple-800/30">
          <h2 className="text-xl font-semibold mb-4 text-purple-300">1. Webcam</h2>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="w-full md:w-1/2 flex flex-col gap-3">
              <div className="relative">
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full bg-black rounded-lg border border-purple-700/50 aspect-video" 
                />
                <div className="absolute bottom-2 left-2 bg-purple-900/70 px-2 py-1 rounded text-xs">You</div>
              </div>
              <div className="bg-black/60 p-3 rounded-lg border border-purple-700/50 h-28 overflow-y-auto">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-purple-300">Your Speech</h3>
                  <div className="flex gap-1">
                    <button 
                      onClick={toggleListening}
                      className={`px-3 py-1 rounded text-xs font-medium ${
                        isListening 
                          ? 'bg-red-600 hover:bg-red-700' 
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {isListening ? 'Stop' : 'Start'}
                    </button>
                    <button 
                      onClick={clearTranscripts}
                      className="px-3 py-1 bg-purple-700 rounded text-xs hover:bg-purple-600 font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-purple-100 text-xs">
                  {localTranscript || 'Your speech will appear here...'}
                </p>
              </div>
            </div>
            <div className="w-full md:w-1/2 flex flex-col gap-3">
              <div className="relative">
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full bg-black rounded-lg border border-purple-700/50 aspect-video" 
                />
                <div className="absolute bottom-2 left-2 bg-purple-900/70 px-2 py-1 rounded text-xs">Remote</div>
              </div>
              <div className="bg-black/60 p-3 rounded-lg border border-purple-700/50 h-28 overflow-y-auto">
                <h3 className="text-sm font-medium text-purple-300 mb-2">Remote Speech</h3>
                <p className="whitespace-pre-wrap text-purple-100 text-xs">
                  {remoteTranscript || 'Remote speech will appear here...'}
                </p>
              </div>
            </div>
          </div>
          <button 
            onClick={startWebcam} 
            disabled={buttons.cam} 
            className="px-6 py-2 bg-gradient-to-r from-purple-800 to-purple-600 rounded-lg hover:from-purple-700 hover:to-purple-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Start Webcam
          </button>
        </section>

        {/* Create Call */}
        <section className="bg-black/40 p-6 rounded-xl backdrop-blur-sm border border-purple-800/30">
          <h2 className="text-xl font-semibold mb-4 text-purple-300">2. Create Call</h2>
          <button 
            onClick={createCall} 
            disabled={buttons.call} 
            className="px-6 py-2 bg-gradient-to-r from-purple-800 to-purple-600 rounded-lg hover:from-purple-700 hover:to-purple-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Create Offer
          </button>
          {callId && (
            <div className="mt-4">
              <p className="text-sm text-purple-300 mb-1">Share this call ID:</p>
              <div className="flex">
                <input 
                  readOnly 
                  value={callId} 
                  className="bg-black/60 border border-purple-700 p-2 rounded-l-lg text-purple-100 flex-grow" 
                />
                <button 
                  onClick={() => navigator.clipboard.writeText(callId)}
                  className="px-3 bg-purple-700 rounded-r-lg hover:bg-purple-600 transition-colors"
                  title="Copy to clipboard"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Answer Call */}
        <section className="bg-black/40 p-6 rounded-xl backdrop-blur-sm border border-purple-800/30">
          <h2 className="text-xl font-semibold mb-4 text-purple-300">3. Answer Call</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={callId}
              onChange={e => setCallId(e.target.value)}
              placeholder="Enter call ID"
              className="bg-black/60 border border-purple-700 p-2 rounded-lg text-purple-100 flex-grow"
            />
            <button 
              onClick={answerCall} 
              disabled={buttons.answer} 
              className="px-6 py-2 bg-gradient-to-r from-purple-800 to-purple-600 rounded-lg hover:from-purple-700 hover:to-purple-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Answer
            </button>
          </div>
        </section>



        {/* Hangup */}
        <section className="bg-black/40 p-6 rounded-xl backdrop-blur-sm border border-purple-800/30">
          <h2 className="text-xl font-semibold mb-4 text-purple-300">5. Hangup</h2>
          <button 
            onClick={hangupCall} 
            disabled={buttons.hangup} 
            className="px-6 py-2 bg-gradient-to-r from-red-700 to-purple-700 rounded-lg hover:from-red-600 hover:to-purple-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Hangup
          </button>
        </section>
      </div>
    </div>
  );
}