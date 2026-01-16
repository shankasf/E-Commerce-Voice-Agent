2/**
 * ElevenLabs Voice Widget - Simple Implementation
 * Based on: https://elevenlabs.io/docs/agents-platform/libraries/react
 */

import { useState, useCallback } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Mic, MicOff, Phone, PhoneOff, X, Loader2 } from 'lucide-react';

// Get signed URL from backend for private agent
async function getSignedUrl(): Promise<string> {
    const response = await fetch('/api/voice/signed-url');
    if (!response.ok) {
        let errorMessage = 'Failed to get signed URL';
        try {
            const text = await response.text();
            if (text) {
                const error = JSON.parse(text);
                errorMessage = error.detail || error.message || errorMessage;
            }
        } catch {
            // Response was not valid JSON, use default error message
        }
        throw new Error(errorMessage);
    }
    const data = await response.json();
    return data.signedUrl;
}

export function VoiceWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const conversation = useConversation({
        onConnect: () => {
            console.log('Connected to ElevenLabs');
            setError(null);
        },
        onDisconnect: () => {
            console.log('Disconnected from ElevenLabs');
        },
        onError: (error) => {
            console.error('ElevenLabs error:', error);
            setError(typeof error === 'string' ? error : 'Connection error');
        },
        onMessage: (message) => {
            console.log('Message:', message);
        },
    });

    const startConversation = useCallback(async () => {
        try {
            setError(null);

            // Request microphone permission
            await navigator.mediaDevices.getUserMedia({ audio: true });

            // Get signed URL from backend and start session
            const signedUrl = await getSignedUrl();
            await conversation.startSession({ signedUrl });
        } catch (err) {
            console.error('Failed to start conversation:', err);
            setError(err instanceof Error ? err.message : 'Failed to start');
        }
    }, [conversation]);

    const stopConversation = useCallback(async () => {
        await conversation.endSession();
    }, [conversation]);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-pink-500 shadow-2xl flex items-center justify-center hover:bg-pink-600 transition-colors"
            >
                <Mic className="w-7 h-7 text-white" />
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 w-80 bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-pink-500 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-400 rounded-xl flex items-center justify-center">
                        <Mic className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <div className="font-semibold text-white">Voice Assistant</div>
                        <div className="text-xs text-pink-100">
                            {conversation.status === 'connected'
                                ? (conversation.isSpeaking ? 'Speaking...' : 'Listening...')
                                : conversation.status}
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-pink-100 hover:text-white p-1"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Body */}
            <div className="p-6">
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                        {error}
                    </div>
                )}

                <div className="flex flex-col items-center">
                    {conversation.status === 'disconnected' && (
                        <>
                            <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mb-4">
                                <Mic className="w-10 h-10 text-pink-500" />
                            </div>
                            <p className="text-gray-600 text-center mb-4">
                                Click to start a voice conversation
                            </p>
                            <button
                                onClick={startConversation}
                                className="w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors"
                            >
                                <Phone className="w-6 h-6 text-white" />
                            </button>
                        </>
                    )}

                    {conversation.status === 'connecting' && (
                        <>
                            <div className="w-20 h-20 bg-pink-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
                                <Loader2 className="w-10 h-10 text-white animate-spin" />
                            </div>
                            <p className="text-gray-600">Connecting...</p>
                        </>
                    )}

                    {conversation.status === 'connected' && (
                        <>
                            <div className={`w-20 h-20 bg-pink-500 rounded-full flex items-center justify-center mb-4 ${conversation.isSpeaking ? 'animate-pulse' : ''}`}>
                                {conversation.isSpeaking ? (
                                    <Mic className="w-10 h-10 text-white" />
                                ) : (
                                    <MicOff className="w-10 h-10 text-white" />
                                )}
                            </div>
                            <p className="text-gray-600 mb-4">
                                {conversation.isSpeaking ? 'Agent is speaking...' : 'Listening...'}
                            </p>
                            <button
                                onClick={stopConversation}
                                className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                            >
                                <PhoneOff className="w-6 h-6 text-white" />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default VoiceWidget;
