/**
 * WebRTC Voice Widget - Universal Voice Chat Component
 * 
 * A floating voice button that enables WebRTC-based voice communication
 * without Twilio. Supports multiple AI backends:
 * - OpenAI Realtime API
 * - Eleven Labs Conversational AI
 * - xAI Grok Voice
 * 
 * Usage:
 *   <script src="/path/to/webrtc-voice-widget.js"></script>
 *   <script>
 *     VoiceWidget.init({
 *       apiEndpoint: '/api/voice/webrtc',
 *       aiProvider: 'openai', // or 'elevenlabs', 'xai'
 *       agentName: 'Assistant'
 *     });
 *   </script>
 */

(function (global) {
    'use strict';

    const VoiceWidget = {
        // Configuration
        config: {
            apiEndpoint: '/api/voice/webrtc',
            aiProvider: 'openai', // 'openai', 'elevenlabs', 'xai'
            agentName: 'AI Assistant',
            primaryColor: '#6366f1',
            position: 'bottom-right',
            maxDuration: 300, // 5 minutes default
        },

        // State
        state: {
            isOpen: false,
            isExpanded: false,
            callState: 'idle', // idle, connecting, connected, disconnecting, error
            isMuted: false,
            isSpeakerOn: true,
            duration: 0,
            messages: [],
            error: null,
        },

        // Refs
        refs: {
            peerConnection: null,
            localStream: null,
            remoteAudio: null,
            dataChannel: null,
            durationInterval: null,
            sessionId: null,
            widget: null,
        },

        // Initialize the widget
        init: function (options = {}) {
            Object.assign(this.config, options);
            this.createWidget();
            this.attachEventListeners();
            console.log('Voice Widget initialized with provider:', this.config.aiProvider);
        },

        // Create the widget DOM
        createWidget: function () {
            const positionStyles = {
                'bottom-right': 'bottom: 24px; right: 24px;',
                'bottom-left': 'bottom: 24px; left: 24px;',
                'top-right': 'top: 24px; right: 24px;',
                'top-left': 'top: 24px; left: 24px;',
            };

            const widget = document.createElement('div');
            widget.id = 'voice-widget-container';
            widget.innerHTML = `
                <style>
                    #voice-widget-container {
                        position: fixed;
                        ${positionStyles[this.config.position] || positionStyles['bottom-right']}
                        z-index: 99999;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    }
                    
                    .voice-widget-button {
                        width: 60px;
                        height: 60px;
                        border-radius: 50%;
                        background: ${this.config.primaryColor};
                        border: none;
                        cursor: pointer;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.3s ease;
                    }
                    
                    .voice-widget-button:hover {
                        transform: scale(1.1);
                        box-shadow: 0 6px 25px rgba(0,0,0,0.4);
                    }
                    
                    .voice-widget-button svg {
                        width: 28px;
                        height: 28px;
                        fill: white;
                    }
                    
                    .voice-widget-button.active {
                        background: #ef4444;
                        animation: pulse 2s infinite;
                    }
                    
                    @keyframes pulse {
                        0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                        50% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
                    }
                    
                    .voice-widget-panel {
                        position: absolute;
                        bottom: 70px;
                        right: 0;
                        width: 360px;
                        background: #1f2937;
                        border-radius: 16px;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                        overflow: hidden;
                        display: none;
                        color: white;
                    }
                    
                    .voice-widget-panel.open {
                        display: block;
                        animation: slideUp 0.3s ease;
                    }
                    
                    @keyframes slideUp {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    
                    .voice-widget-header {
                        padding: 16px;
                        background: #111827;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-bottom: 1px solid #374151;
                    }
                    
                    .voice-widget-title {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        font-weight: 600;
                    }
                    
                    .voice-widget-title .icon {
                        width: 36px;
                        height: 36px;
                        background: ${this.config.primaryColor};
                        border-radius: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    
                    .voice-widget-title .icon svg {
                        width: 20px;
                        height: 20px;
                        fill: white;
                    }
                    
                    .voice-widget-close {
                        background: none;
                        border: none;
                        color: #9ca3af;
                        cursor: pointer;
                        padding: 4px;
                    }
                    
                    .voice-widget-close:hover {
                        color: white;
                    }
                    
                    .voice-widget-body {
                        padding: 16px;
                    }
                    
                    .voice-widget-status {
                        text-align: center;
                        padding: 20px;
                    }
                    
                    .voice-widget-status .status-icon {
                        width: 80px;
                        height: 80px;
                        margin: 0 auto 16px;
                        background: #374151;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    
                    .voice-widget-status .status-icon.active {
                        background: ${this.config.primaryColor};
                        animation: pulse-icon 1.5s infinite;
                    }
                    
                    @keyframes pulse-icon {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.1); }
                    }
                    
                    .voice-widget-status .status-icon svg {
                        width: 40px;
                        height: 40px;
                        fill: white;
                    }
                    
                    .voice-widget-status .status-text {
                        font-size: 18px;
                        font-weight: 600;
                        margin-bottom: 4px;
                    }
                    
                    .voice-widget-status .status-subtext {
                        color: #9ca3af;
                        font-size: 14px;
                    }
                    
                    .voice-widget-duration {
                        font-size: 24px;
                        font-weight: 700;
                        color: ${this.config.primaryColor};
                        margin: 10px 0;
                    }
                    
                    .voice-widget-messages {
                        max-height: 200px;
                        overflow-y: auto;
                        margin: 16px 0;
                        border-radius: 8px;
                        background: #111827;
                        padding: 8px;
                    }
                    
                    .voice-widget-message {
                        padding: 8px 12px;
                        margin: 4px 0;
                        border-radius: 8px;
                        font-size: 13px;
                        line-height: 1.4;
                    }
                    
                    .voice-widget-message.user {
                        background: #374151;
                        margin-left: 20px;
                    }
                    
                    .voice-widget-message.assistant {
                        background: ${this.config.primaryColor}33;
                        margin-right: 20px;
                    }
                    
                    .voice-widget-controls {
                        display: flex;
                        justify-content: center;
                        gap: 12px;
                        margin-top: 16px;
                    }
                    
                    .voice-widget-control-btn {
                        width: 50px;
                        height: 50px;
                        border-radius: 50%;
                        border: none;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s ease;
                    }
                    
                    .voice-widget-control-btn svg {
                        width: 24px;
                        height: 24px;
                    }
                    
                    .voice-widget-control-btn.primary {
                        background: #22c55e;
                    }
                    
                    .voice-widget-control-btn.primary:hover {
                        background: #16a34a;
                    }
                    
                    .voice-widget-control-btn.danger {
                        background: #ef4444;
                    }
                    
                    .voice-widget-control-btn.danger:hover {
                        background: #dc2626;
                    }
                    
                    .voice-widget-control-btn.secondary {
                        background: #374151;
                    }
                    
                    .voice-widget-control-btn.secondary:hover {
                        background: #4b5563;
                    }
                    
                    .voice-widget-control-btn.secondary.active {
                        background: #ef4444;
                    }
                    
                    .voice-widget-control-btn svg {
                        fill: white;
                    }
                    
                    .voice-widget-error {
                        background: #ef444433;
                        border: 1px solid #ef4444;
                        border-radius: 8px;
                        padding: 12px;
                        margin-top: 12px;
                        font-size: 13px;
                        color: #fca5a5;
                    }
                    
                    .voice-widget-connecting {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                    }
                    
                    .voice-widget-spinner {
                        width: 20px;
                        height: 20px;
                        border: 2px solid #374151;
                        border-top-color: ${this.config.primaryColor};
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }
                    
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                </style>
                
                <div class="voice-widget-panel" id="voice-widget-panel">
                    <div class="voice-widget-header">
                        <div class="voice-widget-title">
                            <div class="icon">
                                <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                            </div>
                            <div>
                                <div>${this.config.agentName}</div>
                                <div style="font-size: 11px; color: #9ca3af;">Voice Assistant</div>
                            </div>
                        </div>
                        <button class="voice-widget-close" id="voice-widget-close">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="voice-widget-body" id="voice-widget-body">
                        <!-- Content will be rendered here -->
                    </div>
                </div>
                
                <button class="voice-widget-button" id="voice-widget-button">
                    <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                </button>
                
                <audio id="voice-widget-remote-audio" autoplay></audio>
            `;

            document.body.appendChild(widget);
            this.refs.widget = widget;
            this.refs.remoteAudio = document.getElementById('voice-widget-remote-audio');
            this.renderBody();
        },

        // Render body based on state
        renderBody: function () {
            const body = document.getElementById('voice-widget-body');
            if (!body) return;

            const { callState, duration, messages, error, isMuted, isSpeakerOn } = this.state;

            let content = '';

            if (callState === 'idle') {
                content = `
                    <div class="voice-widget-status">
                        <div class="status-icon">
                            <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                        </div>
                        <div class="status-text">Start Voice Chat</div>
                        <div class="status-subtext">Click the button below to begin</div>
                    </div>
                    <div class="voice-widget-controls">
                        <button class="voice-widget-control-btn primary" id="voice-widget-start">
                            <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                        </button>
                    </div>
                `;
            } else if (callState === 'connecting') {
                content = `
                    <div class="voice-widget-status">
                        <div class="status-icon active">
                            <div class="voice-widget-spinner" style="width:40px;height:40px;border-width:3px;"></div>
                        </div>
                        <div class="status-text voice-widget-connecting">
                            Connecting...
                        </div>
                        <div class="status-subtext">Please wait</div>
                    </div>
                `;
            } else if (callState === 'connected') {
                const messagesHtml = messages.map(m =>
                    `<div class="voice-widget-message ${m.role}">${this.escapeHtml(m.content)}</div>`
                ).join('');

                content = `
                    <div class="voice-widget-status">
                        <div class="status-icon active">
                            <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                        </div>
                        <div class="voice-widget-duration">${this.formatDuration(duration)}</div>
                        <div class="status-subtext">Call in progress</div>
                    </div>
                    ${messages.length > 0 ? `<div class="voice-widget-messages">${messagesHtml}</div>` : ''}
                    <div class="voice-widget-controls">
                        <button class="voice-widget-control-btn secondary ${isMuted ? 'active' : ''}" id="voice-widget-mute">
                            ${isMuted ?
                        '<svg viewBox="0 0 24 24"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>' :
                        '<svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>'
                    }
                        </button>
                        <button class="voice-widget-control-btn danger" id="voice-widget-hangup">
                            <svg viewBox="0 0 24 24"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                        </button>
                        <button class="voice-widget-control-btn secondary ${!isSpeakerOn ? 'active' : ''}" id="voice-widget-speaker">
                            ${isSpeakerOn ?
                        '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>' :
                        '<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>'
                    }
                        </button>
                    </div>
                `;
            } else if (callState === 'error') {
                content = `
                    <div class="voice-widget-status">
                        <div class="status-icon" style="background: #ef4444;">
                            <svg viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                        </div>
                        <div class="status-text">Connection Error</div>
                        <div class="status-subtext">${this.escapeHtml(error || 'Failed to connect')}</div>
                    </div>
                    <div class="voice-widget-controls">
                        <button class="voice-widget-control-btn primary" id="voice-widget-retry">
                            <svg viewBox="0 0 24 24" fill="white"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                        </button>
                    </div>
                `;
            }

            body.innerHTML = content;
            this.attachControlListeners();
        },

        // Attach event listeners
        attachEventListeners: function () {
            const button = document.getElementById('voice-widget-button');
            const closeBtn = document.getElementById('voice-widget-close');

            if (button) {
                button.addEventListener('click', () => {
                    this.state.isOpen = !this.state.isOpen;
                    const panel = document.getElementById('voice-widget-panel');
                    if (panel) {
                        panel.classList.toggle('open', this.state.isOpen);
                    }
                    button.classList.toggle('active', this.state.isOpen && this.state.callState === 'connected');
                });
            }

            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.state.isOpen = false;
                    const panel = document.getElementById('voice-widget-panel');
                    if (panel) {
                        panel.classList.remove('open');
                    }
                    const btn = document.getElementById('voice-widget-button');
                    if (btn) btn.classList.remove('active');
                });
            }
        },

        // Attach control button listeners
        attachControlListeners: function () {
            const startBtn = document.getElementById('voice-widget-start');
            const hangupBtn = document.getElementById('voice-widget-hangup');
            const muteBtn = document.getElementById('voice-widget-mute');
            const speakerBtn = document.getElementById('voice-widget-speaker');
            const retryBtn = document.getElementById('voice-widget-retry');

            if (startBtn) startBtn.addEventListener('click', () => this.startCall());
            if (hangupBtn) hangupBtn.addEventListener('click', () => this.hangup());
            if (muteBtn) muteBtn.addEventListener('click', () => this.toggleMute());
            if (speakerBtn) speakerBtn.addEventListener('click', () => this.toggleSpeaker());
            if (retryBtn) retryBtn.addEventListener('click', () => this.startCall());
        },

        // Start WebRTC call
        startCall: async function () {
            this.state.callState = 'connecting';
            this.state.error = null;
            this.state.messages = [];
            this.state.duration = 0;
            this.renderBody();

            try {
                // Get user media
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    }
                });
                this.refs.localStream = stream;

                // Create peer connection
                const pc = new RTCPeerConnection({
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                    ],
                });
                this.refs.peerConnection = pc;

                // Add local audio track
                stream.getAudioTracks().forEach(track => {
                    pc.addTrack(track, stream);
                });

                // Handle remote audio
                pc.ontrack = (event) => {
                    console.log('Received remote track:', event.track.kind);
                    if (this.refs.remoteAudio && event.streams[0]) {
                        this.refs.remoteAudio.srcObject = event.streams[0];
                        this.refs.remoteAudio.play().catch(console.error);
                    }
                };

                // Connection state changes
                pc.onconnectionstatechange = () => {
                    const state = pc.connectionState;
                    console.log('Connection state:', state);
                    if (state === 'failed' || state === 'disconnected' || state === 'closed') {
                        this.hangup();
                    }
                };

                // Set up data channel for events
                const dataChannel = pc.createDataChannel('oai-events');
                this.refs.dataChannel = dataChannel;

                dataChannel.onopen = () => console.log('Data channel opened');
                dataChannel.onmessage = (e) => this.handleDataChannelMessage(e);

                // Create offer
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                // Send to backend
                const response = await fetch(this.config.apiEndpoint + '/connect', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sdp: offer.sdp,
                        provider: this.config.aiProvider,
                    }),
                });

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`Failed to connect: ${errText}`);
                }

                const { sdp: answerSdp, sessionId } = await response.json();
                this.refs.sessionId = sessionId;

                // Set remote description
                await pc.setRemoteDescription({
                    type: 'answer',
                    sdp: answerSdp,
                });

                this.state.callState = 'connected';
                this.renderBody();

                // Update button state
                const btn = document.getElementById('voice-widget-button');
                if (btn) btn.classList.add('active');

                // Start duration timer
                this.refs.durationInterval = setInterval(() => {
                    this.state.duration++;
                    if (this.state.duration >= this.config.maxDuration) {
                        this.hangup();
                        this.state.error = 'Maximum call duration reached';
                    }
                    this.renderBody();
                }, 1000);

                console.log('WebRTC connected successfully');

            } catch (err) {
                console.error('Failed to start call:', err);
                this.state.error = err.message || 'Failed to connect';
                this.state.callState = 'error';
                this.renderBody();
                this.hangup();
            }
        },

        // Handle data channel messages
        handleDataChannelMessage: function (event) {
            try {
                const data = JSON.parse(event.data);
                console.log('Data channel event:', data.type);

                // Handle transcription events based on provider
                if (data.type === 'response.audio_transcript.done' && data.transcript) {
                    this.addMessage('assistant', data.transcript);
                }
                if (data.type === 'conversation.item.input_audio_transcription.completed' && data.transcript) {
                    this.addMessage('user', data.transcript);
                }
                // Eleven Labs events
                if (data.type === 'agent_response' && data.text) {
                    this.addMessage('assistant', data.text);
                }
                if (data.type === 'user_transcript' && data.text) {
                    this.addMessage('user', data.text);
                }
            } catch (err) {
                console.error('Failed to parse data channel message:', err);
            }
        },

        // Add message to list
        addMessage: function (role, content) {
            this.state.messages.push({
                id: Date.now().toString(),
                role: role,
                content: content,
                timestamp: new Date(),
            });
            // Keep only last 20 messages
            if (this.state.messages.length > 20) {
                this.state.messages = this.state.messages.slice(-20);
            }
            this.renderBody();

            // Scroll to bottom
            const messagesDiv = document.querySelector('.voice-widget-messages');
            if (messagesDiv) {
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
        },

        // Hangup call
        hangup: async function () {
            this.state.callState = 'disconnecting';

            if (this.refs.durationInterval) {
                clearInterval(this.refs.durationInterval);
                this.refs.durationInterval = null;
            }

            if (this.refs.localStream) {
                this.refs.localStream.getTracks().forEach(track => track.stop());
                this.refs.localStream = null;
            }

            if (this.refs.peerConnection) {
                this.refs.peerConnection.close();
                this.refs.peerConnection = null;
            }

            // Notify backend
            if (this.refs.sessionId) {
                try {
                    await fetch(this.config.apiEndpoint + '/disconnect', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ sessionId: this.refs.sessionId }),
                    });
                } catch (err) {
                    console.error('Failed to close session:', err);
                }
                this.refs.sessionId = null;
            }

            this.state.callState = 'idle';
            this.state.isMuted = false;
            this.renderBody();

            // Update button state
            const btn = document.getElementById('voice-widget-button');
            if (btn) btn.classList.remove('active');
        },

        // Toggle mute
        toggleMute: function () {
            if (this.refs.localStream) {
                this.refs.localStream.getAudioTracks().forEach(track => {
                    track.enabled = this.state.isMuted;
                });
                this.state.isMuted = !this.state.isMuted;
                this.renderBody();
            }
        },

        // Toggle speaker
        toggleSpeaker: function () {
            if (this.refs.remoteAudio) {
                this.refs.remoteAudio.muted = this.state.isSpeakerOn;
                this.state.isSpeakerOn = !this.state.isSpeakerOn;
                this.renderBody();
            }
        },

        // Format duration
        formatDuration: function (seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        },

        // Escape HTML
        escapeHtml: function (text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },
    };

    // Export to global
    global.VoiceWidget = VoiceWidget;

})(window);
