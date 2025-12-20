"""
U Rack IT Voice Agent - Streamlit Demo UI

Run with: streamlit run main.py
"""

import asyncio
import uuid

import streamlit as st
from dotenv import load_dotenv

from agents import Runner, SQLiteSession, set_trace_processors
from app_agents.triage_agent import triage_agent

# Optional LangSmith tracing
try:
    from langsmith.wrappers import OpenAIAgentsTracingProcessor
    set_trace_processors([OpenAIAgentsTracingProcessor()])
except ImportError:
    pass

# ---------------------------------------------------------------------
# Boot
# ---------------------------------------------------------------------
load_dotenv()

# Add strict fallback if no tool applies
RULE = (
    "\n\nCRITICAL RULE: If the user's request is NOT about IT support issues "
    "(email, computers, internet, printers, phones, security, tickets, or billing), "
    "reply EXACTLY with: 'I can only help with IT support issues. How can I assist you with your technology today?' "
    "Do not call tools or hand off in that case."
)
if RULE not in triage_agent.instructions:
    triage_agent.instructions += RULE

# ---------------------------------------------------------------------
# Streamlit UI
# ---------------------------------------------------------------------
st.set_page_config(page_title="U Rack IT Support", page_icon="🔧", layout="centered")
st.title("U Rack IT / U Talk.tel Support")
st.caption("AI-powered IT support for email, computers, internet, printers, phones, and security issues.")

# Create (or reuse) a persistent session id for conversation memory
if "session_id" not in st.session_state:
    st.session_state.session_id = f"web-{uuid.uuid4().hex[:8]}"

# Persist chat transcript for on-screen history
if "messages" not in st.session_state:
    st.session_state.messages = [
        {
            "role": "assistant",
            "content": (
                "Thank you for calling U Rack IT. I can help with email, computer, "
                "internet or VPN issues, printers, phones, security concerns, ticket updates, "
                "or billing. You may ask for a technician at any time. How can I help you today?"
            ),
        }
    ]

# Render chat history
chat_container = st.container()
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# Chat input anchored at the bottom
prompt = st.chat_input("Describe your IT issue...")

if prompt:
    prompt = prompt.strip()
    if not prompt:
        st.warning("Please enter a question.")
    else:
        # Display user message immediately
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        session = SQLiteSession(st.session_state.session_id, "conversations.db")

        async def _run():
            return await Runner.run(triage_agent, prompt, session=session)

        # Stream assistant response in chat-style block
        with st.chat_message("assistant"):
            placeholder = st.empty()
            placeholder.markdown("_Checking with IT support..._")
            try:
                result = asyncio.run(_run())
                assistant_reply = result.final_output or "No output."
            except Exception as e:
                assistant_reply = f"Error: {e}"
            placeholder.markdown(assistant_reply)

        st.session_state.messages.append({"role": "assistant", "content": assistant_reply})
