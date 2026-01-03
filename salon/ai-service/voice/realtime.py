"""
GlamBook AI Service - Eleven Labs WebSocket Realtime

WebSocket-based realtime voice conversation using Eleven Labs.
"""

import asyncio
import base64
import json
import logging
from typing import Any, Callable, Dict, Optional
import websockets
from websockets.legacy.client import connect

from config import get_config

logger = logging.getLogger(__name__)


class ElevenLabsRealtimeConnection:
    """
    WebSocket connection for Eleven Labs realtime conversation.
    
    Uses Eleven Labs Conversational AI WebSocket for low-latency voice.
    """
    
    def __init__(
        self,
        system_prompt: str,
        tools: Optional[list[dict]] = None,
        first_message: Optional[str] = None
    ):
        self.config = get_config()
        self.system_prompt = system_prompt
        self.tools = tools or []
        self.first_message = first_message
        
        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        self._session_id: Optional[str] = None
        self._is_connected = False
        
        # Callbacks
        self._audio_callback: Optional[Callable[[bytes], None]] = None
        self._text_callback: Optional[Callable[[str, str], None]] = None
        self._function_callback: Optional[Callable[[str, Dict[str, Any]], Any]] = None
        self._interrupt_callback: Optional[Callable[[], None]] = None
        
        # Background task
        self._receive_task: Optional[asyncio.Task] = None
        self._transcript_buffer: str = ""
    
    async def connect(self, session_id: str) -> bool:
        """
        Establish WebSocket connection to Eleven Labs.
        """
        if self._is_connected:
            logger.warning(f"Already connected to session {self._session_id}")
            return True
        
        self._session_id = session_id
        
        try:
            # Eleven Labs Conversational AI WebSocket endpoint
            # Note: This is the signed URL approach - you'd get this from their API
            url = f"wss://api.elevenlabs.io/v1/convai/conversation?agent_id={self.config.elevenlabs_voice_id}"
            
            headers = {
                "xi-api-key": self.config.elevenlabs_api_key,
            }
            
            logger.info(f"Connecting to Eleven Labs WebSocket for session {session_id}")
            
            self._ws = await connect(url, extra_headers=headers)
            self._is_connected = True
            
            # Configure the session
            await self._configure_session()
            
            # Start receive loop
            self._receive_task = asyncio.create_task(self._receive_loop())
            
            logger.info(f"Connected to Eleven Labs for session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to Eleven Labs: {e}")
            self._is_connected = False
            return False
    
    async def _configure_session(self) -> None:
        """Send session configuration."""
        config_event = {
            "type": "session.configure",
            "config": {
                "agent": {
                    "prompt": self.system_prompt,
                    "first_message": self.first_message,
                    "language": "en"
                },
                "tts": {
                    "voice_id": self.config.elevenlabs_voice_id,
                    "model_id": self.config.elevenlabs_model_id,
                    "stability": self.config.voice_stability,
                    "similarity_boost": self.config.voice_similarity_boost
                }
            }
        }
        
        if self.tools:
            config_event["config"]["tools"] = self.tools
        
        await self._send_event(config_event)
    
    async def disconnect(self) -> None:
        """Close WebSocket connection."""
        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass
            self._receive_task = None
        
        if self._ws:
            await self._ws.close()
            self._ws = None
        
        self._is_connected = False
        logger.info(f"Disconnected from Eleven Labs for session {self._session_id}")
    
    async def send_audio(self, audio_data: bytes) -> None:
        """Send audio data to Eleven Labs."""
        if not self._is_connected or not self._ws:
            logger.warning("Cannot send audio: not connected")
            return
        
        audio_b64 = base64.b64encode(audio_data).decode("utf-8")
        
        event = {
            "type": "audio.input",
            "audio": audio_b64
        }
        
        await self._send_event(event)
    
    async def send_text(self, text: str) -> None:
        """Send text input."""
        if not self._is_connected or not self._ws:
            logger.warning("Cannot send text: not connected")
            return
        
        event = {
            "type": "text.input",
            "text": text
        }
        
        await self._send_event(event)
    
    async def interrupt(self) -> None:
        """Interrupt the current response."""
        if not self._is_connected or not self._ws:
            return
        
        event = {"type": "interrupt"}
        await self._send_event(event)
    
    async def _send_event(self, event: dict) -> None:
        """Send event to WebSocket."""
        if self._ws:
            await self._ws.send(json.dumps(event))
    
    async def _receive_loop(self) -> None:
        """Background loop to receive messages."""
        try:
            async for message in self._ws:
                await self._handle_message(json.loads(message))
        except websockets.ConnectionClosed:
            logger.info("WebSocket connection closed")
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error in receive loop: {e}")
        finally:
            self._is_connected = False
    
    async def _handle_message(self, event: dict) -> None:
        """Handle incoming WebSocket message."""
        event_type = event.get("type", "")
        
        if event_type == "audio.output":
            # Audio response from agent
            if self._audio_callback:
                audio_data = base64.b64decode(event.get("audio", ""))
                self._audio_callback(audio_data)
        
        elif event_type == "transcript.partial":
            # Partial transcript
            self._transcript_buffer = event.get("text", "")
        
        elif event_type == "transcript.final":
            # Final transcript
            role = event.get("role", "user")
            text = event.get("text", "")
            if self._text_callback:
                self._text_callback(role, text)
            self._transcript_buffer = ""
        
        elif event_type == "tool.call":
            # Tool/function call
            if self._function_callback:
                tool_name = event.get("name", "")
                tool_args = event.get("arguments", {})
                result = await self._function_callback(tool_name, tool_args)
                
                # Send tool result back
                await self._send_event({
                    "type": "tool.result",
                    "call_id": event.get("call_id"),
                    "result": result
                })
        
        elif event_type == "interruption":
            if self._interrupt_callback:
                self._interrupt_callback()
        
        elif event_type == "error":
            logger.error(f"Eleven Labs error: {event.get('message', 'Unknown error')}")
    
    def on_audio(self, callback: Callable[[bytes], None]) -> None:
        """Set callback for audio output."""
        self._audio_callback = callback
    
    def on_text(self, callback: Callable[[str, str], None]) -> None:
        """Set callback for text transcripts."""
        self._text_callback = callback
    
    def on_function_call(self, callback: Callable[[str, Dict[str, Any]], Any]) -> None:
        """Set callback for function calls."""
        self._function_callback = callback
    
    def on_interrupt(self, callback: Callable[[], None]) -> None:
        """Set callback for interruptions."""
        self._interrupt_callback = callback
    
    @property
    def is_connected(self) -> bool:
        return self._is_connected
