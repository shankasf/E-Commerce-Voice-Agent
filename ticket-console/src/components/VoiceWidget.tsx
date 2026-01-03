/**
 * WebRTC Voice Widget Component
 * 
 * A floating voice button that enables WebRTC-based voice communication.
 * Uses OpenAI Realtime API via backend proxy.
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Phone, PhoneOff, X, Volume2, VolumeX, Loader2 } from 'lucide-react';

type CallState = 'idle' | 'connecting' | 'connected' | 'disconnecting' | 'error';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface VoiceWidgetProps {
    apiEndpoint?: string;
    agentName?: string;
    primaryColor?: string;
    maxDuration?: number; // in seconds
}

export function VoiceWidget({
    apiEndpoint = '/api/voice/webrtc',
    agentName = 'U Rack IT Support',
    primaryColor = '#6366f1',
    maxDuration = 300,
}: VoiceWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [callState, setCallState] = useState<CallState>('idle');
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);

    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);
    const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        return () => {
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
            }
            // Cleanup refs directly instead of calling hangup
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }
        };
    }, []);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
        setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role,
            content,
            timestamp: new Date(),
        }]);
    }, []);

    const handleDataChannelMessage = useCallback((event: MessageEvent) => {
        try {
            const data = JSON.parse(event.data);
            console.log('Data channel event:', data.type);

            if (data.type === 'response.audio_transcript.done' && data.transcript) {
                addMessage('assistant', data.transcript);
            }
            if (data.type === 'conversation.item.input_audio_transcription.completed' && data.transcript) {
                addMessage('user', data.transcript);
            }
        } catch (err) {
            console.error('Failed to parse data channel message:', err);
        }
    }, [addMessage]);

    const startCall = async () => {
        setCallState('connecting');
        setError(null);
        setMessages([]);
        setDuration(0);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            });
            localStreamRef.current = stream;

            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                ],
            });
            peerConnectionRef.current = pc;

            stream.getAudioTracks().forEach(track => {
                pc.addTrack(track, stream);
            });

            pc.ontrack = (event) => {
                console.log('Received remote track:', event.track.kind);
                if (remoteAudioRef.current && event.streams[0]) {
                    remoteAudioRef.current.srcObject = event.streams[0];
                    remoteAudioRef.current.play().catch(console.error);
                }
            };

            pc.onconnectionstatechange = () => {
                const state = pc.connectionState;
                console.log('Connection state:', state);
                if (state === 'failed' || state === 'disconnected' || state === 'closed') {
                    hangup();
                }
            };

            const dataChannel = pc.createDataChannel('oai-events');
            dataChannelRef.current = dataChannel;
            dataChannel.onopen = () => console.log('Data channel opened');
            dataChannel.onmessage = handleDataChannelMessage;

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const response = await fetch(`${apiEndpoint}/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sdp: offer.sdp,
                    provider: 'openai',
                }),
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Failed to connect: ${errText}`);
            }

            const { sdp: answerSdp, sessionId } = await response.json();
            sessionIdRef.current = sessionId;

            await pc.setRemoteDescription({
                type: 'answer',
                sdp: answerSdp,
            });

            setCallState('connected');

            durationIntervalRef.current = setInterval(() => {
                setDuration(d => {
                    const newDuration = d + 1;
                    if (newDuration >= maxDuration) {
                        hangup();
                        setError(`Maximum call duration (${Math.floor(maxDuration / 60)} min) reached`);
                    }
                    return newDuration;
                });
            }, 1000);

            console.log('WebRTC connected successfully');

        } catch (err) {
            console.error('Failed to start call:', err);
            setError(err instanceof Error ? err.message : 'Failed to connect');
            setCallState('error');
            hangup();
        }
    };

    const hangup = async () => {
        setCallState('disconnecting');

        if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }

        if (sessionIdRef.current) {
            try {
                await fetch(`${apiEndpoint}/disconnect`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ sessionId: sessionIdRef.current }),
                });
            } catch (err) {
                console.error('Failed to close session:', err);
            }
            sessionIdRef.current = null;
        }

        setCallState('idle');
        setIsMuted(false);
    };

    const toggleMute = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = isMuted;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleSpeaker = () => {
        if (remoteAudioRef.current) {
            remoteAudioRef.current.muted = isSpeakerOn;
            setIsSpeakerOn(!isSpeakerOn);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 group"
                style={{ backgroundColor: primaryColor }}
            >
                <Mic className="w-7 h-7 text-white" />
                <span className="absolute -top-8 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Voice Chat
                </span>
                <audio ref={remoteAudioRef} autoPlay />
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
            {/* Panel */}
            <div className="w-80 bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-4 bg-gray-800 flex justify-between items-center border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <Mic className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="font-semibold text-white">{agentName}</div>
                            <div className="text-xs text-gray-400">Voice Assistant</div>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-gray-400 hover:text-white p-1"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4">
                    {callState === 'idle' && (
                        <div className="text-center py-6">
                            <div
                                className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: `${primaryColor}33` }}
                            >
                                <Mic className="w-10 h-10" style={{ color: primaryColor }} />
                            </div>
                            <div className="text-lg font-semibold text-white mb-1">Start Voice Chat</div>
                            <div className="text-sm text-gray-400 mb-4">Click the button below to begin</div>
                            <button
                                onClick={startCall}
                                className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center mx-auto transition-colors"
                            >
                                <Phone className="w-6 h-6 text-white" />
                            </button>
                        </div>
                    )}

                    {callState === 'connecting' && (
                        <div className="text-center py-6">
                            <div
                                className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center animate-pulse"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <Loader2 className="w-10 h-10 text-white animate-spin" />
                            </div>
                            <div className="text-lg font-semibold text-white">Connecting...</div>
                            <div className="text-sm text-gray-400">Please wait</div>
                        </div>
                    )}

                    {callState === 'connected' && (
                        <>
                            <div className="text-center mb-4">
                                <div
                                    className="w-20 h-20 mx-auto mb-2 rounded-full flex items-center justify-center animate-pulse"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <Mic className="w-10 h-10 text-white" />
                                </div>
                                <div className="text-2xl font-bold" style={{ color: primaryColor }}>
                                    {formatDuration(duration)}
                                </div>
                                <div className="text-sm text-gray-400">Call in progress</div>
                            </div>

                            {messages.length > 0 && (
                                <div className="max-h-40 overflow-y-auto bg-gray-800 rounded-lg p-2 mb-4 space-y-2">
                                    {messages.map(m => (
                                        <div
                                            key={m.id}
                                            className={`text-sm p-2 rounded-lg ${m.role === 'user'
                                                    ? 'bg-gray-700 ml-4'
                                                    : 'mr-4'
                                                }`}
                                            style={{
                                                backgroundColor: m.role === 'assistant' ? `${primaryColor}33` : undefined,
                                            }}
                                        >
                                            {m.content}
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}

                            <div className="flex justify-center gap-3">
                                <button
                                    onClick={toggleMute}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
                                        }`}
                                >
                                    {isMuted ? (
                                        <MicOff className="w-5 h-5 text-white" />
                                    ) : (
                                        <Mic className="w-5 h-5 text-white" />
                                    )}
                                </button>
                                <button
                                    onClick={hangup}
                                    className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
                                >
                                    <PhoneOff className="w-5 h-5 text-white" />
                                </button>
                                <button
                                    onClick={toggleSpeaker}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${!isSpeakerOn ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
                                        }`}
                                >
                                    {isSpeakerOn ? (
                                        <Volume2 className="w-5 h-5 text-white" />
                                    ) : (
                                        <VolumeX className="w-5 h-5 text-white" />
                                    )}
                                </button>
                            </div>
                        </>
                    )}

                    {callState === 'error' && (
                        <div className="text-center py-6">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500 flex items-center justify-center">
                                <X className="w-10 h-10 text-white" />
                            </div>
                            <div className="text-lg font-semibold text-white mb-1">Connection Error</div>
                            <div className="text-sm text-red-400 mb-4">{error || 'Failed to connect'}</div>
                            <button
                                onClick={startCall}
                                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Floating button */}
            <button
                onClick={() => {
                    if (callState === 'connected') {
                        setIsOpen(true);
                    } else {
                        setIsOpen(false);
                    }
                }}
                className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${callState === 'connected' ? 'animate-pulse' : ''
                    }`}
                style={{ backgroundColor: callState === 'connected' ? '#ef4444' : primaryColor }}
            >
                {callState === 'connected' ? (
                    <Phone className="w-7 h-7 text-white" />
                ) : (
                    <Mic className="w-7 h-7 text-white" />
                )}
            </button>

            <audio ref={remoteAudioRef} autoPlay className="hidden" />
        </div>
    );
}
