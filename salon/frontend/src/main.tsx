import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            retry: 1,
        },
    },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
    // Note: StrictMode disabled temporarily to debug ElevenLabs disconnect issue
    // StrictMode causes double mount/unmount in dev which can disconnect WebRTC
    // <React.StrictMode>
    <QueryClientProvider client={queryClient}>
        <App />
        <Toaster position="top-right" />
    </QueryClientProvider>
    // </React.StrictMode>,
)
