"""Post-session AI analysis for call/chat transcripts"""
import json
import logging
import httpx
from typing import Dict, Optional
from config import settings
from db import queries

logger = logging.getLogger(__name__)

OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"

ANALYSIS_PROMPT = """Analyze the following healthcare call/chat transcript and return a JSON object with these fields:

1. **sentiment_label**: Overall sentiment - one of: "positive", "negative", "neutral", "mixed"
2. **sentiment_score**: Float from -1.0 (very negative) to 1.0 (very positive)
3. **lead_classification**: Patient lead quality - one of: "hot", "warm", "cold", "none"
   - "hot": New patient actively seeking appointment, ready to commit
   - "warm": Interested patient, asking questions, may book later
   - "cold": Existing patient with routine inquiry
   - "none": No lead potential (e.g., cancellation only)
4. **lead_score**: Integer 0-100 representing lead quality
5. **intent**: Primary intent - one of: "appointment_booking", "appointment_cancellation", "appointment_rescheduling", "general_inquiry", "complaint", "follow_up", "emergency", "provider_info", "insurance_inquiry"
6. **key_topics**: Array of 2-5 short topic strings discussed (e.g., ["cardiology appointment", "Dr. Sharma availability", "insurance coverage"])
7. **patient_satisfaction**: Integer 1-5 estimated satisfaction:
   - 5: Very satisfied - issue fully resolved, positive language
   - 4: Satisfied - issue mostly resolved
   - 3: Neutral - basic interaction
   - 2: Dissatisfied - unresolved issues, frustration
   - 1: Very dissatisfied - complaint, anger
8. **escalation_required**: Boolean - true if the conversation indicates need for human follow-up
9. **escalation_reason**: String explaining why escalation is needed (null if not required)
10. **ai_summary**: 2-3 sentence summary of the conversation including outcome and any notable observations

Return ONLY valid JSON, no markdown or extra text.

Transcript:
"""


async def analyze_session(log_id: str, transcript: str, agent_type: str = "voice") -> Optional[Dict]:
    """Analyze a completed session transcript using GPT and store results"""
    if not transcript or not transcript.strip():
        logger.info(f"Skipping analysis for {log_id}: empty transcript")
        return None

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENAI_CHAT_URL,
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": "You are a healthcare call analytics AI. Analyze transcripts and return structured JSON."},
                        {"role": "user", "content": ANALYSIS_PROMPT + transcript}
                    ],
                    "temperature": 0.3,
                    "response_format": {"type": "json_object"}
                }
            )
            response.raise_for_status()
            result = response.json()
            analysis_text = result["choices"][0]["message"]["content"]
            analytics = json.loads(analysis_text)

            # Save to database
            saved = queries.save_call_log_analytics(log_id, analytics)
            if saved:
                logger.info(f"Analytics saved for log {log_id}: sentiment={analytics.get('sentiment_label')}, intent={analytics.get('intent')}")
            else:
                logger.error(f"Failed to save analytics for log {log_id}")

            return analytics

    except Exception as e:
        logger.error(f"Error analyzing session {log_id}: {e}", exc_info=True)
        return None
