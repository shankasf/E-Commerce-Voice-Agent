import { useState, useRef, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import {
  PhoneIcon,
  PhoneXMarkIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  HomeIcon,
  CalendarIcon,
  UsersIcon,
  UserGroupIcon,
  MicrophoneIcon,
  Bars3Icon,
} from '@heroicons/react/24/solid'
import { PhoneIcon as PhoneOutline } from '@heroicons/react/24/outline'
import DashboardPage from './pages/DashboardPage'
import AppointmentsPage from './pages/AppointmentsPage'
import PatientsPage from './pages/PatientsPage'
import ProvidersPage from './pages/ProvidersPage'
import CallsPage from './pages/CallsPage'

interface TranscriptMessage {
  role: 'user' | 'assistant'
  text: string
  timestamp: Date
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Appointments', href: '/appointments', icon: CalendarIcon },
  { name: 'Patients', href: '/patients', icon: UsersIcon },
  { name: 'Providers', href: '/providers', icon: UserGroupIcon },
  { name: 'Call Logs', href: '/calls', icon: PhoneOutline },
]

function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-900/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
            <div className="flex items-center justify-between h-16 px-4 border-b">
              <span className="text-xl font-bold text-primary-600">Healthcare Voice</span>
              <button onClick={() => setSidebarOpen(false)}>
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-2 rounded-lg ${
                    location.pathname === item.href
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r">
          <div className="flex items-center h-16 px-6 border-b">
            <span className="text-xl font-bold text-primary-600">Healthcare Voice</span>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-4 py-2 rounded-lg transition ${
                  location.pathname === item.href
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-700 font-medium">AD</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">Admin User</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <div className="sticky top-0 z-10 flex items-center h-16 px-4 bg-white border-b lg:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Bars3Icon className="w-6 h-6" />
          </button>
          <span className="ml-4 text-lg font-semibold text-primary-600">Healthcare Voice</span>
        </div>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}

function VoiceWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([])
  const [currentText, setCurrentText] = useState('')
  const [status, setStatus] = useState<string>('Click to start')

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const playbackContextRef = useRef<AudioContext | null>(null)
  const audioQueueRef = useRef<Float32Array[]>([])
  const isPlayingRef = useRef(false)
  const nextPlayTimeRef = useRef(0)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript, currentText])

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

  const playAudio = async (base64Audio: string) => {
    if (!playbackContextRef.current) {
      playbackContextRef.current = new AudioContext({ sampleRate: 24000 })
    }
    try {
      const ctx = playbackContextRef.current
      const audioData = base64ToArrayBuffer(base64Audio)
      const pcm16 = new Int16Array(audioData)
      const float32 = new Float32Array(pcm16.length)
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000)
      audioBuffer.copyToChannel(float32, 0)

      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(ctx.destination)

      // Schedule audio to play in sequence, not overlapping
      const currentTime = ctx.currentTime
      const startTime = Math.max(currentTime, nextPlayTimeRef.current)
      source.start(startTime)
      nextPlayTimeRef.current = startTime + audioBuffer.duration
    } catch (error) {
      console.error('Error playing audio:', error)
    }
  }

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
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
          setTranscript((prev) => [...prev, { role: data.role, text: data.text, timestamp: new Date() }])
        }
        if (data.role === 'assistant') {
          setCurrentText('')
        }
        break
      case 'response_done':
        // Reset audio queue timing for next response
        nextPlayTimeRef.current = 0
        break
      case 'error':
        console.error('Voice agent error:', data.error)
        setStatus(`Error: ${data.error}`)
        break
    }
  }

  const downsampleTo24k = (inputData: Float32Array, inputSampleRate: number): Float32Array => {
    if (inputSampleRate === 24000) return inputData
    const ratio = inputSampleRate / 24000
    const outputLength = Math.floor(inputData.length / ratio)
    const output = new Float32Array(outputLength)
    for (let i = 0; i < outputLength; i++) {
      output[i] = inputData[Math.floor(i * ratio)]
    }
    return output
  }

  const startRecording = useCallback(() => {
    if (!audioContextRef.current || !mediaStreamRef.current) return
    const ctx = audioContextRef.current
    const source = ctx.createMediaStreamSource(mediaStreamRef.current)
    const processor = ctx.createScriptProcessor(4096, 1, 1)
    processorRef.current = processor

    console.log('Audio context sample rate:', ctx.sampleRate)

    processor.onaudioprocess = (e) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
      const inputData = e.inputBuffer.getChannelData(0)
      // Resample to 24kHz if needed
      const resampledData = downsampleTo24k(inputData, ctx.sampleRate)
      const pcm16 = floatTo16BitPCM(resampledData)
      const base64 = arrayBufferToBase64(pcm16.buffer as ArrayBuffer)
      wsRef.current.send(JSON.stringify({ type: 'audio', audio: base64 }))
    }

    source.connect(processor)
    // Connect to a silent gain node connected to destination to ensure onaudioprocess fires
    const silentGain = ctx.createGain()
    silentGain.gain.value = 0
    processor.connect(silentGain)
    silentGain.connect(ctx.destination)
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
    if (playbackContextRef.current) {
      playbackContextRef.current.close()
      playbackContextRef.current = null
    }
    // Reset audio timing
    nextPlayTimeRef.current = 0
    audioQueueRef.current = []
    setIsRecording(false)
  }, [])

  const connect = useCallback(async () => {
    try {
      setStatus('Connecting...')

      // Request microphone with echo cancellation and noise suppression
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      })
      mediaStreamRef.current = stream
      // Let AudioContext use native sample rate, we'll resample to 24kHz
      audioContextRef.current = new AudioContext()

      const wsUrl = 'wss://healthcare.callsphere.tech/ai'
      const ws = new WebSocket(`${wsUrl}/voice/ws`)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        setStatus('Connected - Speak now')
        startRecording()
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
  }, [startRecording, stopRecording])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    stopRecording()
    setIsConnected(false)
    setStatus('Click to start')
  }, [stopRecording])

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 z-50"
        >
          <MicrophoneIcon className="w-8 h-8" />
        </button>
      )}

      {/* Widget Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-gray-200">
          {/* Header */}
          <div className="bg-primary-500 text-white px-4 py-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Healthcare Assistant</h3>
              <p className="text-xs text-primary-100">{status}</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-primary-600 rounded">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Transcript */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {transcript.length === 0 && !currentText ? (
              <div className="text-center text-gray-400 py-8">
                <MicrophoneIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Click the button below to start talking</p>
              </div>
            ) : (
              <>
                {transcript.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        msg.role === 'user'
                          ? 'bg-primary-500 text-white rounded-br-none'
                          : 'bg-white text-gray-900 rounded-bl-none shadow'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {currentText && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl px-3 py-2 text-sm bg-white text-gray-900 rounded-bl-none shadow">
                      {currentText}
                      <span className="inline-block w-1 h-4 bg-gray-400 animate-pulse ml-1"></span>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* Call Button */}
          <div className="p-4 bg-white border-t border-gray-100 flex justify-center">
            <button
              onClick={isConnected ? disconnect : connect}
              className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isConnected ? 'bg-red-500 hover:bg-red-600' : 'bg-primary-500 hover:bg-primary-600'
              } text-white shadow-lg`}
            >
              {isRecording && (
                <span className="absolute w-14 h-14 rounded-full bg-current opacity-20 animate-ping"></span>
              )}
              {isConnected ? <PhoneXMarkIcon className="w-6 h-6" /> : <PhoneIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/providers" element={<ProvidersPage />} />
          <Route path="/calls" element={<CallsPage />} />
        </Routes>
      </Layout>
      <VoiceWidget />
    </BrowserRouter>
  )
}

export default App
