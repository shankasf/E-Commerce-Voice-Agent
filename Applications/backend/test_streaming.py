"""
Test script to verify OpenAI Responses API integration
"""

import asyncio
import os
from dotenv import load_dotenv
from llm_service import LLMService

load_dotenv()


async def test_responses_api():
    """Test the Responses API with a simple problem"""
    print("=" * 60)
    print("Testing OpenAI Responses API Integration")
    print("=" * 60)

    # Initialize LLM service
    llm_service = LLMService()
    print(f"\nProvider: {llm_service.provider}")
    print(f"Model: {llm_service.model}")
    print(f"Streaming enabled: {llm_service.enable_streaming}")
    print()

    # Test 1: analyze_problem_and_plan_tools with streaming
    print("Test 1: Analyzing problem with streaming API...")
    print("-" * 60)
    try:
        problem = "Check my system CPU and memory usage"
        print(f"Problem: {problem}")
        print("Calling LLM with streaming enabled...")

        tools = await llm_service.analyze_problem_and_plan_tools(
            problem_description=problem,
            user_role="ai_agent",
            stream=True  # Explicitly enable streaming
        )

        print(f"✓ Success! Received {len(tools)} tool(s)")
        for i, tool in enumerate(tools, 1):
            print(f"  {i}. {tool.get('name')}: {tool.get('reason', 'No reason')}")
    except Exception as e:
        print(f"✗ Error: {e}")

    print()

    # Test 2: analyze_problem_and_plan_tools without streaming
    print("Test 2: Analyzing problem with traditional API...")
    print("-" * 60)
    try:
        problem = "Check my disk space"
        print(f"Problem: {problem}")
        print("Calling LLM with streaming disabled...")

        tools = await llm_service.analyze_problem_and_plan_tools(
            problem_description=problem,
            user_role="ai_agent",
            stream=False  # Explicitly disable streaming
        )

        print(f"✓ Success! Received {len(tools)} tool(s)")
        for i, tool in enumerate(tools, 1):
            print(f"  {i}. {tool.get('name')}: {tool.get('reason', 'No reason')}")
    except Exception as e:
        print(f"✗ Error: {e}")

    print()

    # Test 3: generate_solution_summary with streaming
    print("Test 3: Generating solution summary with streaming API...")
    print("-" * 60)
    try:
        problem = "System was slow"
        tools_executed = [
            {
                "tool": "check_cpu_usage",
                "result": {"status": "success", "output": "CPU usage: 15%"}
            },
            {
                "tool": "check_memory_usage",
                "result": {"status": "success", "output": "Memory usage: 45%"}
            }
        ]
        solution_steps = [
            "✓ check_cpu_usage: CPU usage is normal at 15%",
            "✓ check_memory_usage: Memory usage is normal at 45%"
        ]

        print("Generating summary with streaming enabled...")
        summary = await llm_service.generate_solution_summary(
            problem=problem,
            tools_executed=tools_executed,
            solution_steps=solution_steps,
            stream=True
        )

        print(f"✓ Success! Generated summary:")
        print("-" * 60)
        print(summary)
        print("-" * 60)
    except Exception as e:
        print(f"✗ Error: {e}")

    print()

    # Test 4: Using default config (should use ENABLE_STREAMING from .env)
    print("Test 4: Using default config from .env...")
    print("-" * 60)
    try:
        problem = "Check network status"
        print(f"Problem: {problem}")
        print(f"Using ENABLE_STREAMING config: {llm_service.enable_streaming}")

        tools = await llm_service.analyze_problem_and_plan_tools(
            problem_description=problem,
            user_role="ai_agent"
            # stream parameter not provided, should use config
        )

        print(f"✓ Success! Received {len(tools)} tool(s)")
        for i, tool in enumerate(tools, 1):
            print(f"  {i}. {tool.get('name')}: {tool.get('reason', 'No reason')}")
    except Exception as e:
        print(f"✗ Error: {e}")

    print()
    print("=" * 60)
    print("All tests completed!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_responses_api())
