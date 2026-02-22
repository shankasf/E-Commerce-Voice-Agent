import { useState, useRef, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import {
  PhoneIcon,
  PhoneXMarkIcon,
  XMarkIcon,
  HomeIcon,
  CalendarIcon,
  UsersIcon,
  UserGroupIcon,
  MicrophoneIcon,
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  Bars3Icon,
} from '@heroicons/react/24/solid'
import { PhoneIcon as PhoneOutline } from '@heroicons/react/24/outline'
import DashboardPage from './pages/DashboardPage'
import AppointmentsPage from './pages/AppointmentsPage'
import PatientsPage from './pages/PatientsPage'
import ProvidersPage from './pages/ProvidersPage'
import CallsPage from './pages/CallsPage'
import CallLogDetailPage from './pages/CallLogDetailPage'

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
  { name: 'Conversations', href: '/calls', icon: PhoneOutline },
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
              <span className="text-xl font-bold text-primary-600">Marengo Asia Hospitals</span>
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
                    location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))
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
            <span className="text-xl font-bold text-primary-600">Marengo Asia Hospitals</span>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-4 py-2 rounded-lg transition ${
                  location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <div className="sticky top-0 z-10 flex items-center h-16 px-4 bg-white border-b lg:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Bars3Icon className="w-6 h-6" />
          </button>
          <span className="ml-4 text-lg font-semibold text-primary-600">Marengo Asia Hospitals</span>
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
  const audioQueueRef = useRef<Float32Array[]>([])
  const isPlayingRef = useRef(false)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript, currentText])

  // Convert Float32Array to base64 PCM16
  const float32ToBase64Pcm16 = (float32Array: Float32Array): string => {
    const pcm16 = new Int16Array(float32Array.length)
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]))
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    const bytes = new Uint8Array(pcm16.buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  // Convert base64 PCM16 to Float32Array
  const base64Pcm16ToFloat32 = (base64: string): Float32Array => {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    const pcm16 = new Int16Array(bytes.buffer)
    const float32 = new Float32Array(pcm16.length)
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7fff)
    }
    return float32
  }

  // Play audio from queue
  const playAudioQueue = useCallback(() => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0 || !audioContextRef.current) {
      return
    }

    isPlayingRef.current = true
    const audioData = audioQueueRef.current.shift()!

    const buffer = audioContextRef.current.createBuffer(1, audioData.length, 24000)
    buffer.getChannelData(0).set(audioData)

    const source = audioContextRef.current.createBufferSource()
    source.buffer = buffer
    source.connect(audioContextRef.current.destination)
    source.onended = () => {
      isPlayingRef.current = false
      playAudioQueue()
    }
    source.start()
  }, [])

  const connect = useCallback(async () => {
    try {
      setStatus('Connecting...')
      setTranscript([])
      setCurrentText('')
      audioQueueRef.current = []

      // Get AI service URL
      const aiServiceUrl = import.meta.env.VITE_AI_SERVICE_URL || '/ai'
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsHost = aiServiceUrl.startsWith('http')
        ? aiServiceUrl.replace(/^https?:/, wsProtocol)
        : `${wsProtocol}//${window.location.host}${aiServiceUrl}`

      const wsUrl = `${wsHost}/ws/voice`
      console.log('Connecting to AI service WebSocket:', wsUrl)

      // Create WebSocket connection to AI service
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      // Create audio context
      const audioContext = new AudioContext({ sampleRate: 24000 })
      audioContextRef.current = audioContext

      ws.onopen = async () => {
        console.log('WebSocket connected to AI service')
        setStatus('Requesting microphone...')

        try {
          // Request microphone
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              sampleRate: 24000,
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          })
          mediaStreamRef.current = stream

          // Create audio processing pipeline
          const source = audioContext.createMediaStreamSource(stream)
          const processor = audioContext.createScriptProcessor(4096, 1, 1)
          processorRef.current = processor

          processor.onaudioprocess = (e) => {
            if (ws.readyState === WebSocket.OPEN) {
              const inputData = e.inputBuffer.getChannelData(0)
              const audioBase64 = float32ToBase64Pcm16(inputData)
              ws.send(JSON.stringify({ type: 'audio', audio: audioBase64 }))
            }
          }

          source.connect(processor)
          processor.connect(audioContext.destination)

          // Ensure AudioContext is running (Chrome may start suspended)
          if (audioContext.state === 'suspended') {
            await audioContext.resume()
          }

          // Tell server we're ready to receive audio
          ws.send(JSON.stringify({ type: 'start' }))

          setStatus('Connected - Speak now')
          setIsConnected(true)
          setIsRecording(true)
        } catch (micError) {
          console.error('Microphone error:', micError)
          setStatus('Microphone access denied')
          ws.close()
        }
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          switch (data.type) {
            case 'ready':
              console.log('AI service ready')
              break
            case 'audio':
              // Queue audio for playback
              if (data.audio) {
                const audioData = base64Pcm16ToFloat32(data.audio)
                audioQueueRef.current.push(audioData)
                playAudioQueue()
              }
              break
            case 'interrupt':
              // User started speaking - clear audio queue to stop agent playback
              audioQueueRef.current = []
              isPlayingRef.current = false
              setCurrentText('')
              break
            case 'transcript':
              setCurrentText((prev) => prev + (data.text || ''))
              break
            case 'transcript_done':
              if (data.text) {
                setTranscript((prev) => [...prev, {
                  role: data.role as 'user' | 'assistant',
                  text: data.text,
                  timestamp: new Date()
                }])
              }
              if (data.role === 'assistant') {
                setCurrentText('')
              }
              break
            case 'tool_executed':
              console.log('Tool executed:', data.tool, data.success ? 'success' : 'failed')
              break
            case 'response_done':
              console.log('Response complete')
              break
            case 'error':
              console.error('AI service error:', data.error)
              setStatus(`Error: ${data.error}`)
              break
          }
        } catch (error) {
          console.error('Error parsing message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setStatus('Connection error')
      }

      ws.onclose = () => {
        console.log('WebSocket closed')
        setIsConnected(false)
        setIsRecording(false)
        setStatus('Disconnected')
      }

    } catch (error) {
      console.error('Failed to connect:', error)
      setStatus(`Error: ${error instanceof Error ? error.message : 'Connection failed'}`)
      disconnect()
    }
  }, [playAudioQueue])

  const disconnect = useCallback(() => {
    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    audioQueueRef.current = []
    setIsConnected(false)
    setIsRecording(false)
    setStatus('Click to start')
  }, [])

  return (
    <>
      {/* Floating Button - Bottom Left */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 w-16 h-16 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 z-50"
        >
          <MicrophoneIcon className="w-8 h-8" />
        </button>
      )}

      {/* Widget Panel - Bottom Left */}
      {isOpen && (
        <div className="fixed bottom-6 left-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-gray-200">
          {/* Header */}
          <div className="bg-primary-500 text-white px-4 py-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Marengo Assistant</h3>
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

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<TranscriptMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const connect = useCallback(() => {
    const aiServiceUrl = import.meta.env.VITE_AI_SERVICE_URL || '/ai'
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsHost = aiServiceUrl.startsWith('http')
      ? aiServiceUrl.replace(/^https?:/, wsProtocol)
      : `${wsProtocol}//${window.location.host}${aiServiceUrl}`

    const wsUrl = `${wsHost}/ws/chat`
    console.log('Connecting to chat WebSocket:', wsUrl)

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('Chat WebSocket connected')
      setIsConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        switch (data.type) {
          case 'message':
            if (data.text) {
              setMessages((prev) => [...prev, {
                role: data.role as 'user' | 'assistant',
                text: data.text,
                timestamp: new Date()
              }])
            }
            break
          case 'typing':
            setIsTyping(data.typing)
            break
          case 'tool_executed':
            console.log('Tool executed:', data.tool, data.success ? 'success' : 'failed')
            break
          case 'error':
            setMessages((prev) => [...prev, {
              role: 'assistant',
              text: data.error || 'An error occurred. Please try again.',
              timestamp: new Date()
            }])
            break
        }
      } catch (error) {
        console.error('Error parsing chat message:', error)
      }
    }

    ws.onerror = () => {
      console.error('Chat WebSocket error')
    }

    ws.onclose = () => {
      console.log('Chat WebSocket closed')
      setIsConnected(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
  }, [])

  const handleOpen = useCallback(() => {
    setIsOpen(true)
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setMessages([])
      connect()
    }
  }, [connect])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  const sendMessage = useCallback(() => {
    if (!inputText.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    const text = inputText.trim()
    setMessages((prev) => [...prev, { role: 'user', text, timestamp: new Date() }])
    wsRef.current.send(JSON.stringify({ type: 'message', text }))
    setInputText('')
  }, [inputText])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating Chat Button - Bottom Right */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 w-16 h-16 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 z-50"
        >
          <ChatBubbleLeftRightIcon className="w-8 h-8" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[550px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-gray-200">
          {/* Header */}
          <div className="bg-emerald-500 text-white px-4 py-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Marengo Chat Assistant</h3>
              <p className="text-xs text-emerald-100">
                {isConnected ? 'Online' : 'Connecting...'}
              </p>
            </div>
            <button onClick={handleClose} className="p-1 hover:bg-emerald-600 rounded">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Type a message to start chatting</p>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-emerald-500 text-white rounded-br-none'
                          : 'bg-white text-gray-900 rounded-bl-none shadow'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white text-gray-500 rounded-2xl px-4 py-2 text-sm rounded-bl-none shadow">
                      <span className="inline-flex space-x-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                disabled={!isConnected}
              />
              <button
                onClick={sendMessage}
                disabled={!inputText.trim() || !isConnected}
                className="w-10 h-10 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white rounded-full flex items-center justify-center transition-all"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
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
          <Route path="/calls/:id" element={<CallLogDetailPage />} />
        </Routes>
      </Layout>
      <ChatWidget />
      <VoiceWidget />
    </BrowserRouter>
  )
}

export default App
