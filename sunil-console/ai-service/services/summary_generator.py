"""
Issue Summary Generator for URackIT AI Service.

Generates concise summaries of customer issues and troubleshooting steps
for technicians joining device chat sessions.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

from openai import AsyncOpenAI

from config import get_config
from db.device_chat import get_device_chat_db
from db.connection import get_db

logger = logging.getLogger(__name__)


@dataclass
class TroubleshootingStep:
    """A single troubleshooting step taken by the AI agent."""
    step_number: int
    description: str
    action_type: str  # 'question', 'command', 'analysis', 'suggestion'
    outcome: Optional[str] = None
    timestamp: Optional[datetime] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "step_number": self.step_number,
            "description": self.description,
            "action_type": self.action_type,
            "outcome": self.outcome,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }


@dataclass
class CommandExecutionSummary:
    """Summary of a command execution."""
    command: str
    description: str
    status: str
    output_preview: Optional[str] = None
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "command": self.command,
            "description": self.description,
            "status": self.status,
            "output_preview": self.output_preview,
            "error": self.error,
        }


@dataclass
class IssueSummary:
    """Complete summary of an issue for technician handoff."""
    ticket_id: Optional[int]
    issue_description: str
    customer_name: str
    organization_name: str
    device_info: str
    troubleshooting_steps: List[TroubleshootingStep] = field(default_factory=list)
    commands_executed: List[CommandExecutionSummary] = field(default_factory=list)
    current_status: str = "in_progress"
    ai_diagnosis: Optional[str] = None
    ticket_subject: Optional[str] = None
    ticket_priority: Optional[str] = None
    generated_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "ticket_id": self.ticket_id,
            "issue_description": self.issue_description,
            "customer_name": self.customer_name,
            "organization_name": self.organization_name,
            "device_info": self.device_info,
            "troubleshooting_steps": [s.to_dict() for s in self.troubleshooting_steps],
            "commands_executed": [c.to_dict() for c in self.commands_executed],
            "current_status": self.current_status,
            "ai_diagnosis": self.ai_diagnosis,
            "ticket_subject": self.ticket_subject,
            "ticket_priority": self.ticket_priority,
            "generated_at": self.generated_at.isoformat(),
        }


class SummaryGenerator:
    """
    Generates concise issue summaries for technician handoff.

    Extracts:
    - Issue description from initial user messages
    - Troubleshooting steps from AI agent conversation
    - Command execution results
    - AI diagnosis/assessment
    """

    def __init__(self):
        self._chat_db = get_device_chat_db()
        self._db = get_db()
        config = get_config()
        self._openai_client = AsyncOpenAI(api_key=config.openai_api_key)

    async def generate_summary(
        self,
        chat_session_id: str,
        ticket_id: Optional[int] = None,
        use_ai_enhancement: bool = True
    ) -> IssueSummary:
        """
        Generate a comprehensive issue summary.

        Args:
            chat_session_id: The device chat session ID
            ticket_id: Optional ticket ID for additional context
            use_ai_enhancement: Whether to use AI for natural language summary

        Returns:
            IssueSummary with all extracted information
        """
        try:
            logger.info(f"[Summary] generate_summary called with chat_session_id={chat_session_id}, ticket_id={ticket_id}, type(ticket_id)={type(ticket_id)}")

            # Get chat history
            chat_history = await self._chat_db.get_chat_history(
                chat_session_id=chat_session_id,
                limit=100
            )

            # Get command execution history
            execution_history = await self._chat_db.get_execution_history(
                chat_session_id=chat_session_id,
                limit=50
            )

            # Get ticket and customer context
            context = await self._get_ticket_context(ticket_id, chat_session_id)
            logger.info(f"[Summary] Context retrieved: {context}")

            # Build issue description from ticket details (prioritize ticket over chat)
            # This ensures "Problem Reported" shows the ticket subject and description
            ticket_subject = context.get("ticket_subject", "")
            ticket_description = context.get("ticket_description", "")
            logger.info(f"[Summary] ticket_subject='{ticket_subject}', ticket_description='{ticket_description}'")

            if ticket_subject and ticket_description:
                issue_description = f"{ticket_subject}\n\n{ticket_description}"
            elif ticket_subject:
                issue_description = ticket_subject
            elif ticket_description:
                issue_description = ticket_description
            else:
                # Fallback to extracting from chat only if no ticket info
                issue_description = self._extract_issue_description(chat_history)

            # Extract troubleshooting steps
            troubleshooting_steps = self._extract_troubleshooting_steps(chat_history)

            # Summarize command executions
            commands_executed = self._summarize_commands(execution_history)

            # Determine current status
            current_status = self._determine_status(chat_history, execution_history)

            # Generate AI diagnosis if enabled - pass ticket info for better context
            ai_diagnosis = None
            if use_ai_enhancement:
                ai_diagnosis = await self._generate_ai_diagnosis(
                    chat_history,
                    execution_history,
                    context
                )

            return IssueSummary(
                ticket_id=ticket_id,
                issue_description=issue_description,
                customer_name=context.get("customer_name", "Unknown"),
                organization_name=context.get("organization_name", "Unknown"),
                device_info=context.get("device_info", "Unknown device"),
                troubleshooting_steps=troubleshooting_steps,
                commands_executed=commands_executed,
                current_status=current_status,
                ai_diagnosis=ai_diagnosis,
                ticket_subject=context.get("ticket_subject"),
                ticket_priority=context.get("ticket_priority"),
            )

        except Exception as e:
            logger.error(f"Error generating summary: {e}", exc_info=True)
            # Return minimal summary on error
            return IssueSummary(
                ticket_id=ticket_id,
                issue_description="Unable to extract issue description",
                customer_name="Unknown",
                organization_name="Unknown",
                device_info="Unknown",
                current_status="error",
            )

    async def _get_ticket_context(
        self,
        ticket_id: Optional[int],
        chat_session_id: str
    ) -> Dict[str, Any]:
        """Get ticket and customer context from database."""
        context = {
            "customer_name": "Unknown",
            "organization_name": "Unknown",
            "device_info": "Unknown device",
        }

        try:
            # Get device session info
            session = self._db.select(
                "device_sessions",
                filters={"chat_session_id": f"eq.{chat_session_id}"},
                limit=1
            )

            if session:
                session_data = session[0]

                # Get organization
                org_id = session_data.get("organization_id")
                if org_id:
                    org = self._db.select(
                        "organizations",
                        filters={"organization_id": f"eq.{org_id}"},
                        limit=1
                    )
                    if org:
                        context["organization_name"] = org[0].get("name", "Unknown")

                # Get user/contact
                user_id = session_data.get("user_id")
                if user_id:
                    contact = self._db.select(
                        "contacts",
                        filters={"contact_id": f"eq.{user_id}"},
                        limit=1
                    )
                    if contact:
                        context["customer_name"] = contact[0].get("full_name", "Unknown")

                # Get device info
                device_id = session_data.get("device_id")
                if device_id:
                    device = self._db.select(
                        "devices",
                        filters={"device_id": f"eq.{device_id}"},
                        limit=1
                    )
                    if device:
                        # Use asset_name (the actual column in the devices table)
                        device_name = device[0].get("asset_name") or device[0].get("device_name", "Unknown")
                        host_name = device[0].get("host_name", "")
                        context["device_info"] = f"{device_name}" + (f" ({host_name})" if host_name else "")

            # Get additional context from ticket if available
            if ticket_id:
                logger.info(f"[Summary] Fetching ticket context for ticket_id={ticket_id}")
                try:
                    # Simple query first - get basic ticket info
                    ticket = self._db.select(
                        "support_tickets",
                        filters={"ticket_id": f"eq.{ticket_id}"},
                        limit=1
                    )
                    logger.info(f"[Summary] Ticket query result: {ticket}")

                    if ticket and len(ticket) > 0:
                        ticket_data = ticket[0]
                        context["ticket_subject"] = ticket_data.get("subject", "")
                        context["ticket_description"] = ticket_data.get("description", "")
                        context["ticket_priority_id"] = ticket_data.get("priority_id")

                        logger.info(f"[Summary] Ticket subject: {context.get('ticket_subject')}")
                        logger.info(f"[Summary] Ticket description: {context.get('ticket_description')}")

                        # Get priority name separately
                        priority_id = ticket_data.get("priority_id")
                        if priority_id:
                            priority = self._db.select(
                                "priorities",
                                filters={"priority_id": f"eq.{priority_id}"},
                                limit=1
                            )
                            if priority:
                                context["ticket_priority"] = priority[0].get("name", "Unknown")
                    else:
                        logger.warning(f"[Summary] No ticket found for ticket_id={ticket_id}")
                except Exception as ticket_err:
                    logger.error(f"[Summary] Error fetching ticket: {ticket_err}")

        except Exception as e:
            logger.error(f"Error getting ticket context: {e}", exc_info=True)

        logger.info(f"[Summary] Final context being returned: ticket_subject='{context.get('ticket_subject', '')}', ticket_description='{context.get('ticket_description', '')}'")
        return context

    def _extract_issue_description(self, chat_history: List[Dict]) -> str:
        """Extract the main issue from user messages."""
        user_messages = [
            msg for msg in chat_history
            if msg.get("sender_type") == "user"
        ]

        if not user_messages:
            return "No issue description available"

        # Get first few user messages to understand the problem
        issue_messages = user_messages[:3]

        # Combine and truncate
        combined = " ".join([msg.get("content", "") for msg in issue_messages])

        # Truncate to reasonable length
        if len(combined) > 300:
            combined = combined[:297] + "..."

        return combined if combined.strip() else "No issue description available"

    def _extract_troubleshooting_steps(
        self,
        chat_history: List[Dict]
    ) -> List[TroubleshootingStep]:
        """Extract troubleshooting steps from AI agent messages."""
        steps = []
        step_number = 1

        for i, msg in enumerate(chat_history):
            sender_type = msg.get("sender_type", "")
            content = msg.get("content", "")
            timestamp = msg.get("message_time")

            # Skip non-AI messages
            if sender_type != "ai_agent":
                continue

            # Determine action type based on content
            action_type = self._classify_message_action(content)

            # Skip greetings and simple acknowledgments
            if action_type == "greeting":
                continue

            # Get outcome from next user message if available
            outcome = None
            for j in range(i + 1, min(i + 3, len(chat_history))):
                if chat_history[j].get("sender_type") == "user":
                    user_response = chat_history[j].get("content", "")
                    if len(user_response) < 200:
                        outcome = user_response
                    break

            # Create step with truncated description
            description = content[:200] + "..." if len(content) > 200 else content

            steps.append(TroubleshootingStep(
                step_number=step_number,
                description=description,
                action_type=action_type,
                outcome=outcome,
                timestamp=datetime.fromisoformat(timestamp) if timestamp else None,
            ))
            step_number += 1

            # Limit to 10 steps for readability
            if step_number > 10:
                break

        return steps

    def _classify_message_action(self, content: str) -> str:
        """Classify the type of action in an AI message."""
        content_lower = content.lower()

        # Check for greetings
        greeting_phrases = ["hello", "hi there", "welcome", "how can i help", "good morning", "good afternoon"]
        if any(phrase in content_lower for phrase in greeting_phrases) and len(content) < 100:
            return "greeting"

        # Check for questions
        if "?" in content:
            return "question"

        # Check for command-related
        command_phrases = ["run", "execute", "check", "let me", "running", "checking"]
        if any(phrase in content_lower for phrase in command_phrases):
            return "command"

        # Check for suggestions
        suggestion_phrases = ["try", "suggest", "recommend", "could you", "please"]
        if any(phrase in content_lower for phrase in suggestion_phrases):
            return "suggestion"

        # Default to analysis
        return "analysis"

    def _summarize_commands(
        self,
        execution_history: List[Dict]
    ) -> List[CommandExecutionSummary]:
        """Summarize command executions."""
        summaries = []

        for exec_data in execution_history:
            command = exec_data.get("command", "")
            description = exec_data.get("description", "")
            status = exec_data.get("status", "unknown")
            output = exec_data.get("output", "")
            error = exec_data.get("error", "")

            # Create output preview (truncated)
            output_preview = None
            if output:
                output_preview = output[:200] + "..." if len(output) > 200 else output

            summaries.append(CommandExecutionSummary(
                command=command,
                description=description,
                status=status,
                output_preview=output_preview,
                error=error if error else None,
            ))

        return summaries

    def _determine_status(
        self,
        chat_history: List[Dict],
        execution_history: List[Dict]
    ) -> str:
        """Determine the current status of the troubleshooting session."""
        # Check if there are any pending commands
        pending_commands = [
            e for e in execution_history
            if e.get("status") in ["pending", "running"]
        ]
        if pending_commands:
            return "awaiting_command_result"

        # Check last message
        if chat_history:
            last_msg = chat_history[-1]
            last_sender = last_msg.get("sender_type", "")

            if last_sender == "ai_agent":
                # AI sent last message, waiting for user
                return "awaiting_user_response"
            elif last_sender == "user":
                # User sent last message, AI should respond
                return "in_progress"

        return "in_progress"

    async def _generate_ai_diagnosis(
        self,
        chat_history: List[Dict],
        execution_history: List[Dict],
        context: Dict[str, Any]
    ) -> Optional[str]:
        """Use AI to generate a natural language diagnosis with next steps."""
        try:
            # Get ticket details
            ticket_subject = context.get("ticket_subject", "")
            ticket_description = context.get("ticket_description", "")
            ticket_priority = context.get("ticket_priority", "")

            # Format chat history for prompt
            chat_text = self._format_chat_for_prompt(chat_history[-20:]) if chat_history else "No conversation history available."

            # Format command results
            command_text = self._format_commands_for_prompt(execution_history[-10:]) if execution_history else ""

            prompt = f"""You are a senior IT support technician reviewing a ticket before taking over from an AI agent.
Analyze the ticket details and conversation to provide a brief assessment and recommended next steps.

=== TICKET INFORMATION ===
Ticket Subject: {ticket_subject or 'Not provided'}
Ticket Description: {ticket_description or 'Not provided'}
Priority: {ticket_priority or 'Not specified'}

=== CUSTOMER DETAILS ===
Customer: {context.get('customer_name', 'Unknown')}
Organization: {context.get('organization_name', 'Unknown')}
Device: {context.get('device_info', 'Unknown')}

=== AI CONVERSATION SUMMARY ===
{chat_text}

=== COMMANDS EXECUTED ===
{command_text if command_text else 'No diagnostic commands have been executed yet.'}

=== YOUR TASK ===
Provide a concise technician handoff summary that includes:

1. **Issue Summary**: Briefly describe the reported problem based on the ticket details (1-2 sentences)
2. **What's Been Tried**: List key troubleshooting steps already attempted by the AI agent
3. **Recommended Next Steps**: Provide 2-3 specific, actionable steps the technician should take next

Format your response clearly with these sections. Keep it brief and actionable."""

            response = await self._openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a senior IT support technician providing handoff summaries. Be concise, technical, and actionable. Focus on what the technician needs to know to resolve the issue quickly."
                    },
                    {"role": "user", "content": prompt}
                ],
                max_tokens=350,
                temperature=0.3,
            )

            return response.choices[0].message.content

        except Exception as e:
            logger.error(f"Error generating AI diagnosis: {e}")
            return None

    def _format_chat_for_prompt(self, chat_history: List[Dict]) -> str:
        """Format chat history for AI prompt."""
        lines = []
        for msg in chat_history:
            sender = msg.get("sender_type", "unknown")
            content = msg.get("content", "")

            # Map sender types to readable names
            sender_map = {
                "user": "Customer",
                "ai_agent": "AI",
                "human_agent": "Technician",
                "system": "System"
            }
            sender_name = sender_map.get(sender, sender)

            # Truncate long messages
            if len(content) > 300:
                content = content[:297] + "..."

            lines.append(f"{sender_name}: {content}")

        return "\n".join(lines)

    def _format_commands_for_prompt(self, execution_history: List[Dict]) -> str:
        """Format command history for AI prompt."""
        if not execution_history:
            return ""

        lines = []
        for exec_data in execution_history:
            command = exec_data.get("command", "")
            status = exec_data.get("status", "unknown")
            output = exec_data.get("output", "")
            error = exec_data.get("error", "")

            line = f"$ {command} [{status}]"
            if output:
                output_preview = output[:100] + "..." if len(output) > 100 else output
                line += f"\n  Output: {output_preview}"
            if error:
                line += f"\n  Error: {error}"

            lines.append(line)

        return "\n".join(lines)


# Singleton instance
_summary_generator: Optional[SummaryGenerator] = None


def get_summary_generator() -> SummaryGenerator:
    """Get the singleton SummaryGenerator instance."""
    global _summary_generator
    if _summary_generator is None:
        _summary_generator = SummaryGenerator()
    return _summary_generator
