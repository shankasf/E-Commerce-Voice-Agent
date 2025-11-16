"""
Run with: streamlit run main.py
Requirements:
pip install streamlit python-dotenv openai-agents "langsmith[openai-agents]"
"""

import asyncio
import uuid

import streamlit as st
from dotenv import load_dotenv

from agents import Runner, SQLiteSession, set_trace_processors
from langsmith.wrappers import OpenAIAgentsTracingProcessor

from app_agents.triage_agent import triage_agent

# ---------------------------------------------------------------------
# Boot
# ---------------------------------------------------------------------
load_dotenv()  # loads OPENAI_API_KEY, PG_*, LANGSMITH_* from .env

# Optional: attach LangSmith tracing (comment out to disable)
set_trace_processors([OpenAIAgentsTracingProcessor()])

# Add strict fallback if no tool applies
RULE = (
    "\n\nCRITICAL RULE: If the user's request is NOT about general store information, toy products, "
    "admission tickets, party planning, or toy shop order management (purchases, status updates, "
    "payments, refunds), reply EXACTLY with: 'Cannot process this request.' "
    "Do not call tools or hand off in that case."
)
if RULE not in triage_agent.instructions:
    triage_agent.instructions += RULE

# ---------------------------------------------------------------------
# Streamlit UI
# ---------------------------------------------------------------------
st.set_page_config(page_title="Toy Shop Agents", page_icon="TS", layout="centered")
st.title("Toy Shop Multi-Agent Concierge")
st.caption("Ask about toys, admissions, parties, or orders—our specialists will route your request.")

# Create (or reuse) a persistent session id for conversation memory
if "session_id" not in st.session_state:
    st.session_state.session_id = f"web-{uuid.uuid4().hex[:8]}"

# Persist chat transcript for on-screen history
if "messages" not in st.session_state:
    st.session_state.messages = [
        {
            "role": "assistant",
            "content": (
                "Welcome to the Toy Shop concierge! Share what you need—shopping help, party bookings, "
                "admission details, or order support—and I'll connect you with the right specialist."
            ),
        }
    ]

# Render chat history
chat_container = st.container()
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# Chat input anchored at the bottom
prompt = st.chat_input("How can we help today?")

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
            placeholder.markdown("_Checking with the toy experts..._")
            try:
                result = asyncio.run(_run())
                assistant_reply = result.final_output or "No output."
            except Exception as e:
                assistant_reply = f"Error: {e}"
            placeholder.markdown(assistant_reply)

        st.session_state.messages.append({"role": "assistant", "content": assistant_reply})
