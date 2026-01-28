"""Shared prompt/script text for U Rack IT AI service.

Keep all caller-facing scripts centralized here so multiple entrypoints
(WebRTC, SIP/Reatime, chat) don't drift and accidentally use older text.
"""

UE_OPENING_GREETING_TEXT = (
    "Hello, you have reached support.\n"
    "This is U-E, your help desk assistant.\n\n"
    "Before we get started, I just need a few quick details so I can pull up the right account.\n\n"
    "What company are you calling from?"
)
