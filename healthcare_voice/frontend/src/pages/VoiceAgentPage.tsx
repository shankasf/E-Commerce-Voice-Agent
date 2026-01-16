import { useState, useRef, useEffect, useCallback } from 'react'
import {
  MicrophoneIcon,
  StopIcon,
  PhoneIcon,
  PhoneXMarkIcon,
} from '@heroicons/react/24/solid'

interface TranscriptMessage {
  role: 'user' | 'assistant'
  text: string
  timestamp: Date
}

interface FunctionCall {
  name: string
  arguments: any
  result?: any
}

export default function VoiceAgentPage() {
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([])
  const [functionCalls, setFunctionCalls] = useState<FunctionCall[]>([])
  const [currentText, setCurrentText] = useState('')
  const [status, setStatus] = useState<string>('Click to start conversation')

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  const connect = useCallback(async () => {
    try {
      setStatus('Connecting...')

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      // Create audio context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 })

      // Connect to WebSocket
      const wsUrl = import.meta.env.VITE_AI_SERVICE_WS_URL || 'ws://localhost:8084'
      const ws = new WebSocket(`${wsUrl}/voice/ws`)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        setStatus('Connecting to AI...')
        // Don't start recording yet - wait for 'ready' message from backend
      }

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data)
        handleWebSocketMessage(data)
      }

      ws.onclose = () => {
        setIsConnected(false)
        setIsRecording(false)
        setStatus('Disconnected')
        stopRecording()
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setStatus('Connection error')
      }
    } catch (error) {
      console.error('Failed to connect:', error)
      setStatus('Failed to access microphone')
    }
  }, [])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    stopRecording()
    setIsConnected(false)
    setStatus('Click to start conversation')
  }, [])

  const startRecording = useCallback(() => {
    if (!audioContextRef.current || !mediaStreamRef.current) return

    const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current)
    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1)
    processorRef.current = processor

    processor.onaudioprocess = (e) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

      const inputData = e.inputBuffer.getChannelData(0)
      const pcm16 = floatTo16BitPCM(inputData)
      const base64 = arrayBufferToBase64(pcm16.buffer as ArrayBuffer)

      wsRef.current.send(
        JSON.stringify({
          type: 'audio',
          audio: base64,
        })
      )
    }

    source.connect(processor)
    processor.connect(audioContextRef.current.destination)
    setIsRecording(true)
  }, [])

  const stopRecording = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    setIsRecording(false)
  }, [])

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'ready':
        // Backend session is ready - now start recording and receiving audio
        setStatus('Connected - Speak now')
        startRecording()
        break

      case 'audio':
        playAudio(data.audio)
        break

      case 'transcript':
        if (data.role === 'assistant') {
          setCurrentText((prev) => prev + data.text)
        }
        break

      case 'transcript_done':
        if (data.text) {
          setTranscript((prev) => [
            ...prev,
            {
              role: data.role,
              text: data.text,
              timestamp: new Date(),
            },
          ])
        }
        if (data.role === 'assistant') {
          setCurrentText('')
        }
        break

      case 'function_call':
        setFunctionCalls((prev) => [
          ...prev,
          { name: data.name, arguments: data.arguments },
        ])
        break

      case 'function_result':
        setFunctionCalls((prev) =>
          prev.map((fc) =>
            fc.name === data.name && !fc.result
              ? { ...fc, result: data.result }
              : fc
          )
        )
        break

      case 'error':
        console.error('Voice agent error:', data.error)
        setStatus(`Error: ${data.error}`)
        break
    }
  }

  const playAudio = async (base64Audio: string) => {
    if (!audioContextRef.current) return

    try {
      const audioData = base64ToArrayBuffer(base64Audio)
      const pcm16 = new Int16Array(audioData)
      const float32 = new Float32Array(pcm16.length)

      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768
      }

      const audioBuffer = audioContextRef.current.createBuffer(
        1,
        float32.length,
        24000
      )
      audioBuffer.copyToChannel(float32, 0)

      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContextRef.current.destination)
      source.start()
    } catch (error) {
      console.error('Error playing audio:', error)
    }
  }

  // Utility functions
  const floatTo16BitPCM = (float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length)
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]))
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return int16Array
  }

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Voice Agent</h1>
        <p className="text-gray-500">Talk to our AI assistant for appointments and inquiries</p>
      </div>

      {/* Voice Control */}
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
        <div className="flex flex-col items-center">
          {/* Status */}
          <p className="text-sm text-gray-500 mb-6">{status}</p>

          {/* Main Button */}
          <button
            onClick={isConnected ? disconnect : connect}
            className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all ${
              isConnected
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-primary-500 hover:bg-primary-600'
            } text-white shadow-lg`}
          >
            {isRecording && (
              <>
                <span className="pulse-ring bg-white/20"></span>
                <span className="pulse-ring bg-white/20" style={{ animationDelay: '0.5s' }}></span>
              </>
            )}
            {isConnected ? (
              <PhoneXMarkIcon className="w-12 h-12" />
            ) : (
              <PhoneIcon className="w-12 h-12" />
            )}
          </button>

          <p className="mt-4 text-sm font-medium text-gray-700">
            {isConnected ? 'Click to end call' : 'Click to start call'}
          </p>

          {/* Voice Wave */}
          {isRecording && (
            <div className={`voice-wave mt-6 text-primary-500 ${isRecording ? 'active' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}
        </div>
      </div>

      {/* Transcript */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Conversation</h2>
        </div>
        <div className="h-96 overflow-y-auto p-6 space-y-4">
          {transcript.length === 0 && !currentText ? (
            <div className="text-center text-gray-400 py-12">
              <MicrophoneIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Start a conversation to see the transcript</p>
            </div>
          ) : (
            <>
              {transcript.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-primary-500 text-white rounded-br-none'
                        : 'bg-gray-100 text-gray-900 rounded-bl-none'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.role === 'user' ? 'text-primary-100' : 'text-gray-400'
                      }`}
                    >
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
              {currentText && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gray-100 text-gray-900 rounded-bl-none">
                    <p>{currentText}</p>
                    <div className="flex space-x-1 mt-2">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.1s' }}
                      ></span>
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      ></span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={transcriptEndRef} />
        </div>
      </div>

      {/* Function Calls (Debug) */}
      {functionCalls.length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Agent Actions</h3>
          <div className="space-y-2">
            {functionCalls.slice(-5).map((fc, idx) => (
              <div key={idx} className="bg-white rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-primary-600">{fc.name}</span>
                  {fc.result && (
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        fc.result.success || fc.result.found
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {fc.result.success || fc.result.found ? 'Success' : 'Pending'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
