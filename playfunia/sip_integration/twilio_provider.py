"""
Twilio telephony provider implementation.

Follows Single Responsibility and Open/Closed principles.
"""

from twilio.twiml.voice_response import VoiceResponse, Connect, Stream, Say
from twilio.request_validator import RequestValidator
from typing import Optional

from .interfaces import ITelephonyProvider, CallInfo
from .config import get_config


class TwilioProvider(ITelephonyProvider):
    """
    Twilio-specific implementation of telephony operations.
    
    Implements ITelephonyProvider for Twilio integration.
    """
    
    def __init__(self, account_sid: Optional[str] = None, auth_token: Optional[str] = None):
        config = get_config()
        self.account_sid = account_sid or config.twilio_account_sid
        self.auth_token = auth_token or config.twilio_auth_token
        self._validator: Optional[RequestValidator] = None
    
    @property
    def validator(self) -> RequestValidator:
        """Lazy initialization of request validator."""
        if self._validator is None:
            self._validator = RequestValidator(self.auth_token)
        return self._validator
    
    def generate_connect_response(self, stream_url: str, call_info: CallInfo) -> str:
        """
        Generate TwiML to connect call to a WebSocket media stream.
        
        Args:
            stream_url: WebSocket URL for media streaming
            call_info: Information about the incoming call
            
        Returns:
            TwiML XML string
        """
        response = VoiceResponse()
        
        # Optional welcome message before connecting
        # response.say("Connecting you to the Toy Shop assistant. One moment please.", voice="Polly.Joanna")
        
        # Create bidirectional stream connection
        connect = Connect()
        stream = Stream(url=stream_url)
        
        # Add custom parameters to identify the call
        stream.parameter(name="call_sid", value=call_info.call_sid)
        stream.parameter(name="from_number", value=call_info.from_number)
        stream.parameter(name="to_number", value=call_info.to_number)
        
        if call_info.caller_name:
            stream.parameter(name="caller_name", value=call_info.caller_name)
        
        connect.append(stream)
        response.append(connect)
        
        return str(response)
    
    def generate_say_response(self, text: str, voice: str = "Polly.Joanna") -> str:
        """
        Generate TwiML to speak text to caller.
        
        Args:
            text: Text to speak
            voice: Voice to use (default: Polly.Joanna)
            
        Returns:
            TwiML XML string
        """
        response = VoiceResponse()
        response.say(text, voice=voice)
        return str(response)
    
    def generate_hangup_response(self) -> str:
        """
        Generate TwiML to hang up the call.
        
        Returns:
            TwiML XML string
        """
        response = VoiceResponse()
        response.hangup()
        return str(response)
    
    def generate_hold_response(self, hold_music_url: Optional[str] = None) -> str:
        """
        Generate TwiML to put caller on hold.
        
        Args:
            hold_music_url: Optional URL to hold music
            
        Returns:
            TwiML XML string
        """
        response = VoiceResponse()
        if hold_music_url:
            response.play(hold_music_url, loop=0)  # Loop indefinitely
        else:
            response.say("Please hold while we connect you.", voice="Polly.Joanna")
            response.pause(length=30)
        return str(response)
    
    async def validate_request(self, url: str, params: dict, signature: str) -> bool:
        """
        Validate that a webhook request came from Twilio.
        
        Args:
            url: Full URL of the webhook endpoint
            params: Request parameters (POST body or query params)
            signature: X-Twilio-Signature header value
            
        Returns:
            True if request is valid, False otherwise
        """
        if not self.auth_token:
            # Skip validation if no auth token configured (development mode)
            return True
        
        return self.validator.validate(url, params, signature)
    
    @staticmethod
    def parse_call_info(form_data: dict) -> CallInfo:
        """
        Parse Twilio webhook form data into CallInfo object.
        
        Args:
            form_data: Dictionary of form data from Twilio webhook
            
        Returns:
            CallInfo object with call details
        """
        return CallInfo(
            call_sid=form_data.get("CallSid", ""),
            from_number=form_data.get("From", ""),
            to_number=form_data.get("To", ""),
            direction=form_data.get("Direction", "inbound"),
            account_sid=form_data.get("AccountSid", ""),
            caller_name=form_data.get("CallerName"),
            caller_city=form_data.get("CallerCity"),
            caller_state=form_data.get("CallerState"),
            caller_zip=form_data.get("CallerZip"),
            caller_country=form_data.get("CallerCountry"),
        )


# Factory function for creating provider instances
def create_twilio_provider() -> TwilioProvider:
    """Create a TwilioProvider with configuration from environment."""
    return TwilioProvider()
