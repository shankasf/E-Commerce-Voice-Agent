"""
OpenAI Realtime API connection handler.

Follows Single Responsibility Principle - handles only OpenAI Realtime API communication.
"""

import asyncio
import base64
import json
import logging
from typing import Any, Callable, Dict, Optional
import websockets
from websockets.asyncio.client import ClientConnection

from .interfaces import IRealtimeConnection, AudioChunk, AudioFormat
from .config import get_config

logger = logging.getLogger(__name__)


class OpenAIRealtimeConnection(IRealtimeConnection):
    """
    WebSocket connection to OpenAI Realtime API.
    
    Handles bidirectional audio streaming and function calling.
    """
    
    def __init__(self, system_prompt: Optional[str] = None, tools: Optional[list[dict]] = None):
        self.config = get_config()
        self.system_prompt = system_prompt or self.config.system_prompt
        self.tools = tools or []
        
        self._ws: Optional[ClientConnection] = None
        self._session_id: Optional[str] = None
        self._is_connected = False
        self._greeting_sent = False
        
        # Callbacks
        self._audio_callback: Optional[Callable[[AudioChunk], None]] = None
        # text callback signature: (role, text)
        self._text_callback: Optional[Callable[[str, str], None]] = None
        self._function_callback: Optional[Callable[[str, Dict[str, Any]], Any]] = None
        
        # Background task for receiving messages
        self._receive_task: Optional[asyncio.Task] = None
        self._assistant_transcript_buffer: str = ""
    
    async def connect(self, session_id: str) -> bool:
        """
        Establish WebSocket connection to OpenAI Realtime API.
        
        Args:
            session_id: Unique identifier for this session
            
        Returns:
            True if connection successful, False otherwise
        """
        if self._is_connected:
            logger.warning(f"Already connected to session {self._session_id}")
            return True
        
        self._session_id = session_id
        
        try:
            # Build WebSocket URL with model parameter
            url = f"{self.config.openai_realtime_url}?model={self.config.openai_realtime_model}"
            
            # Connect with authentication headers
            headers = {
                "Authorization": f"Bearer {self.config.openai_api_key}",
                "OpenAI-Beta": "realtime=v1",
            }
            
            self._ws = await websockets.connect(url, additional_headers=headers)
            self._is_connected = True
            
            # Configure the session
            await self._configure_session()
            
            # Start receiving messages in background
            self._receive_task = asyncio.create_task(self._receive_loop())
            
            logger.info(f"Connected to OpenAI Realtime API for session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to OpenAI Realtime API: {e}")
            self._is_connected = False
            return False
    
    async def _configure_session(self) -> None:
        """Send session configuration to OpenAI."""
        config_event = {
            "type": "session.update",
            "session": {
                "modalities": ["text", "audio"],
                "instructions": self.system_prompt,
                "voice": self.config.voice,
                "input_audio_format": self.config.input_audio_format,
                "output_audio_format": self.config.output_audio_format,
                "input_audio_transcription": {
                    "model": "whisper-1"
                },
                "turn_detection": {
                    "type": "server_vad",
                    "threshold": 0.5,
                    "prefix_padding_ms": 300,
                    "silence_duration_ms": 500
                },
            }
        }
        
        # Add tools if provided
        if self.tools:
            config_event["session"]["tools"] = self.tools
            config_event["session"]["tool_choice"] = "auto"
        
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
        logger.info(f"Disconnected from OpenAI Realtime API for session {self._session_id}")
    
    async def send_audio(self, audio: AudioChunk) -> None:
        """
        Send audio data to OpenAI Realtime API.
        
        Args:
            audio: Audio chunk to send
        """
        if not self._is_connected or not self._ws:
            logger.warning("Cannot send audio: not connected")
            return
        
        # Encode audio as base64
        audio_b64 = base64.b64encode(audio.data).decode("utf-8")
        
        event = {
            "type": "input_audio_buffer.append",
            "audio": audio_b64
        }
        
        await self._send_event(event)
        
        # If this is the final chunk, commit the buffer
        if audio.is_final:
            await self._send_event({"type": "input_audio_buffer.commit"})
    
    async def send_text(self, text: str) -> None:
        """
        Send text input to OpenAI Realtime API.
        
        Args:
            text: Text message to send
        """
        if not self._is_connected or not self._ws:
            logger.warning("Cannot send text: not connected")
            return
        
        event = {
            "type": "conversation.item.create",
            "item": {
                "type": "message",
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": text
                    }
                ]
            }
        }
        
        await self._send_event(event)
        
        # Trigger response generation
        await self._send_event({"type": "response.create"})

    async def start_greeting(self) -> None:
        """Trigger the assistant to greet immediately after connect."""
        if not self._is_connected or not self._ws:
            logger.warning("Cannot start greeting: not connected")
            return

        if self._greeting_sent:
            return

        greeting_event = {
            "type": "response.create",
            "response": {
                # Nudge model to follow the welcome line before any user input.
                "instructions": "Begin with the welcome greeting before anything else."
            },
        }

        await self._send_event(greeting_event)
        self._greeting_sent = True
    
    async def send_function_result(self, call_id: str, result: Any) -> None:
        """
        Send function call result back to OpenAI.
        
        Args:
            call_id: The function call ID from OpenAI
            result: The result of the function execution
        """
        if not self._is_connected or not self._ws:
            logger.warning("Cannot send function result: not connected")
            return
        
        event = {
            "type": "conversation.item.create",
            "item": {
                "type": "function_call_output",
                "call_id": call_id,
                "output": json.dumps(result) if not isinstance(result, str) else result
            }
        }
        
        await self._send_event(event)
        
        # Trigger response continuation
        await self._send_event({"type": "response.create"})
    
    def set_audio_callback(self, callback: Callable[[AudioChunk], None]) -> None:
        """Set callback for receiving audio from AI."""
        self._audio_callback = callback
    
    def set_text_callback(self, callback: Callable[[str, str], None]) -> None:
        """Set callback for receiving text transcription with role."""
        self._text_callback = callback
    
    def set_function_callback(self, callback: Callable[[str, Dict[str, Any]], Any]) -> None:
        """Set callback for function/tool calls from AI."""
        self._function_callback = callback
    
    async def _send_event(self, event: dict) -> None:
        """Send an event to OpenAI."""
        if self._ws:
            await self._ws.send(json.dumps(event))
    
    async def _receive_loop(self) -> None:
        """Background task to receive and process messages from OpenAI."""
        if not self._ws:
            return
        
        try:
            async for message in self._ws:
                try:
                    event = json.loads(message)
                    await self._handle_event(event)
                except json.JSONDecodeError:
                    logger.error(f"Failed to parse message: {message}")
        except websockets.ConnectionClosed:
            logger.info("WebSocket connection closed")
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.error(f"Error in receive loop: {e}")
        finally:
            self._is_connected = False
    
    async def _handle_event(self, event: dict) -> None:
        """Handle an event received from OpenAI."""
        event_type = event.get("type", "")
        
        if event_type == "response.audio.delta":
            # Audio output from AI
            if self._audio_callback and "delta" in event:
                audio_data = base64.b64decode(event["delta"])
                chunk = AudioChunk(
                    data=audio_data,
                    format=AudioFormat.G711_ULAW,
                    timestamp=asyncio.get_event_loop().time()
                )
                self._audio_callback(chunk)
            # Accumulate transcript text separately; actual transcript text is provided via transcript events.
        
        elif event_type == "response.audio.done":
            # Audio stream completed
            if self._audio_callback:
                chunk = AudioChunk(
                    data=b"",
                    format=AudioFormat.G711_ULAW,
                    timestamp=asyncio.get_event_loop().time(),
                    is_final=True
                )
                self._audio_callback(chunk)
            # Flush assistant transcript buffer as a single message when audio turn completes.
            if self._text_callback and self._assistant_transcript_buffer:
                self._text_callback("assistant", self._assistant_transcript_buffer.strip())
                self._assistant_transcript_buffer = ""
        
        elif event_type == "response.audio_transcript.delta":
            # Transcription of AI's speech
            if self._text_callback and "delta" in event:
                # Collect streaming transcript; flush on audio.done to avoid many fragments in history.
                self._assistant_transcript_buffer += event["delta"]
        
        elif event_type == "conversation.item.input_audio_transcription.completed":
            # Transcription of user's speech
            if self._text_callback and "transcript" in event:
                logger.info(f"User said: {event['transcript']}")
                self._text_callback("user", event["transcript"])
        
        elif event_type == "response.function_call_arguments.done":
            # Function call from AI
            if self._function_callback:
                call_id = event.get("call_id", "")
                name = event.get("name", "")
                arguments = json.loads(event.get("arguments", "{}"))
                
                logger.info(f"Function call: {name}({arguments})")
                
                # Execute function and send result back
                try:
                    result = await self._function_callback(name, arguments)
                    await self.send_function_result(call_id, result)
                except Exception as e:
                    logger.error(f"Function call failed: {e}")
                    await self.send_function_result(call_id, {"error": str(e)})
        
        elif event_type == "error":
            logger.error(f"OpenAI error: {event.get('error', {})}")
        
        elif event_type in ("session.created", "session.updated"):
            logger.info(f"Session event: {event_type}")
        
        # Log other events for debugging
        elif event_type not in ("response.created", "response.done", "rate_limits.updated"):
            logger.debug(f"Unhandled event type: {event_type}")


def create_realtime_connection(
    system_prompt: Optional[str] = None,
    tools: Optional[list[dict]] = None
) -> OpenAIRealtimeConnection:
    """Factory function to create OpenAI Realtime connection."""
    return OpenAIRealtimeConnection(system_prompt=system_prompt, tools=tools)
