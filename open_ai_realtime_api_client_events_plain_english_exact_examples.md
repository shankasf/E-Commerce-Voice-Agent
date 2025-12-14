# Client events (what the OpenAI Realtime WebSocket server accepts)

These are the events your client can send to the Realtime WebSocket server.

---

## session.update

Use this to update the session configuration.

- You can send it anytime.
- You can update any field **except** `voice` and `model`.
- `voice` can be changed **only if** no audio outputs have been produced yet.
- After the server receives `session.update`, it replies with `session.updated` showing the full effective configuration.
- Only fields included in your `session.update` are changed.
- To clear fields:
  - Clear a string field (like `instructions`) by sending an empty string `""`.
  - Clear an array field (like `tools`) by sending an empty array `[]`.
  - Clear an object field (like `turn_detection`) by sending `null`.

Fields
- `event_id` (string, optional): client-generated ID for error handling (errors may echo it back). The `session.updated` event will not include it.
- `session` (object): the session updates. Choose either a realtime session or a transcription session.
- `type` (string): must be `"session.update"`.

Exact example
```json
{
  "type": "session.update",
  "session": {
    "type": "realtime",
    "instructions": "You are a creative assistant that helps with design tasks.",
    "tools": [
      {
        "type": "function",
        "name": "display_color_palette",
        "description": "Call this function when a user asks for a color palette.",
        "parameters": {
          "type": "object",
          "properties": {
            "theme": {
              "type": "string",
              "description": "Description of the theme for the color scheme."
            },
            "colors": {
              "type": "array",
              "description": "Array of five hex color codes based on the theme.",
              "items": {
                "type": "string",
                "description": "Hex color code"
              }
            }
          },
          "required": [
            "theme",
            "colors"
          ]
        }
      }
    ],
    "tool_choice": "auto"
  }
}
```

---

## input_audio_buffer.append

Use this to send audio bytes into the temporary input audio buffer.

- The buffer is temporary storage.
- Later you (or the server, in VAD mode) can commit the buffer to create a new user message item.
- If input audio transcription is enabled, transcription is generated **when the buffer is committed**.
- If VAD (voice activity detection) is enabled, the server uses the buffer to detect speech and decides when to commit.
- If Server VAD is disabled, you must commit manually.
- Noise reduction is applied on writes to the buffer.
- You can send up to **15 MiB** of audio per event.
- The server does **not** send an acknowledgement response for this event.

Fields
- `audio` (string): Base64-encoded audio bytes. Must match the `input_audio_format` configured in the session.
- `event_id` (string, optional): client-generated ID.
- `type` (string): must be `"input_audio_buffer.append"`.

Exact example
```json
{
    "event_id": "event_456",
    "type": "input_audio_buffer.append",
    "audio": "Base64EncodedAudioData"
}
```

---

## input_audio_buffer.commit

Use this to commit the current input audio buffer and create a new user message item in the conversation.

- Errors if the input audio buffer is empty.
- In Server VAD mode, you typically do not need to send this; the server commits automatically.
- Committing triggers input audio transcription (if enabled), but does **not** automatically create a model response.
- Server replies with `input_audio_buffer.committed`.

Fields
- `event_id` (string, optional): client-generated ID.
- `type` (string): must be `"input_audio_buffer.commit"`.

Exact example
```json
{
    "event_id": "event_789",
    "type": "input_audio_buffer.commit"
}
```

---

## input_audio_buffer.clear

Use this to clear (discard) the audio bytes currently in the input audio buffer.

- Server replies with `input_audio_buffer.cleared`.

Fields
- `event_id` (string, optional): client-generated ID.
- `type` (string): must be `"input_audio_buffer.clear"`.

Exact example
```json
{
    "event_id": "event_012",
    "type": "input_audio_buffer.clear"
}
```

---

## conversation.item.create

Use this to add a new item into the conversation context.

- Items can be messages, function calls, and function call responses.
- You can use it to preload a conversation “history” or insert items mid-stream.
- Current limitation: it cannot populate assistant audio messages.
- If successful, server replies with `conversation.item.created`.
- If not successful, server sends an error event.

Fields
- `event_id` (string, optional): client-generated ID.
- `item` (object): the item you are adding.
- `previous_item_id` (string, optional): where to insert the item.
  - If not set: item is appended at the end.
  - If set to `root`: item is inserted at the beginning.
  - If set to an existing item ID: inserts after that item.
  - If the ID can’t be found: error and item is not added.
- `type` (string): must be `"conversation.item.create"`.

Exact example
```json
{
  "type": "conversation.item.create",
  "item": {
    "type": "message",
    "role": "user",
    "content": [
      {
        "type": "input_text",
        "text": "hi"
      }
    ]
  },
  "event_id": "b904fba0-0ec4-40af-8bbb-f908a9b26793",
}
```

---

## conversation.item.retrieve

Use this to fetch the server’s stored representation of a specific conversation item.

- Useful to inspect processed user audio (after noise cancellation and VAD).
- Server replies with `conversation.item.retrieved`.
- If the item doesn’t exist, server replies with an error.

Fields
- `event_id` (string, optional): client-generated ID.
- `item_id` (string): the ID of the item to retrieve.
- `type` (string): must be `"conversation.item.retrieve"`.

Exact example
```json
{
    "event_id": "event_901",
    "type": "conversation.item.retrieve",
    "item_id": "item_003"
}
```

---

## conversation.item.truncate

Use this to truncate (cut) the audio of a previous assistant message.

- The server can generate audio faster than realtime.
- If the user interrupts, you can truncate audio that has been sent to the client but not fully played.
- This keeps the server’s understanding aligned with what the user actually heard.
- Truncation also deletes the server-side text transcript so the context doesn’t include text the user didn’t hear.
- If successful, server replies with `conversation.item.truncated`.

Fields
- `audio_end_ms` (integer): inclusive time (ms) up to which audio remains; anything after is truncated.
  - If greater than actual duration: server returns an error.
- `content_index` (integer): which content part to truncate; set to `0`.
- `event_id` (string, optional): client-generated ID.
- `item_id` (string): ID of the assistant message item to truncate (only assistant message items allowed).
- `type` (string): must be `"conversation.item.truncate"`.

Exact example
```json
{
    "event_id": "event_678",
    "type": "conversation.item.truncate",
    "item_id": "item_002",
    "content_index": 0,
    "audio_end_ms": 1500
}
```

---

## conversation.item.delete

Use this to remove an item from the conversation history.

- Server replies with `conversation.item.deleted`.
- If the item doesn’t exist, server replies with an error.

Fields
- `event_id` (string, optional): client-generated ID.
- `item_id` (string): ID of the item to delete.
- `type` (string): must be `"conversation.item.delete"`.

Exact example
```json
{
    "event_id": "event_901",
    "type": "conversation.item.delete",
    "item_id": "item_003"
}
```

---

## response.create

Use this to tell the server to create a response (start model inference).

- In Server VAD mode, the server can create responses automatically.
- A response includes at least one Item; sometimes two (the second can be a function call).
- By default, produced items are appended to the conversation.
- Server flow includes: `response.created`, then item/content events, and finally `response.done`.

Overrides and out-of-band responses
- `response.create` can include per-response inference settings like `instructions` and `tools`.
  - If set, these override session settings for this response only.
- You can create out-of-band responses that do not write to the default conversation.
  - Set `conversation` to `"none"`.
  - Provide `input` as an array of items (raw items or references to existing items).
- Only one response can write to the default conversation at a time, but multiple out-of-band responses can run in parallel.
- Use `metadata` to tag and differentiate simultaneous responses.

Fields
- `event_id` (string, optional): client-generated ID.
- `response` (object, optional): per-response parameters.
- `type` (string): must be `"response.create"`.

Exact examples
```json
// Trigger a response with the default Conversation and no special parameters
{
  "type": "response.create",
}

// Trigger an out-of-band response that does not write to the default Conversation
{
  "type": "response.create",
  "response": {
    "instructions": "Provide a concise answer.",
    "tools": [], // clear any session tools
    "conversation": "none",
    "output_modalities": ["text"],
    "metadata": {
      "response_purpose": "summarization"
    },
    "input": [
      {
        "type": "item_reference",
        "id": "item_12345",
      },
      {
        "type": "message",
        "role": "user",
        "content": [
          {
            "type": "input_text",
            "text": "Summarize the above message in one sentence."
          }
        ]
      }
    ],
  }
}
```

---

## response.cancel

Use this to cancel a response that is currently in progress.

- Server replies with `response.done` and `response.status=cancelled`.
- If there is no response in progress to cancel, the server returns an error.
- It is safe to call even if nothing is in progress (you’ll just get an error; session remains unaffected).

Fields
- `event_id` (string, optional): client-generated ID.
- `response_id` (string, optional): specific response to cancel; if omitted, cancels the in-progress response in the default conversation.
- `type` (string): must be `"response.cancel"`.

Exact example
```json
{
    "type": "response.cancel"
    "response_id": "resp_12345",
}
```

---

## output_audio_buffer.clear (WebRTC/SIP only)

Use this to immediately cut off the current audio response.

- You should send `response.cancel` first to stop generation of the current response.
- Then send `output_audio_buffer.clear` to stop audio output and force the server to emit `output_audio_buffer.cleared`.

Fields
- `event_id` (string): unique ID of the client event used for error handling.
- `type` (string): must be `"output_audio_buffer.clear"`.

Exact example
```json
{
    "event_id": "optional_client_event_id",
    "type": "output_audio_buffer.clear"
}
```

