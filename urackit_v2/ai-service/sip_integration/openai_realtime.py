"""
OpenAI Realtime API connection handler for U Rack IT.
"""

import asyncio
import base64
import json
import logging
from typing import Any, Callable, Dict, Optional
from websockets.legacy.client import connect
import websockets

from .interfaces import IRealtimeConnection, AudioChunk, AudioFormat
from .config import get_config

logger = logging.getLogger(__name__)


class OpenAIRealtimeConnection(IRealtimeConnection):
    """WebSocket connection to OpenAI Realtime API."""
    
    def __init__(self, system_prompt: Optional[str] = None, tools: Optional[list[dict]] = None):
        self.config = get_config()
        self.system_prompt = system_prompt or self.config.system_prompt
        self.tools = tools or []
        
        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        self._session_id: Optional[str] = None
        self._is_connected = False
        self._greeting_sent = False
        
        # Callbacks
        self._audio_callback: Optional[Callable[[AudioChunk], None]] = None
        self._text_callback: Optional[Callable[[str, str], None]] = None
        self._function_callback: Optional[Callable[[str, Dict[str, Any]], Any]] = None
        self._interrupt_callback: Optional[Callable[[], None]] = None
        
        # Background task for receiving messages
        self._receive_task: Optional[asyncio.Task] = None
        self._assistant_transcript_buffer: str = ""
        
        # Track current response for interruption handling
        self._current_response_id: Optional[str] = None
        self._is_responding = False
        
        # Event to signal session is ready
        self._session_ready = asyncio.Event()
    
    async def connect(self, session_id: str) -> bool:
        """Establish WebSocket connection to OpenAI Realtime API."""
        if self._is_connected:
            logger.warning(f"Already connected to session {self._session_id}")
            return True
        
        self._session_id = session_id
        
        try:
            url = f"{self.config.openai_realtime_url}?model={self.config.openai_realtime_model}"
            
            headers = {
                "Authorization": f"Bearer {self.config.openai_api_key}",
                "OpenAI-Beta": "realtime=v1",
            }
            
            self._ws = await connect(url, extra_headers=headers)
            self._is_connected = True
            
            await self._configure_session()
            
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
                    "threshold": 0.7,
                    "prefix_padding_ms": 500,
                    "silence_duration_ms": 700
                },
            }
        }
        
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
    
    async def update_for_silent_mode(self) -> None:
        """Update session for silent listening mode.
        
        In this mode, AI only responds when explicitly called by name.
        """
        if not self._is_connected or not self._ws:
            return
        
        silent_instructions = '''
You are now in SILENT LISTENING MODE because a human technician has joined the call.

CRITICAL RULES FOR SILENT MODE:
1. DO NOT speak or respond unless someone explicitly says "AI agent", "hey AI", or "AI help"
2. Listen to the conversation silently
3. When called by "AI agent" or similar, respond helpfully and briefly
4. After responding, return to silent listening
5. Do NOT interrupt the human technician
6. Do NOT volunteer information unless asked

If someone says "AI agent" or calls you:
- Respond with "Yes, I'm here. How can I help?"
- Answer their question briefly
- Then go back to listening silently

Remember: You are a background assistant. The human technician is leading the call.
'''
        
        config_event = {
            "type": "session.update",
            "session": {
                "instructions": self.system_prompt + "\n\n" + silent_instructions,
                "turn_detection": {
                    "type": "server_vad",
                    "threshold": 0.7,  # Higher threshold to avoid false triggers
                    "prefix_padding_ms": 500,
                    "silence_duration_ms": 800  # Longer silence before responding
                },
            }
        }
        
        await self._send_event(config_event)
        logger.info("OpenAI session updated for silent listening mode")
    
    async def send_audio(self, audio: AudioChunk) -> None:
        """Send audio data to OpenAI Realtime API."""
        if not self._is_connected or not self._ws:
            logger.warning("Cannot send audio: not connected")
            return
        
        audio_b64 = base64.b64encode(audio.data).decode("utf-8")
        
        event = {
            "type": "input_audio_buffer.append",
            "audio": audio_b64
        }
        
        await self._send_event(event)
        
        if audio.is_final:
            await self._send_event({"type": "input_audio_buffer.commit"})
    
    async def send_text(self, text: str) -> None:
        """Send text input to OpenAI Realtime API."""
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
        await self._send_event({"type": "response.create"})

    async def start_greeting(self, caller_phone: str = None) -> None:
        """Trigger the assistant to greet immediately after connect.
        
        If caller_phone is provided, inject it as context so AI can look up the caller.
        """
        if not self._is_connected or not self._ws:
            logger.warning("Cannot start greeting: not connected")
            return
        
        if self._greeting_sent:
            return
        
        # Wait for session to be configured before sending greeting
        try:
            await asyncio.wait_for(self._session_ready.wait(), timeout=5.0)
        except asyncio.TimeoutError:
            logger.warning("Timeout waiting for session.updated - sending greeting anyway")
        
        self._greeting_sent = True
        
        # If we have the caller's phone, we DO NOT use it for authentication.
        # Caller must provide U&E code for organization verification.
        if caller_phone:
            context_event = {
                "type": "conversation.item.create",
                "item": {
                    "type": "message",
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": f"[SYSTEM: Incoming call from phone number: {caller_phone}. Do NOT attempt phone-based lookup. Ask for the caller's U E code and verify the organization using the U&E code only.]"
                        }
                    ]
                }
            }
            await self._send_event(context_event)
        
        await self._send_event({"type": "response.create"})
        logger.info(f"Triggered initial greeting with caller phone: {caller_phone}")
    
    def set_audio_callback(self, callback: Callable[[AudioChunk], None]) -> None:
        """Set callback for receiving audio from AI."""
        self._audio_callback = callback
    
    def set_text_callback(self, callback: Callable[[str, str], None]) -> None:
        """Set callback for receiving text transcription."""
        self._text_callback = callback
    
    def set_function_callback(self, callback: Callable[[str, Dict[str, Any]], Any]) -> None:
        """Set callback for function/tool calls from AI."""
        self._function_callback = callback
    
    def set_interrupt_callback(self, callback: Callable[[], None]) -> None:
        """Set callback for handling user interruptions."""
        self._interrupt_callback = callback
    
    async def cancel_response(self) -> None:
        """Cancel the current response being generated by OpenAI."""
        if not self._is_connected or not self._ws:
            return
        
        # Always send cancel - let OpenAI handle whether there's something to cancel
        await self._send_event({"type": "response.cancel"})
        self._is_responding = False
        logger.info("Sent response.cancel to OpenAI")
    
    async def truncate_response(self, item_id: str = None, audio_end_ms: int = None) -> None:
        """Truncate the current assistant audio response."""
        if not self._is_connected or not self._ws:
            return
        
        event = {
            "type": "conversation.item.truncate",
            "content_index": 0,
            "audio_end_ms": audio_end_ms or 0
        }
        if item_id:
            event["item_id"] = item_id
        
        await self._send_event(event)
        logger.info("Sent conversation.item.truncate to OpenAI")
    
    async def _send_event(self, event: dict) -> None:
        """Send an event to OpenAI."""
        if self._ws:
            await self._ws.send(json.dumps(event))
    
    async def _receive_loop(self) -> None:
        """Background loop for receiving messages from OpenAI."""
        try:
            async for message in self._ws:
                try:
                    event = json.loads(message)
                    await self._handle_event(event)
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON from OpenAI: {message}")
        except websockets.exceptions.ConnectionClosed:
            logger.info("OpenAI WebSocket connection closed")
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.error(f"Error in receive loop: {e}")
    
    async def _handle_event(self, event: dict) -> None:
        """Handle an event from OpenAI."""
        event_type = event.get("type", "")
        
        if event_type == "session.created":
            logger.info("OpenAI session created")
        
        elif event_type == "session.updated":
            logger.info("OpenAI session updated")
            # Signal that session is ready for responses
            self._session_ready.set()
        
        elif event_type == "response.audio.delta":
            # Audio chunk from AI
            audio_b64 = event.get("delta", "")
            if audio_b64 and self._audio_callback:
                audio_bytes = base64.b64decode(audio_b64)
                chunk = AudioChunk(
                    data=audio_bytes,
                    format=AudioFormat.G711_ULAW,
                    timestamp=0
                )
                self._audio_callback(chunk)
        
        elif event_type == "response.audio_transcript.delta":
            # Partial transcript of AI response
            delta = event.get("delta", "")
            self._assistant_transcript_buffer += delta
        
        elif event_type == "response.audio_transcript.done":
            # Complete transcript of AI response
            transcript = event.get("transcript", self._assistant_transcript_buffer)
            if transcript and self._text_callback:
                self._text_callback("assistant", transcript)
            self._assistant_transcript_buffer = ""
        
        elif event_type == "conversation.item.input_audio_transcription.completed":
            # User speech transcribed
            transcript = event.get("transcript", "")
            if transcript and self._text_callback:
                self._text_callback("user", transcript)
        
        elif event_type == "response.function_call_arguments.done":
            # Function call from AI
            call_id = event.get("call_id", "")
            name = event.get("name", "")
            arguments_str = event.get("arguments", "{}")
            
            try:
                arguments = json.loads(arguments_str)
            except json.JSONDecodeError:
                arguments = {}
            
            if self._function_callback:
                result = await self._execute_function(name, arguments)
                await self._send_function_result(call_id, result)
        
        elif event_type == "input_audio_buffer.speech_started":
            # User started speaking - ALWAYS call interrupt callback
            # to clear Twilio's audio buffer (even if OpenAI thinks it's done,
            # Twilio may still have audio queued)
            logger.info("VAD detected user speech starting")
            if self._interrupt_callback:
                self._interrupt_callback()
        
        elif event_type == "response.created":
            self._is_responding = True
            self._current_response_id = event.get("response", {}).get("id")
        
        elif event_type == "response.done":
            self._is_responding = False
            self._current_response_id = None
        
        elif event_type == "response.cancelled":
            # Response was cancelled (e.g., by user interruption)
            self._is_responding = False
            self._current_response_id = None
            logger.info("OpenAI response was cancelled")
        
        elif event_type == "error":
            error = event.get("error", {})
            error_msg = error.get('message', 'Unknown error')
            # Suppress "no active response" error - it's expected when clearing Twilio buffer
            if "no active response" in error_msg.lower():
                logger.debug(f"OpenAI info: {error_msg}")
            else:
                logger.error(f"OpenAI error: {error_msg}")
    
    async def _execute_function(self, name: str, arguments: Dict[str, Any]) -> str:
        """Execute a function call and return result."""
        if self._function_callback:
            try:
                result = self._function_callback(name, arguments)
                # Handle coroutines, tasks, and awaitable objects
                if asyncio.iscoroutine(result) or asyncio.isfuture(result):
                    result = await result
                elif hasattr(result, '__await__'):
                    result = await result
                return str(result) if result is not None else "Done"
            except Exception as e:
                logger.error(f"Function {name} failed: {e}")
                return f"Error: {str(e)}"
        return "Function not available"
    
    async def _send_function_result(self, call_id: str, result: str) -> None:
        """Send function result back to OpenAI."""
        event = {
            "type": "conversation.item.create",
            "item": {
                "type": "function_call_output",
                "call_id": call_id,
                "output": result
            }
        }
        await self._send_event(event)
        await self._send_event({"type": "response.create"})


def create_realtime_connection(
    system_prompt: Optional[str] = None,
    tools: Optional[list[dict]] = None
) -> OpenAIRealtimeConnection:
    """Factory function to create a realtime connection."""
    return OpenAIRealtimeConnection(system_prompt=system_prompt, tools=tools)
