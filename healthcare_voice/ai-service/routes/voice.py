"""Voice WebSocket route for OpenAI Realtime API integration"""
import json
import logging
import asyncio
import base64
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import websockets

from config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime"


@router.websocket("/voice")
async def voice_websocket(
    websocket: WebSocket,
    patient_id: Optional[str] = Query(None)
):
    """WebSocket endpoint for browser-based voice agent."""
    await websocket.accept()
    session_id = f"voice_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    logger.info(f"Voice WebSocket connected: {session_id}")

    try:
        # Connect to OpenAI Realtime API
        openai_ws_url = f"{OPENAI_REALTIME_URL}?model={settings.openai_model}"
        headers = {
            "Authorization": f"Bearer {settings.openai_api_key}",
            "OpenAI-Beta": "realtime=v1"
        }

        logger.info(f"Connecting to OpenAI: {openai_ws_url}")

        async with websockets.connect(
            openai_ws_url,
            extra_headers=headers,
            ping_interval=20,
            ping_timeout=20
        ) as openai_ws:
            logger.info(f"Connected to OpenAI Realtime API")

            # Wait for session.created
            session_created = await openai_ws.recv()
            logger.info(f"Received: {session_created[:200]}")

            # Configure the session
            session_config = {
                "type": "session.update",
                "session": {
                    "modalities": ["text", "audio"],
                    "instructions": """You are a friendly healthcare specialist for Sunrise Family Healthcare.
Help patients with appointments, health-related questions, and general inquiries. Be warm, professional, and concise.
Keep responses brief and natural for voice conversation.

IMPORTANT: At the start of each conversation, you must proactively greet the caller and introduce yourself as a healthcare specialist.
For example: "Hello! Thank you for calling Sunrise Family Healthcare. I'm your healthcare specialist here to help you today. How may I assist you?"
Always speak first - do not wait for the caller to speak.""",
                    "voice": settings.openai_voice,
                    "input_audio_format": "pcm16",
                    "output_audio_format": "pcm16",
                    "input_audio_transcription": {
                        "model": "whisper-1"
                    },
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.5,
                        "prefix_padding_ms": 300,
                        "silence_duration_ms": 700
                    },
                    "temperature": 0.8
                }
            }

            await openai_ws.send(json.dumps(session_config))
            logger.info("Session config sent")

            # Wait for session.updated
            session_updated = await openai_ws.recv()
            logger.info(f"Session updated: {session_updated[:200]}")

            # Notify browser that we're ready
            await websocket.send_json({"type": "ready"})
            logger.info("Sent ready message to browser")

            # Trigger proactive greeting - make the AI speak first
            initial_greeting = {
                "type": "response.create",
                "response": {
                    "modalities": ["text", "audio"],
                    "instructions": "Greet the caller warmly and introduce yourself as a healthcare specialist from Sunrise Family Healthcare. Ask how you can help them today."
                }
            }
            await openai_ws.send(json.dumps(initial_greeting))
            logger.info("Triggered proactive greeting")

            # Create tasks for bidirectional communication
            audio_chunk_count = 0

            async def browser_to_openai():
                """Relay audio from browser to OpenAI"""
                nonlocal audio_chunk_count
                try:
                    while True:
                        message = await websocket.receive()

                        if message.get("type") == "websocket.disconnect":
                            logger.info("Browser disconnected")
                            break

                        if "text" in message:
                            data = json.loads(message["text"])
                            msg_type = data.get("type")

                            if msg_type == "audio":
                                audio_chunk_count += 1
                                audio_data = data.get("audio")
                                if audio_chunk_count <= 5 or audio_chunk_count % 100 == 0:
                                    logger.info(f"Audio chunk {audio_chunk_count}: {len(audio_data) if audio_data else 0} bytes")
                                # Forward audio to OpenAI
                                audio_event = {
                                    "type": "input_audio_buffer.append",
                                    "audio": audio_data
                                }
                                await openai_ws.send(json.dumps(audio_event))

                except WebSocketDisconnect:
                    logger.info("Browser WebSocket disconnected")
                except Exception as e:
                    logger.error(f"Browser to OpenAI error: {e}")

            async def openai_to_browser():
                """Relay responses from OpenAI to browser"""
                try:
                    async for message in openai_ws:
                        data = json.loads(message)
                        event_type = data.get("type")

                        logger.info(f"OpenAI event: {event_type}")

                        if event_type == "response.audio.delta":
                            # Send audio chunk to browser
                            await websocket.send_json({
                                "type": "audio",
                                "audio": data.get("delta")
                            })

                        elif event_type == "response.audio_transcript.delta":
                            await websocket.send_json({
                                "type": "transcript",
                                "role": "assistant",
                                "text": data.get("delta", "")
                            })

                        elif event_type == "response.audio_transcript.done":
                            await websocket.send_json({
                                "type": "transcript_done",
                                "role": "assistant",
                                "text": data.get("transcript", "")
                            })

                        elif event_type == "conversation.item.input_audio_transcription.completed":
                            await websocket.send_json({
                                "type": "transcript_done",
                                "role": "user",
                                "text": data.get("transcript", "")
                            })

                        elif event_type == "response.done":
                            await websocket.send_json({"type": "response_done"})

                        elif event_type == "error":
                            error_msg = data.get("error", {})
                            logger.error(f"OpenAI error: {error_msg}")
                            await websocket.send_json({
                                "type": "error",
                                "error": error_msg.get("message", str(error_msg))
                            })

                        elif event_type == "input_audio_buffer.speech_started":
                            logger.info("Speech started")

                        elif event_type == "input_audio_buffer.speech_stopped":
                            logger.info("Speech stopped")

                except Exception as e:
                    logger.error(f"OpenAI to browser error: {e}")

            # Run both tasks
            browser_task = asyncio.create_task(browser_to_openai())
            openai_task = asyncio.create_task(openai_to_browser())

            done, pending = await asyncio.wait(
                [browser_task, openai_task],
                return_when=asyncio.FIRST_COMPLETED
            )

            for task in pending:
                task.cancel()

    except WebSocketDisconnect:
        logger.info(f"Browser disconnected: {session_id}")
    except Exception as e:
        logger.error(f"Voice WebSocket error: {e}", exc_info=True)
    finally:
        logger.info(f"Voice session ended: {session_id}")


@router.get("/health")
async def health():
    return {"status": "healthy"}
