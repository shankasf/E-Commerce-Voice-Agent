# OpenAI Responses API Migration

This document describes the migration from OpenAI's Chat Completions API to the new Responses API.

## Overview

The backend has been fully migrated to OpenAI's **Responses API** (`client.responses.create`), replacing the older Chat Completions API (`client.chat.completions.create`). The Responses API is OpenAI's new API primitive that brings added simplicity and powerful agentic capabilities to your integrations.

## Why Migrate to Responses API?

1. **Better Performance with Reasoning Models**: Reasoning models like GPT-5 perform better with the Responses API, showing a 3% improvement in SWE-bench benchmarks
2. **Lower Costs**: Improved cache utilization results in 40-80% cost reduction
3. **Simplified API**: Cleaner interface with `instructions` and `input` parameters instead of message arrays
4. **Better Streaming Support**: Enhanced streaming with structured events
5. **Future-Proof**: This is OpenAI's recommended API for all new projects

## Changes Made

### 1. LLM Service (`llm_service.py`)

- **Migrated to Responses API**: Replaced `client.chat.completions.create()` with `client.responses.create()`
- **Updated parameters**: Now uses `instructions` and `input` instead of `messages` array
- **Updated response handling**: Access output via `response.output_text` instead of `response.choices[0].message.content`
- **Enhanced streaming support**: Uses event-based streaming with `response.output_text.delta` events
- **Configuration option**: `enable_streaming` reads from `ENABLE_STREAMING` environment variable

#### Key Changes:

**Old Chat Completions API:**
```python
response = self.client.chat.completions.create(
    model=self.model,
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ],
    temperature=0.3
)
content = response.choices[0].message.content
```

**New Responses API (Non-Streaming):**
```python
response = self.client.responses.create(
    model=self.model,
    instructions=system_prompt,
    input=user_prompt,
    temperature=0.3
)
content = response.output_text
```

**New Responses API (Streaming):**
```python
stream_response = self.client.responses.create(
    model=self.model,
    instructions=system_prompt,
    input=user_prompt,
    temperature=0.3,
    stream=True
)

# Collect streamed content from events
content = ""
for event in stream_response:
    if hasattr(event, 'type'):
        if event.type == 'response.output_text.delta':
            if hasattr(event, 'delta') and event.delta:
                content += event.delta
        elif event.type == 'response.output_text.done':
            if hasattr(event, 'output_text') and event.output_text:
                content = event.output_text
                break
```

### 2. Agent Files

Updated all agent files that make LLM calls to use the Responses API:

- **`diagnostic_agent.py`**: Migrated to `client.responses.create()` with streaming support
- **`remediation_agent.py`**: Migrated to `client.responses.create()` with streaming support
- **`verification_agent.py`**: No changes needed (doesn't make LLM calls)

All agents now use:
- `client.responses.create()` instead of `client.chat.completions.create()`
- `instructions` and `input` parameters instead of `messages` array
- Event-based streaming with `response.output_text.delta` events

### 3. Configuration (`.env`)

Added new configuration option:

```env
# LLM Streaming Configuration
# Set to "true" to use OpenAI's streaming API (better responsiveness)
# Set to "false" to use traditional completion API
ENABLE_STREAMING=true
```

### 4. Testing

Updated `test_streaming.py` (now testing Responses API) to verify the implementation:
- Tests Responses API with streaming enabled
- Tests Responses API with streaming disabled
- Tests default config usage
- Tests both methods (`analyze_problem_and_plan_tools` and `generate_solution_summary`)
- Verifies event-based streaming works correctly

## How to Use

### Enable Streaming (Default)

Streaming is enabled by default. To use it, simply ensure your `.env` file has:

```env
ENABLE_STREAMING=true
```

### Disable Streaming

To disable streaming and use the traditional API:

```env
ENABLE_STREAMING=false
```

### Programmatic Control

You can also override the config on a per-call basis:

```python
# Force streaming
tools = await llm_service.analyze_problem_and_plan_tools(
    problem_description="Check CPU",
    user_role="ai_agent",
    stream=True  # Explicit override
)

# Force non-streaming
tools = await llm_service.analyze_problem_and_plan_tools(
    problem_description="Check CPU",
    user_role="ai_agent",
    stream=False  # Explicit override
)

# Use config default
tools = await llm_service.analyze_problem_and_plan_tools(
    problem_description="Check CPU",
    user_role="ai_agent"
    # stream parameter omitted, uses ENABLE_STREAMING config
)
```

## Benefits of the Responses API

1. **Improved Model Performance**: 3% better performance on reasoning benchmarks (SWE-bench) when using reasoning models like GPT-5
2. **Cost Reduction**: 40-80% improved cache utilization leads to lower costs
3. **Simpler API**: Cleaner interface with `instructions` and `input` vs complex message arrays
4. **Better Streaming**: Event-based streaming with structured events (`response.output_text.delta`, `response.output_text.done`)
5. **Future-Proof**: OpenAI's recommended API for all new projects
6. **Better responsiveness**: Streaming responses start arriving immediately
7. **Lower perceived latency**: Users see progress sooner

## Backward Compatibility

The implementation is fully backward compatible:
- Existing code continues to work without changes
- Default behavior can be controlled via `.env` configuration
- Both streaming and non-streaming modes are supported
- No breaking changes to method signatures

## Testing

Run the test script to verify the streaming implementation:

```bash
cd backend
python test_streaming.py
```

The test script will:
1. Test streaming enabled
2. Test streaming disabled
3. Test solution summary generation with streaming
4. Test default config usage

## Technical Details

### Responses API vs Chat Completions API

| Feature | Chat Completions API | Responses API |
|---------|---------------------|---------------|
| Method | `client.chat.completions.create()` | `client.responses.create()` |
| Input Format | `messages` array with roles | `instructions` + `input` strings |
| Output Access | `response.choices[0].message.content` | `response.output_text` |
| Streaming Events | `chunk.choices[0].delta.content` | `event.type` with structured events |
| Cache Utilization | Standard | 40-80% better |
| Model Performance | Baseline | 3% better with reasoning models |

### Streaming Event Types

The Responses API uses event-based streaming with structured event types:

```python
for event in stream_response:
    if hasattr(event, 'type'):
        if event.type == 'response.output_text.delta':
            # Partial text delta
            content += event.delta
        elif event.type == 'response.output_text.done':
            # Final complete text
            content = event.output_text
```

Available event types:
- `response.created` - Response object created
- `response.in_progress` - Response generation in progress
- `response.output_text.delta` - Partial text chunk
- `response.output_text.done` - Complete text available
- `response.completed` - Response fully completed
- `response.failed` - Response generation failed

### Performance Considerations

- **Streaming**: Better for real-time responsiveness, slightly more network overhead
- **Non-streaming**: Lower network overhead, but higher perceived latency

For most use cases, streaming provides a better user experience.

## Troubleshooting

### "stream" parameter not working

Make sure you're passing the `stream` parameter correctly:
- `stream=True` for streaming
- `stream=False` for non-streaming
- `stream=None` or omit to use config default

### Streaming not working despite config

Check your `.env` file:
```bash
# Make sure ENABLE_STREAMING is set correctly
ENABLE_STREAMING=true
```

### API errors with streaming

Ensure your OpenAI API key supports streaming (all modern keys do). Check the console output for detailed error messages.

## Migration Checklist

- [x] Update `llm_service.py` to use Responses API (`client.responses.create`)
- [x] Update `diagnostic_agent.py` to use Responses API
- [x] Update `remediation_agent.py` to use Responses API
- [x] Implement event-based streaming support
- [x] Add `ENABLE_STREAMING` configuration to `.env`
- [x] Update test script (`test_streaming.py`) for Responses API
- [x] Verify backward compatibility
- [x] Document all changes in this file

## API Comparison

### Before (Chat Completions API):
```python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What is Python?"}
    ]
)
print(response.choices[0].message.content)
```

### After (Responses API):
```python
response = client.responses.create(
    model="gpt-4o",
    instructions="You are a helpful assistant.",
    input="What is Python?"
)
print(response.output_text)
```

Much simpler and cleaner!

## Future Enhancements

Potential future improvements:
1. **True streaming to client**: Stream responses directly to the frontend via WebSocket
2. **Partial results**: Process and act on partial LLM responses as they arrive
3. **Progress indicators**: Show streaming progress to users
4. **Adaptive streaming**: Automatically enable/disable based on response size
