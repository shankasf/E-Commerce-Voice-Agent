"""
GlamBook AI Service - Eleven Labs Voice Integration

Text-to-Speech and Speech-to-Text using Eleven Labs API.
"""

import asyncio
import logging
from typing import Optional, Callable, AsyncIterator
from elevenlabs import ElevenLabs
from elevenlabs.client import AsyncElevenLabs
from config import get_config

logger = logging.getLogger(__name__)


class ElevenLabsVoice:
    """
    Eleven Labs voice service for TTS and STT.
    
    Docs: https://elevenlabs.io/docs/overview/intro
    """
    
    def __init__(self):
        self.config = get_config()
        self.client = ElevenLabs(api_key=self.config.elevenlabs_api_key)
        self.async_client = AsyncElevenLabs(api_key=self.config.elevenlabs_api_key)
        
        # Default voice settings
        self.voice_id = self.config.elevenlabs_voice_id
        self.model_id = self.config.elevenlabs_model_id
        
        # Voice settings
        self.voice_settings = {
            "stability": self.config.voice_stability,
            "similarity_boost": self.config.voice_similarity_boost,
            "style": self.config.voice_style,
            "use_speaker_boost": True
        }
    
    async def text_to_speech(
        self,
        text: str,
        voice_id: Optional[str] = None,
        model_id: Optional[str] = None
    ) -> bytes:
        """
        Convert text to speech audio.
        
        Args:
            text: Text to convert to speech
            voice_id: Optional voice ID override
            model_id: Optional model ID override
            
        Returns:
            Audio bytes (mp3 format)
        """
        try:
            audio = await self.async_client.text_to_speech.convert(
                voice_id=voice_id or self.voice_id,
                text=text,
                model_id=model_id or self.model_id,
                voice_settings=self.voice_settings
            )
            
            # Collect audio chunks
            audio_bytes = b""
            async for chunk in audio:
                audio_bytes += chunk
            
            logger.info(f"TTS generated {len(audio_bytes)} bytes for {len(text)} chars")
            return audio_bytes
            
        except Exception as e:
            logger.error(f"TTS error: {e}")
            raise
    
    async def text_to_speech_stream(
        self,
        text: str,
        voice_id: Optional[str] = None,
        model_id: Optional[str] = None
    ) -> AsyncIterator[bytes]:
        """
        Stream text to speech audio.
        
        Yields audio chunks as they're generated for lower latency.
        """
        try:
            audio_stream = await self.async_client.text_to_speech.convert(
                voice_id=voice_id or self.voice_id,
                text=text,
                model_id=model_id or self.model_id,
                voice_settings=self.voice_settings,
                output_format="mp3_44100_128"
            )
            
            async for chunk in audio_stream:
                yield chunk
                
        except Exception as e:
            logger.error(f"TTS stream error: {e}")
            raise
    
    def text_to_speech_sync(
        self,
        text: str,
        voice_id: Optional[str] = None,
        model_id: Optional[str] = None
    ) -> bytes:
        """
        Synchronous text to speech conversion.
        """
        try:
            audio = self.client.text_to_speech.convert(
                voice_id=voice_id or self.voice_id,
                text=text,
                model_id=model_id or self.model_id,
                voice_settings=self.voice_settings
            )
            
            # Collect audio chunks
            audio_bytes = b""
            for chunk in audio:
                audio_bytes += chunk
            
            return audio_bytes
            
        except Exception as e:
            logger.error(f"TTS sync error: {e}")
            raise
    
    async def get_available_voices(self) -> list:
        """
        Get list of available voices.
        """
        try:
            response = await self.async_client.voices.get_all()
            return [
                {
                    "voice_id": voice.voice_id,
                    "name": voice.name,
                    "category": voice.category,
                    "labels": voice.labels
                }
                for voice in response.voices
            ]
        except Exception as e:
            logger.error(f"Error getting voices: {e}")
            return []
    
    async def get_voice_info(self, voice_id: Optional[str] = None) -> dict:
        """
        Get information about a specific voice.
        """
        try:
            voice = await self.async_client.voices.get(voice_id or self.voice_id)
            return {
                "voice_id": voice.voice_id,
                "name": voice.name,
                "category": voice.category,
                "labels": voice.labels,
                "settings": voice.settings
            }
        except Exception as e:
            logger.error(f"Error getting voice info: {e}")
            return {}


class ElevenLabsConversation:
    """
    Conversational AI using Eleven Labs.
    
    This wraps the Conversational AI feature for real-time voice interactions.
    """
    
    def __init__(self, system_prompt: str):
        self.config = get_config()
        self.system_prompt = system_prompt
        self.voice = ElevenLabsVoice()
        
    async def process_audio_input(
        self,
        audio_data: bytes,
        on_text_response: Callable[[str], None],
        on_audio_response: Callable[[bytes], None]
    ):
        """
        Process audio input and generate response.
        
        For now, this uses a simple STT -> LLM -> TTS pipeline.
        In production, you'd use the Eleven Labs Conversational AI WebSocket.
        """
        # This is a placeholder - in production, integrate with
        # Eleven Labs Conversational AI or use their WebSocket API
        pass


# Singleton instance
_voice_instance: Optional[ElevenLabsVoice] = None


def get_voice() -> ElevenLabsVoice:
    """Get the voice service instance."""
    global _voice_instance
    if _voice_instance is None:
        _voice_instance = ElevenLabsVoice()
    return _voice_instance
