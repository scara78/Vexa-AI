# Chat

Multi-turn conversation endpoint. Accepts an OpenAI-style `messages` array and handles all context concatenation server-side.

```
POST /chat
```

GET requests to `/chat` return a `405` with usage instructions rather than an error.

---

## Request

```bash
curl -X POST /chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "vexa",
    "messages": [
      { "role": "system",    "content": "You are a helpful assistant. Be concise." },
      { "role": "user",      "content": "What is the speed of light?" },
      { "role": "assistant", "content": "Approximately 299,792,458 metres per second." },
      { "role": "user",      "content": "How long does it take to reach the Moon?" }
    ],
    "stream": true
  }'
```

### Body fields

| Field | Required | Description |
|-------|----------|-------------|
| `messages` | yes | Array of message objects (at least one) |
| `model` | no | Model ID. Defaults to `vexa`. Falls back to `vexa` if the given model is invalid. See [/models](./MODELS.md). |
| `stream` | no | Set to `true` to enable streaming responses. Defaults to `false`. |

### Message object

| Field | Required | Values |
|-------|----------|--------|
| `role` | yes | `system`, `user`, or `assistant` |
| `content` | yes | string |

---

## Response

```json
{
  "success": true,
  "message": { "role": "assistant", "content": "It takes about 1.28 seconds." },
  "model": "vexa",
  "elapsed_ms": 980,
  "prompt_chars": 312
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |
| `message` | object | Assistant reply with `role` and `content` |
| `model` | string | Model used |
| `elapsed_ms` | number | Time to generate |
| `prompt_chars` | number | Total character count of all messages sent |

---

## Streaming Response

When `stream: true` is set, the response is sent as Server-Sent Events (SSE):

```bash
curl -X POST /chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello!"}], "stream": true}' \
  --no-buffer
```

### Streaming format

Each chunk is prefixed with `data: ` and contains JSON in OpenAI SSE format:

```
data: {"choices":[{"delta":{"content":"Hell"},"finish_reason":null}]}
data: {"choices":[{"delta":{"content":"o, W"},"finish_reason":null}]}
data: {"choices":[{"delta":{"content":"orld"},"finish_reason":null}]}
data: {"choices":[{"delta":{},"finish_reason":"stop"}]}
data: [DONE]
```

| Field | Type | Description |
|-------|------|-------------|
| `choices[0].delta.content` | string | Content chunk (up to 4 characters) |
| `choices[0].finish_reason` | string | `null` while streaming, `"stop"` when complete |
| `data: [DONE]` | — | Final marker indicating stream completion |

---

## How Context Works

For Toolbaz-routed models, messages are concatenated into a single prompt via `messagesToPrompt` from `core.js`:

```
[System]: {system content}

User: {first user message}
Assistant: {first assistant message}
User: {second user message}
Assistant:
```

For DeepAI and Pollinations models the full messages array is passed natively. You are responsible for passing the full history each turn.

---

## Examples

### JavaScript (multi-turn loop)

```js
const history = [{ role: 'system', content: 'You are a concise assistant.' }];

async function chat(msg, model = 'vexa') {
  history.push({ role: 'user', content: msg });
  const res = await fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: history })
  });
  const data = await res.json();
  history.push({ role: 'assistant', content: data.message.content });
  return data.message.content;
}
```

### Python

```python
import requests

history = [{'role': 'system', 'content': 'You are a concise assistant.'}]

def chat(msg, model='vexa'):
    history.append({'role': 'user', 'content': msg})
    r = requests.post('/chat', json={'model': model, 'messages': history})
    reply = r.json()['message']['content']
    history.append({'role': 'assistant', 'content': reply})
    return reply
```

---

## Errors

| Status | Error |
|--------|-------|
| `400` | `Missing or empty 'messages' array` |
| `400` | `Too many messages: max is 100` |
| `400` | `messages[N] must be an object` |
| `400` | `messages[N].role must be 'system', 'user', or 'assistant'` |
| `400` | `messages[N].content must be a non-empty string` |
| `400` | `messages[N].content exceeds max length of 32000` |
| `400` | `Total message content exceeds max of 200000 characters` |
| `400` | `At least one message with role 'user' is required` |
| `429` | `Rate limit exceeded. Try again shortly.` |
| `502` | `Upstream request failed: <detail>` |