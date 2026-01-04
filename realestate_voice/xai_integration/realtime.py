"""
xAI Grok Voice Agent API connection handler.

Handles WebSocket connection to xAI's realtime voice API.
"""

import asyncio
import base64
import json
import logging
from typing import Any, Callable, Dict, List, Optional
import websockets
from websockets.legacy.client import connect

logger = logging.getLogger(__name__)

# xAI Voice API endpoint
XAI_REALTIME_URL = "wss://api.x.ai/v1/realtime"


class XAIRealtimeConnection:
    """WebSocket connection to xAI Grok Voice Agent API."""
    
    def __init__(
        self,
        api_key: str,
        system_prompt: str,
        voice: str = "Ara",
        tools: Optional[List[Dict]] = None,
        input_audio_format: str = "audio/pcmu",  # G.711 μ-law for Twilio
        output_audio_format: str = "audio/pcmu",
        sample_rate: int = 8000
    ):
        self.api_key = api_key
        self.system_prompt = system_prompt
        self.voice = voice
        self.tools = tools or []
        self.input_audio_format = input_audio_format
        self.output_audio_format = output_audio_format
        self.sample_rate = sample_rate
        
        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        self._session_id: Optional[str] = None
        self._is_connected = False
        self._greeting_sent = False
        
        # Callbacks
        self._audio_callback: Optional[Callable[[bytes], None]] = None
        self._text_callback: Optional[Callable[[str, str], None]] = None
        self._function_callback: Optional[Callable[[str, str, Dict[str, Any]], Any]] = None
        self._transcript_callback: Optional[Callable[[str, str], None]] = None
        self._speaking_callback: Optional[Callable[[bool], None]] = None
        
        # Background task for receiving messages
        self._receive_task: Optional[asyncio.Task] = None
        self._assistant_transcript_buffer: str = ""
        self._user_transcript_buffer: str = ""
        
        # Track current response for interruption handling
        self._current_response_id: Optional[str] = None
        self._is_responding = False
        
        # Event to signal session is ready
        self._session_ready = asyncio.Event()
    
    @property
    def is_connected(self) -> bool:
        """Check if WebSocket is connected."""
        return self._is_connected and self._ws is not None
    
    async def connect(self, session_id: str) -> bool:
        """Establish WebSocket connection to xAI Realtime API."""
        if self._is_connected:
            logger.warning(f"Already connected to session {self._session_id}")
            return True
        
        self._session_id = session_id
        
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
            }
            
            logger.info(f"Connecting to xAI Voice API for session {session_id}")
            
            self._ws = await connect(
                XAI_REALTIME_URL,
                extra_headers=headers,
                ping_interval=20,
                ping_timeout=10
            )
            
            self._is_connected = True
            logger.info(f"WebSocket connection established for session {session_id}")
            
            # Configure session
            await self._configure_session()
            
            # Start receive loop
            self._receive_task = asyncio.create_task(self._receive_loop())
            
            logger.info(f"Connected to xAI Voice API for session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to xAI Voice API: {e}")
            self._is_connected = False
            return False
    
    async def _configure_session(self) -> None:
        """Send session configuration to xAI."""
        # Build audio format config
        audio_config = {
            "input": {
                "format": {
                    "type": self.input_audio_format
                }
            },
            "output": {
                "format": {
                    "type": self.output_audio_format
                }
            }
        }
        
        # Add sample rate for PCM format
        if self.input_audio_format == "audio/pcm":
            audio_config["input"]["format"]["rate"] = self.sample_rate
        if self.output_audio_format == "audio/pcm":
            audio_config["output"]["format"]["rate"] = self.sample_rate
        
        config_event = {
            "type": "session.update",
            "session": {
                "voice": self.voice,
                "instructions": self.system_prompt,
                "turn_detection": {
                    "type": "server_vad"
                },
                "audio": audio_config
            }
        }
        
        # Add tools if defined
        if self.tools:
            config_event["session"]["tools"] = self.tools
        
        await self._send_event(config_event)
        logger.info("Session configuration sent to xAI")
    
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
        self._session_ready.clear()
        logger.info(f"Disconnected from xAI Voice API for session {self._session_id}")
    
    async def _send_event(self, event: Dict[str, Any]) -> None:
        """Send an event to the xAI API."""
        if not self._ws:
            logger.warning("Cannot send event: WebSocket not connected")
            return
        
        try:
            await self._ws.send(json.dumps(event))
        except Exception as e:
            logger.error(f"Error sending event: {e}")
    
    async def _receive_loop(self) -> None:
        """Background task to receive and process messages from xAI."""
        if not self._ws:
            return
        
        try:
            async for message in self._ws:
                try:
                    data = json.loads(message)
                    await self._handle_event(data)
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON received: {e}")
                except Exception as e:
                    logger.error(f"Error handling message: {e}")
                    
        except websockets.exceptions.ConnectionClosed:
            logger.info("WebSocket connection closed")
            self._is_connected = False
        except asyncio.CancelledError:
            logger.info("Receive loop cancelled")
            raise
        except Exception as e:
            logger.error(f"Receive loop error: {e}")
            self._is_connected = False
    
    async def _handle_event(self, event: Dict[str, Any]) -> None:
        """Handle an event from the xAI API."""
        event_type = event.get("type", "")
        
        # Log non-audio events for debugging
        if event_type not in ("response.output_audio.delta",):
            logger.debug(f"Received event: {event_type}")
        
        # Session events
        if event_type == "session.updated":
            logger.info("Session configuration confirmed")
            self._session_ready.set()
        
        elif event_type == "conversation.created":
            logger.info(f"Conversation created: {event.get('conversation', {}).get('id')}")
        
        # Speech detection events
        elif event_type == "input_audio_buffer.speech_started":
            logger.debug("User started speaking")
            if self._is_responding and self._speaking_callback:
                # User interrupted, stop speaking
                self._speaking_callback(False)
        
        elif event_type == "input_audio_buffer.speech_stopped":
            logger.debug("User stopped speaking")
        
        # Transcription events
        elif event_type == "conversation.item.input_audio_transcription.completed":
            transcript = event.get("transcript", "")
            if transcript and self._transcript_callback:
                self._transcript_callback("user", transcript)
        
        # Response events
        elif event_type == "response.created":
            response_id = event.get("response", {}).get("id")
            self._current_response_id = response_id
            self._is_responding = True
            self._assistant_transcript_buffer = ""
            if self._speaking_callback:
                self._speaking_callback(True)
        
        elif event_type == "response.output_audio.delta":
            # Audio data from AI
            audio_data = event.get("delta", "")
            if audio_data and self._audio_callback:
                # Decode base64 audio
                audio_bytes = base64.b64decode(audio_data)
                self._audio_callback(audio_bytes)
        
        elif event_type == "response.output_audio_transcript.delta":
            # Transcript delta
            delta = event.get("delta", "")
            self._assistant_transcript_buffer += delta
        
        elif event_type == "response.output_audio_transcript.done":
            # Full transcript complete
            if self._assistant_transcript_buffer and self._transcript_callback:
                self._transcript_callback("assistant", self._assistant_transcript_buffer)
            self._assistant_transcript_buffer = ""
        
        elif event_type == "response.output_audio.done":
            logger.debug("Audio output complete")
        
        elif event_type == "response.done":
            self._is_responding = False
            self._current_response_id = None
            if self._speaking_callback:
                self._speaking_callback(False)
        
        # Function call events
        elif event_type == "response.function_call_arguments.done":
            await self._handle_function_call(event)
        
        # Error events
        elif event_type == "error":
            error = event.get("error", {})
            logger.error(f"xAI API error: {error}")
    
    async def _handle_function_call(self, event: Dict[str, Any]) -> None:
        """Handle a function call from the AI."""
        function_name = event.get("name", "")
        call_id = event.get("call_id", "")
        arguments_str = event.get("arguments", "{}")
        
        try:
            arguments = json.loads(arguments_str)
        except json.JSONDecodeError:
            arguments = {}
        
        logger.info(f"Function call: {function_name} with args: {arguments}")
        
        result = None
        
        if self._function_callback:
            try:
                result = await self._function_callback(function_name, call_id, arguments)
            except Exception as e:
                logger.error(f"Error executing function {function_name}: {e}")
                result = {"error": str(e)}
        else:
            result = {"error": f"Function {function_name} not implemented"}
        
        # Send function result back to xAI
        await self._send_event({
            "type": "conversation.item.create",
            "item": {
                "type": "function_call_output",
                "call_id": call_id,
                "output": json.dumps(result)
            }
        })
        
        # Request AI to continue with the result
        await self._send_event({
            "type": "response.create"
        })
    
    # === Public API ===
    
    def on_audio(self, callback: Callable[[bytes], None]) -> None:
        """Register callback for audio output from AI."""
        self._audio_callback = callback
    
    def on_text(self, callback: Callable[[str, str], None]) -> None:
        """Register callback for text responses (role, text)."""
        self._text_callback = callback
    
    def on_transcript(self, callback: Callable[[str, str], None]) -> None:
        """Register callback for transcripts (role, transcript)."""
        self._transcript_callback = callback
    
    def on_function_call(self, callback: Callable[[str, str, Dict[str, Any]], Any]) -> None:
        """Register callback for function calls (name, call_id, args) -> result."""
        self._function_callback = callback
    
    def on_speaking(self, callback: Callable[[bool], None]) -> None:
        """Register callback for when AI starts/stops speaking."""
        self._speaking_callback = callback
    
    async def send_audio(self, audio_bytes: bytes) -> None:
        """Send audio data to xAI API."""
        if not self.is_connected:
            return
        
        # Encode audio as base64
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        await self._send_event({
            "type": "input_audio_buffer.append",
            "audio": audio_base64
        })
    
    async def send_text(self, text: str) -> None:
        """Send a text message to the AI."""
        if not self.is_connected:
            return
        
        await self._send_event({
            "type": "conversation.item.create",
            "item": {
                "type": "message",
                "role": "user",
                "content": [{"type": "input_text", "text": text}]
            }
        })
        
        # Request response
        await self._send_event({
            "type": "response.create",
            "response": {
                "modalities": ["text", "audio"]
            }
        })
    
    async def trigger_response(self) -> None:
        """Manually trigger AI to generate a response."""
        if not self.is_connected:
            return
        
        await self._send_event({
            "type": "response.create",
            "response": {
                "modalities": ["text", "audio"]
            }
        })
    
    async def send_greeting(self) -> None:
        """Send initial greeting when call connects."""
        if self._greeting_sent:
            return
        
        self._greeting_sent = True
        
        # Wait for session to be ready
        try:
            await asyncio.wait_for(self._session_ready.wait(), timeout=5.0)
        except asyncio.TimeoutError:
            logger.warning("Session ready timeout, sending greeting anyway")
        
        # Trigger the AI to greet the caller
        await self._send_event({
            "type": "conversation.item.create",
            "item": {
                "type": "message",
                "role": "user",
                "content": [{
                    "type": "input_text",
                    "text": "[System: A caller has just connected. Please greet them warmly and ask how you can help them today.]"
                }]
            }
        })
        
        await self._send_event({
            "type": "response.create",
            "response": {
                "modalities": ["text", "audio"]
            }
        })
    
    async def clear_audio_buffer(self) -> None:
        """Clear the input audio buffer."""
        if not self.is_connected:
            return
        
        await self._send_event({
            "type": "input_audio_buffer.clear"
        })
    
    async def commit_audio_buffer(self) -> None:
        """Commit the audio buffer and request response (for manual VAD)."""
        if not self.is_connected:
            return
        
        await self._send_event({
            "type": "input_audio_buffer.commit"
        })
        
        await self._send_event({
            "type": "response.create"
        })
