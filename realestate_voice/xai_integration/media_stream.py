"""
Media stream handler for Twilio <-> xAI audio bridging.

Handles bidirectional audio streaming between Twilio WebSocket and xAI Voice API.
"""

import asyncio
import base64
import json
import logging
from typing import Optional

from fastapi import WebSocket

from .realtime import XAIRealtimeConnection
from .session_manager import VoiceSession, SessionState

logger = logging.getLogger(__name__)


class MediaStreamHandler:
    """Handles bidirectional audio streaming between Twilio and xAI."""
    
    def __init__(
        self,
        session: VoiceSession,
        twilio_ws: WebSocket,
        xai_connection: XAIRealtimeConnection
    ):
        self.session = session
        self.twilio_ws = twilio_ws
        self.xai = xai_connection
        
        self._stream_sid: Optional[str] = None
        self._is_running = False
        self._audio_queue: asyncio.Queue = asyncio.Queue()
    
    async def start(self) -> None:
        """Start handling the media stream."""
        self._is_running = True
        self.session.state = SessionState.ACTIVE
        
        # Set up xAI callbacks
        self.xai.on_audio(self._handle_xai_audio)
        self.xai.on_transcript(self._handle_transcript)
        self.xai.on_speaking(self._handle_speaking_state)
        
        # Start audio sender task
        sender_task = asyncio.create_task(self._audio_sender_loop())
        
        try:
            # Process incoming Twilio messages
            await self._receive_loop()
        finally:
            self._is_running = False
            sender_task.cancel()
            try:
                await sender_task
            except asyncio.CancelledError:
                pass
    
    async def _receive_loop(self) -> None:
        """Receive and process messages from Twilio WebSocket."""
        try:
            while self._is_running:
                message = await self.twilio_ws.receive_text()
                data = json.loads(message)
                event_type = data.get("event")
                
                if event_type == "connected":
                    logger.info("Twilio media stream connected")
                
                elif event_type == "start":
                    start_data = data.get("start", {})
                    self._stream_sid = start_data.get("streamSid")
                    logger.info(f"Media stream started: {self._stream_sid}")
                    
                    # Send greeting after stream starts
                    asyncio.create_task(self._delayed_greeting())
                
                elif event_type == "media":
                    # Audio from caller
                    media = data.get("media", {})
                    payload = media.get("payload", "")
                    
                    if payload:
                        # Twilio sends base64-encoded μ-law audio
                        audio_bytes = base64.b64decode(payload)
                        
                        # Forward to xAI
                        await self.xai.send_audio(audio_bytes)
                        self.session.audio_packets_received += 1
                
                elif event_type == "mark":
                    # Mark event - audio playback reached a marker
                    logger.debug(f"Mark received: {data.get('mark', {}).get('name')}")
                
                elif event_type == "stop":
                    logger.info("Twilio media stream stopped")
                    break
                
        except Exception as e:
            logger.error(f"Error in receive loop: {e}")
            raise
    
    async def _delayed_greeting(self) -> None:
        """Send greeting after a short delay to ensure connection is stable."""
        await asyncio.sleep(0.5)
        await self.xai.send_greeting()
    
    def _handle_xai_audio(self, audio_bytes: bytes) -> None:
        """Handle audio output from xAI."""
        # Queue audio for sending to Twilio
        try:
            self._audio_queue.put_nowait(audio_bytes)
        except asyncio.QueueFull:
            logger.warning("Audio queue full, dropping packet")
    
    async def _audio_sender_loop(self) -> None:
        """Send queued audio to Twilio."""
        try:
            while self._is_running:
                try:
                    audio_bytes = await asyncio.wait_for(
                        self._audio_queue.get(),
                        timeout=0.1
                    )
                    
                    # Encode as base64 for Twilio
                    audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
                    
                    # Send to Twilio
                    media_message = {
                        "event": "media",
                        "streamSid": self._stream_sid,
                        "media": {
                            "payload": audio_base64
                        }
                    }
                    
                    await self.twilio_ws.send_text(json.dumps(media_message))
                    self.session.audio_packets_sent += 1
                    
                except asyncio.TimeoutError:
                    continue
                    
        except asyncio.CancelledError:
            logger.debug("Audio sender cancelled")
            raise
        except Exception as e:
            logger.error(f"Error in audio sender: {e}")
    
    def _handle_transcript(self, role: str, transcript: str) -> None:
        """Handle transcript from xAI."""
        if transcript:
            self.session.add_message(role, transcript)
            logger.info(f"[{role.upper()}] {transcript}")
    
    def _handle_speaking_state(self, is_speaking: bool) -> None:
        """Handle AI speaking state changes."""
        logger.debug(f"AI speaking: {is_speaking}")
    
    async def send_mark(self, name: str) -> None:
        """Send a mark event to Twilio for tracking audio playback."""
        if self._stream_sid:
            mark_message = {
                "event": "mark",
                "streamSid": self._stream_sid,
                "mark": {
                    "name": name
                }
            }
            await self.twilio_ws.send_text(json.dumps(mark_message))
    
    async def clear_audio(self) -> None:
        """Clear queued audio (for interruption handling)."""
        while not self._audio_queue.empty():
            try:
                self._audio_queue.get_nowait()
            except asyncio.QueueEmpty:
                break
        
        # Send clear message to Twilio
        if self._stream_sid:
            clear_message = {
                "event": "clear",
                "streamSid": self._stream_sid
            }
            await self.twilio_ws.send_text(json.dumps(clear_message))
