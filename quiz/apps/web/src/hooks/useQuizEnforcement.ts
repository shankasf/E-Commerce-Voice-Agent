import { useCallback, useEffect, useRef } from 'react'
import { EventPayload } from '../lib/api'

interface UseQuizEnforcementOptions {
  enabled: boolean
  onRestart: (reason: string) => void
  onEvent: (event: EventPayload) => void
}

const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function useQuizEnforcement({
  enabled,
  onRestart,
  onEvent
}: UseQuizEnforcementOptions) {
  const isFullscreen = useRef(false)
  const hasStarted = useRef(false)
  const isiOSDevice = isIOS()

  const logEvent = useCallback((eventType: string, payload?: Record<string, unknown>) => {
    onEvent({
      eventType,
      eventAt: new Date().toISOString(),
      payload
    })
  }, [onEvent])

  const triggerRestart = useCallback((reason: string) => {
    logEvent('restart', { reason })
    onRestart(reason)
  }, [logEvent, onRestart])

  // Request fullscreen
  const requestFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen()
      isFullscreen.current = true
      hasStarted.current = true
      logEvent('fullscreen_enter')
      return true
    } catch (error) {
      console.error('Fullscreen request failed:', error)
      return false
    }
  }, [logEvent])

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    }
    isFullscreen.current = false
  }, [])

  useEffect(() => {
    if (!enabled) return

    // Fullscreen change handler (skip for iOS as it doesn't support Fullscreen API)
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && hasStarted.current && !isiOSDevice) {
        isFullscreen.current = false
        logEvent('fullscreen_exit')
        triggerRestart('fullscreen_exit')
      }
    }

    // Visibility change handler (tab switch)
    const handleVisibilityChange = () => {
      if (document.hidden && hasStarted.current) {
        logEvent('tab_hidden')
        triggerRestart('tab_switch')
      }
    }

    // Window blur handler
    const handleBlur = () => {
      if (hasStarted.current) {
        logEvent('window_blur')
        triggerRestart('window_blur')
      }
    }

    // Clipboard handlers
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      logEvent('copy_attempt')
    }

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault()
      logEvent('paste_attempt')
    }

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault()
      logEvent('cut_attempt')
    }

    // Context menu handler
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      logEvent('right_click_attempt')
    }

    // Text selection handler
    const handleSelectStart = (e: Event) => {
      e.preventDefault()
      logEvent('select_attempt')
    }

    // Browser back button handler
    const handlePopState = () => {
      if (hasStarted.current) {
        logEvent('nav_back_attempt')
        // Push state back to prevent navigation
        window.history.pushState(null, '', window.location.href)
      }
    }

    // Keyboard shortcuts prevention
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent common shortcuts
      if (
        (e.ctrlKey || e.metaKey) &&
        ['c', 'v', 'x', 'a', 'p', 'f', 'r'].includes(e.key.toLowerCase())
      ) {
        e.preventDefault()
        logEvent('keyboard_shortcut_attempt', { key: e.key })
      }

      // Prevent F5 refresh
      if (e.key === 'F5') {
        e.preventDefault()
        logEvent('refresh_attempt')
      }
    }

    // Add event listeners
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('cut', handleCut)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('selectstart', handleSelectStart)
    window.addEventListener('popstate', handlePopState)
    document.addEventListener('keydown', handleKeyDown)

    // Push initial state for back button handling
    window.history.pushState(null, '', window.location.href)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('cut', handleCut)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('selectstart', handleSelectStart)
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, logEvent, triggerRestart])

  return {
    requestFullscreen,
    exitFullscreen,
    isFullscreen: isFullscreen.current
  }
}
