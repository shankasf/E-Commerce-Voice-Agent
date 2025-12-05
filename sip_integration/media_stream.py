"""
Media stream handler for Twilio WebSocket connections.

Handles bidirectional audio streaming between Twilio and OpenAI Realtime API.
"""

import asyncio
import base64
import json
import logging
from typing import Any, Dict, Optional
from fastapi import WebSocket, WebSocketDisconnect

from .interfaces import AudioChunk, AudioFormat, CallState
from .session_manager import VoiceSession, get_session_manager
from .openai_realtime import OpenAIRealtimeConnection, create_realtime_connection
from .agent_adapter import create_agent_adapter
from .config import get_config

logger = logging.getLogger(__name__)


class MediaStreamHandler:
    """
    Handles WebSocket media stream from Twilio.
    
    Bridges audio between Twilio and OpenAI Realtime API.
    """
    
    def __init__(self, websocket: WebSocket, session: VoiceSession):
        self.websocket = websocket
        self.session = session
        self.config = get_config()
        
        # OpenAI connection
        self.openai_connection: Optional[OpenAIRealtimeConnection] = None
        
        # Agent adapter for tool execution
        self.agent_adapter = create_agent_adapter(use_full_agents=True)
        
        # Stream ID from Twilio
        self.stream_sid: Optional[str] = None
        
        # Running state
        self._running = False
    
    async def handle(self) -> None:
        """Main handler for the WebSocket connection."""
        self._running = True
        
        try:
            await self.websocket.accept()
            logger.info(f"WebSocket connection accepted for session {self.session.session_id}")
            
            # Initialize OpenAI Realtime connection
            await self._setup_openai_connection()
            
            # Process messages from Twilio
            while self._running:
                try:
                    message = await self.websocket.receive_text()
                    await self._handle_twilio_message(message)
                except WebSocketDisconnect:
                    logger.info("Twilio WebSocket disconnected")
                    break
                except Exception as e:
                    logger.error(f"Error handling message: {e}")
                    break
        
        finally:
            await self._cleanup()
    
    async def _setup_openai_connection(self) -> None:
        """Initialize connection to OpenAI Realtime API."""
        # Get tools schema from agent adapter
        tools = self.agent_adapter.get_tools_schema()
        
        # Create OpenAI connection with tools
        self.openai_connection = create_realtime_connection(
            system_prompt=self.config.system_prompt,
            tools=tools
        )
        
        # Set up callbacks
        self.openai_connection.set_audio_callback(self._on_openai_audio)
        self.openai_connection.set_text_callback(self._on_openai_text)
        self.openai_connection.set_function_callback(self._on_openai_function)
        
        # Connect
        connected = await self.openai_connection.connect(self.session.session_id)
        if not connected:
            raise RuntimeError("Failed to connect to OpenAI Realtime API")
        
        # Store connection in session
        self.session.realtime_connection = self.openai_connection
        
        logger.info(f"OpenAI Realtime connected for session {self.session.session_id}")
    
    async def _handle_twilio_message(self, message: str) -> None:
        """Process a message from Twilio."""
        try:
            data = json.loads(message)
            event_type = data.get("event")
            
            if event_type == "connected":
                logger.info("Twilio media stream connected")
            
            elif event_type == "start":
                # Stream started - capture stream SID
                start_data = data.get("start", {})
                self.stream_sid = start_data.get("streamSid")
                
                # Update session state
                session_manager = get_session_manager()
                await session_manager.update_session_state(
                    self.session.session_id, 
                    CallState.CONNECTED
                )
                
                logger.info(f"Media stream started: {self.stream_sid}")
            
            elif event_type == "media":
                # Audio data from caller
                media_data = data.get("media", {})
                payload = media_data.get("payload", "")
                
                if payload and self.openai_connection:
                    # Decode base64 audio and send to OpenAI
                    audio_bytes = base64.b64decode(payload)
                    chunk = AudioChunk(
                        data=audio_bytes,
                        format=AudioFormat.G711_ULAW,
                        timestamp=float(media_data.get("timestamp", 0))
                    )
                    await self.openai_connection.send_audio(chunk)
            
            elif event_type == "stop":
                logger.info("Twilio media stream stopped")
                self._running = False
            
            elif event_type == "mark":
                # Audio playback marker
                mark_name = data.get("mark", {}).get("name")
                logger.debug(f"Playback mark: {mark_name}")
            
            else:
                logger.debug(f"Unhandled Twilio event: {event_type}")
        
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON from Twilio: {message}")
        except Exception as e:
            logger.error(f"Error processing Twilio message: {e}")
    
    def _on_openai_audio(self, chunk: AudioChunk) -> None:
        """Callback when audio is received from OpenAI."""
        if not self._running or not self.stream_sid:
            return
        
        if chunk.data:
            # Send audio to Twilio
            asyncio.create_task(self._send_audio_to_twilio(chunk.data))
    
    async def _send_audio_to_twilio(self, audio_data: bytes) -> None:
        """Send audio data to Twilio WebSocket."""
        try:
            # Encode as base64
            audio_b64 = base64.b64encode(audio_data).decode("utf-8")
            
            # Send media message to Twilio
            message = {
                "event": "media",
                "streamSid": self.stream_sid,
                "media": {
                    "payload": audio_b64
                }
            }
            
            await self.websocket.send_text(json.dumps(message))
        
        except Exception as e:
            logger.error(f"Error sending audio to Twilio: {e}")
    
    def _on_openai_text(self, text: str) -> None:
        """Callback when text/transcription is received from OpenAI."""
        # Log transcription for debugging
        logger.debug(f"OpenAI text: {text}")
        
        # Add to conversation history
        self.session.add_message("assistant", text)
    
    async def _on_openai_function(self, name: str, arguments: Dict[str, Any]) -> Any:
        """Callback when OpenAI requests a function call."""
        logger.info(f"Function call requested: {name}")
        
        # Execute through agent adapter
        result = await self.agent_adapter.execute_tool(name, arguments)
        
        return result
    
    async def _cleanup(self) -> None:
        """Clean up resources."""
        self._running = False
        
        if self.openai_connection:
            await self.openai_connection.disconnect()
            self.openai_connection = None
        
        # End session
        session_manager = get_session_manager()
        await session_manager.end_session(self.session.session_id)
        
        logger.info(f"Cleaned up session {self.session.session_id}")
    
    async def send_mark(self, name: str) -> None:
        """Send a mark event to track audio playback position."""
        if self.stream_sid:
            message = {
                "event": "mark",
                "streamSid": self.stream_sid,
                "mark": {"name": name}
            }
            await self.websocket.send_text(json.dumps(message))
    
    async def clear_audio(self) -> None:
        """Clear any queued audio on the Twilio side."""
        if self.stream_sid:
            message = {
                "event": "clear",
                "streamSid": self.stream_sid
            }
            await self.websocket.send_text(json.dumps(message))
