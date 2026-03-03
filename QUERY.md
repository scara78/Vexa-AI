# Query

Send a single prompt to any of the 19 available AI models and get a text response. Supports an optional system prompt for personas and instructions.

```
GET  https://vexa-ai.vercel.app/query
POST https://vexa-ai.vercel.app/query
```

---

## GET

```bash
curl "https://vexa-ai.vercel.app/query?q=What+is+a+black+hole"
```

### Parameters

| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| `q` | yes | — | Your prompt. Also accepted as `query`. |
| `model` | no | first available | Model ID. See [`/models`](./MODELS.md). |
| `system` | no | — | System prompt prepended before your message. Sets persona or instructions. |

```bash
# With model and system prompt
curl "https://vexa-ai.vercel.app/query?q=Hello&model=gemini-3-flash&system=You+are+a+pirate.+Respond+only+in+pirate+speak."
```

---

## POST

```bash
curl -X POST https://vexa-ai.vercel.app/query \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain quantum computing", "model": "deepseek-v3.1"}'
```

### Body fields

| Field | Required | Description |
|-------|----------|-------------|
| `q` / `query` / `prompt` | yes | Your prompt |
| `model` | no | Model ID |
| `system` | no | System prompt — sets persona or instructions |

```bash
# With system prompt
curl -X POST https://vexa-ai.vercel.app/query \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What should I have for dinner?",
    "model": "gpt-5",
    "system": "You are a professional chef who only recommends Italian food."
  }'
```

---

## Response

```json
{
  "success": true,
  "response": "A black hole is a region of spacetime where gravity is so strong that nothing — not even light — can escape once it crosses the event horizon.",
  "model": "toolbaz-v4.5-fast",
  "elapsed_ms": 1243,
  "prompt_chars": 87
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |
| `response` | string | The model's reply |
| `model` | string | Model ID that was used |
| `elapsed_ms` | number | Total round-trip time in milliseconds |
| `prompt_chars` | number | Character count of the full prompt sent (including system prompt if provided) |

---

## System Prompt

The `system` field lets you give the model a persona or standing instructions without including them in every user message.

```bash
curl -X POST https://vexa-ai.vercel.app/query \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is 2 + 2?",
    "system": "You are a dramatic mathematician. Answer every question as if it is the most profound thing you have ever encountered."
  }'
```

The system prompt is prepended to the user prompt before being sent upstream:

```
{system}

{prompt}
```

The combined length of system + prompt must be under 4000 characters.

> For multi-turn conversations with persistent system instructions, use [`/chat`](./CHAT.md) instead.

---

## Examples

### JavaScript

```js
const res = await fetch('https://vexa-ai.vercel.app/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Hello!',
    model: 'gemini-3-flash',
    system: 'You are a helpful assistant. Be concise.'
  })
});
const data = await res.json();
console.log(data.response);
console.log(`${data.elapsed_ms}ms — ${data.prompt_chars} chars`);
```

### Python

```python
import requests

r = requests.post('https://vexa-ai.vercel.app/query', json={
    'prompt': 'What is a neural network?',
    'model': 'deepseek-v3.1',
    'system': 'Explain everything as if to a 10-year-old.'
})
d = r.json()
print(d['response'])
print(f"{d['elapsed_ms']}ms, {d['prompt_chars']} chars sent")
```

---

## Limits

| Limit | Value |
|-------|-------|
| Max combined prompt length | 4000 characters |
| Rate limit | 20 requests / IP / 60s |
| Upstream timeout | 55s |
| Retries | 3 with exponential backoff |

---

## Errors

| Status | Error | Cause |
|--------|-------|-------|
| `400` | `Missing required parameter: q, query, or prompt` | No prompt provided |
| `400` | `Prompt exceeds maximum length of 4000 characters` | Prompt + system too long |
| `400` | `Unknown model 'xyz'` | Invalid model ID — also returns `valid_models` array |
| `429` | `Rate limit exceeded. Try again shortly.` | Too many requests |
| `502` | `Upstream request failed` | toolbaz.com unreachable or errored |
| `500` | `Internal server error` | Unexpected failure |

### Unknown model error

```json
{
  "success": false,
  "error": "Unknown model 'gpt-99'",
  "valid_models": ["toolbaz-v4.5-fast", "deepseek-v3.1", "..."]
}
```