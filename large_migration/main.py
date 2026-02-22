"""
Migration Multi-Agent System - Main Entry Point

A multi-agent workflow for incrementally producing migration mapping documents
and dbt SQL code updates for CLM to AMS (Snowflake) migrations.
"""

import asyncio
import os
import uuid
import streamlit as st
from datetime import datetime
from dotenv import load_dotenv
from agents import Runner

# Load environment variables
load_dotenv()

# Import agents and memory
from app_agents import triage_agent
from memory import create_session
from db.connection import init_database
from output.output_manager import (
    save_conversation_log,
    save_migration_summary,
    list_output_files,
    OUTPUT_DIR
)
from pathlib import Path
from utils.logger import get_logger, app_logger

# Input folder for user files
INPUT_DIR = Path(__file__).parent / "input"

# Get logger instance
logger = get_logger()

# Optional: LangSmith tracing
if os.getenv("LANGSMITH_API_KEY"):
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_PROJECT"] = os.getenv("LANGSMITH_PROJECT", "migration-agent")

# Safety rule to append to triage agent instructions
SAFETY_RULE = """

CRITICAL RULE:
- Only use the tools and capabilities provided to each specialist agent
- Do not attempt to perform actions outside the defined workflow
- If a request cannot be handled by any agent, inform the user and ask for clarification
- Always explain which agent will handle a request before handing off
"""

# Append safety rule to triage agent
triage_agent.instructions += SAFETY_RULE


def initialize_session():
    """Initialize Streamlit session state."""
    if "session_id" not in st.session_state:
        st.session_state.session_id = str(uuid.uuid4())

    if "messages" not in st.session_state:
        st.session_state.messages = []

    if "db_initialized" not in st.session_state:
        try:
            init_database()
            st.session_state.db_initialized = True
        except Exception as e:
            st.error(f"Failed to initialize database: {e}")
            st.session_state.db_initialized = False

    if "current_field" not in st.session_state:
        st.session_state.current_field = None


async def process_message(user_input: str) -> str:
    """
    Process a user message through the agent system.

    Args:
        user_input: The user's message

    Returns:
        The agent's response
    """
    logger.info("Processing user message", user_input[:50] + "..." if len(user_input) > 50 else user_input)
    logger.agent("Starting Triage Agent")

    session = create_session(st.session_state.session_id)

    try:
        result = await Runner.run(
            triage_agent,
            user_input,
            session=session
        )
        logger.success("Response generated")
        return result.final_output
    except Exception as e:
        logger.error(f"Processing failed: {str(e)}")
        raise


def render_sidebar():
    """Render the sidebar with session info and actions."""
    with st.sidebar:
        st.header("Session Info")
        st.text(f"Session ID: {st.session_state.session_id[:8]}...")
        st.text(f"Messages: {len(st.session_state.messages)}")

        if st.button("New Session", use_container_width=True):
            # Save current conversation before starting new
            if st.session_state.messages:
                save_conversation_log(
                    st.session_state.session_id,
                    st.session_state.messages
                )
            st.session_state.session_id = str(uuid.uuid4())
            st.session_state.messages = []
            st.session_state.current_field = None
            st.rerun()

        st.divider()

        # Field input for tracking
        st.header("Current Migration")
        field_name = st.text_input(
            "Field Name",
            value=st.session_state.current_field or "",
            placeholder="e.g., supplier_performance_reporting"
        )
        if field_name != st.session_state.current_field:
            st.session_state.current_field = field_name

        st.divider()

        # Quick Actions
        st.header("Quick Actions")

        col1, col2 = st.columns(2)

        with col1:
            if st.button("List Files", use_container_width=True):
                st.session_state.messages.append({
                    "role": "user",
                    "content": "List the available input files"
                })
                st.rerun()

            if st.button("Load Docs", use_container_width=True):
                st.session_state.messages.append({
                    "role": "user",
                    "content": "Help me load documents from the input folder"
                })
                st.rerun()

            if st.button("Parse Spec", use_container_width=True):
                field = st.session_state.current_field or "the new field"
                st.session_state.messages.append({
                    "role": "user",
                    "content": f"Parse the field specification for {field}"
                })
                st.rerun()

            if st.button("Plan SQL", use_container_width=True):
                field = st.session_state.current_field or "the new field"
                st.session_state.messages.append({
                    "role": "user",
                    "content": f"Plan the dbt modifications for {field}"
                })
                st.rerun()

        with col2:
            if st.button("Analyze dbt", use_container_width=True):
                st.session_state.messages.append({
                    "role": "user",
                    "content": "Analyze the loaded dbt models"
                })
                st.rerun()

            if st.button("Generate SQL", use_container_width=True):
                field = st.session_state.current_field or "the new field"
                st.session_state.messages.append({
                    "role": "user",
                    "content": f"Generate the SQL code for {field}"
                })
                st.rerun()

            if st.button("Validate", use_container_width=True):
                field = st.session_state.current_field or "the new field"
                st.session_state.messages.append({
                    "role": "user",
                    "content": f"Validate the migration for {field}"
                })
                st.rerun()

        st.divider()

        # Input Files
        st.header("Input Files")
        if INPUT_DIR.exists():
            input_files = [f.name for f in INPUT_DIR.iterdir() if f.is_file() and not f.name.startswith('.')]
            if input_files:
                for f in sorted(input_files)[:10]:
                    st.text(f"  {f[:35]}")
                if len(input_files) > 10:
                    st.text(f"  ... and {len(input_files) - 10} more")
            else:
                st.text("No input files yet")
                st.caption("Add files to input/ folder")
        else:
            st.text("Input folder not found")

        st.divider()

        # Output Files
        st.header("Output Files")
        st.caption("Files saved to: output/")

        # Quick action to list outputs
        if st.button("Show All Outputs", use_container_width=True):
            st.session_state.messages.append({
                "role": "user",
                "content": "List all output files"
            })
            st.rerun()

        output_tabs = st.tabs(["SQL", "Diffs", "Reports", "Tests", "Maps"])

        with output_tabs[0]:
            sql_files = list_output_files("sql")
            if sql_files:
                for f in sql_files[:5]:
                    st.text(f["name"][:28])
            else:
                st.text("No SQL files yet")

        with output_tabs[1]:
            diff_files = list_output_files("diffs")
            if diff_files:
                for f in diff_files[:5]:
                    st.text(f["name"][:28])
            else:
                st.text("No diff files yet")

        with output_tabs[2]:
            report_files = list_output_files("reports")
            if report_files:
                for f in report_files[:5]:
                    st.text(f["name"][:28])
            else:
                st.text("No reports yet")

        with output_tabs[3]:
            test_files = list_output_files("tests")
            if test_files:
                for f in test_files[:5]:
                    st.text(f["name"][:28])
            else:
                st.text("No test files yet")

        with output_tabs[4]:
            mapping_files = list_output_files("mappings")
            if mapping_files:
                for f in mapping_files[:5]:
                    st.text(f["name"][:28])
            else:
                st.text("No mapping files yet")

        st.divider()

        # Activity Log Section
        st.header("Activity Log")
        log_container = st.container()
        with log_container:
            log_text = logger.format_for_display(20)
            st.code(log_text, language=None)

        col1, col2 = st.columns(2)
        with col1:
            if st.button("Refresh", use_container_width=True, key="refresh_logs"):
                st.rerun()
        with col2:
            if st.button("Clear", use_container_width=True, key="clear_logs"):
                logger.clear()
                st.rerun()

        st.divider()

        # Save conversation button
        if st.button("Save Conversation", use_container_width=True):
            if st.session_state.messages:
                filepath = save_conversation_log(
                    st.session_state.session_id,
                    st.session_state.messages
                )
                st.success(f"Saved to: {os.path.basename(filepath)}")

        # Export summary button
        if st.button("Export Summary", use_container_width=True):
            if st.session_state.current_field:
                summary = {
                    "field_name": st.session_state.current_field,
                    "session_id": st.session_state.session_id,
                    "message_count": len(st.session_state.messages),
                    "conversation": st.session_state.messages
                }
                filepath = save_migration_summary(
                    st.session_state.current_field,
                    summary
                )
                st.success(f"Saved to: {os.path.basename(filepath)}")
            else:
                st.warning("Set a field name first")


def render_main_content():
    """Render the main chat interface."""
    st.title("CLM to AMS Migration Agent")

    # Info expander
    with st.expander("About this tool", expanded=False):
        st.markdown("""
        This multi-agent system helps you migrate fields from CLM to AMS (Snowflake) using dbt.

        **Getting Started:**
        1. Place your input files in the `input/` folder:
           - Vendor templates (CSV, Excel, or text)
           - Mapping documents
           - dbt model SQL files
        2. Ask the chatbot to list or load your files
        3. Ask questions about your migration

        **Workflow:**
        1. **Load Documents** - Load files from the input folder
        2. **Parse Specifications** - Extract field requirements from vendor template
        3. **Extract Mappings** - Document source-to-target field mappings
        4. **Plan Changes** - Analyze dbt models and plan modifications
        5. **Generate SQL** - Create SQL code for prep and final layers
        6. **Validate** - Check all requirements are met
        7. **Generate Tests** - Create dbt tests for the new field

        **Available Agents:**
        - Intake Agent - List input files, document loading
        - Schema Compliance Agent - Template parsing
        - Mapping Extraction Agent - Source mapping
        - dbt Code Planner Agent - Change planning
        - dbt Patch Generator Agent - SQL generation
        - Validator Agent - Validation
        - Regression Test Agent - Test generation
        """)

    # Display chat messages
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    # Chat input
    if user_input := st.chat_input("Ask about your migration..."):
        # Add user message
        st.session_state.messages.append({
            "role": "user",
            "content": user_input,
            "timestamp": datetime.now().isoformat()
        })

        with st.chat_message("user"):
            st.markdown(user_input)

        # Process and get response
        with st.chat_message("assistant"):
            # Show status container
            status_container = st.empty()
            status_container.info("🔄 Processing your request...")

            try:
                response = asyncio.run(process_message(user_input))
                status_container.empty()  # Clear the status
                st.markdown(response)
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": response,
                    "timestamp": datetime.now().isoformat()
                })
            except Exception as e:
                status_container.empty()
                error_msg = f"Error processing request: {str(e)}"
                st.error(error_msg)
                logger.error("Request failed", str(e))
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": error_msg,
                    "timestamp": datetime.now().isoformat()
                })


def main():
    """Main Streamlit application."""
    st.set_page_config(
        page_title="Migration Agent System",
        page_icon="🔄",
        layout="wide",
        initial_sidebar_state="expanded"
    )

    # Custom CSS
    st.markdown("""
        <style>
        .stChat {
            max-height: 600px;
            overflow-y: auto;
        }
        .stButton button {
            font-size: 0.8rem;
        }
        </style>
    """, unsafe_allow_html=True)

    # Initialize session
    initialize_session()

    # Render components
    render_sidebar()
    render_main_content()


if __name__ == "__main__":
    main()
