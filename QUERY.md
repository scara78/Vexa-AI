# Query

Send a single prompt to any available model and get a text response.

```
GET  /query
POST /query
```

All model routing, upstream URLs, and completion functions are sourced from `core.js`.

---

## GET

```bash
curl "/query?q=What+is+a+black+hole"
curl "/query?q=Hello&model=vexa"
```

### Parameters

| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| `q` / `query` | yes | — | Your prompt |
| `model` | no | `vexa` | Model ID. See [/models](./MODELS.md). |

---

## POST

```bash
curl -X POST /query \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain quantum computing", "model": "vexa"}'
```

### Body fields

| Field | Required | Description |
|-------|----------|-------------|
| `q` / `query` / `prompt` | yes | Your prompt |
| `model` | no | Model ID |

---

## Response

```json
{
  "success": true,
  "response": "A black hole is a region of spacetime...",
  "model": "vexa",
  "elapsed_ms": 1243,
  "source": "deepai.org"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |
| `response` | string | Model response text |
| `model` | string | Model used |
| `elapsed_ms` | number | Time to generate |
| `source` | string | Upstream used — `deepai.org`, `toolbaz.com`, `dphn.ai`, `aifreeforever.com`, `pollinations.ai`, or `talkai.info` |

---

## Examples

### JavaScript

```js
const res = await fetch('/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'Hello!', model: 'vexa' })
});
const data = await res.json();
if (data.success) {
  console.log(data.response);
} else {
  console.log('Error:', data.error);
}
```

### Python

```python
import requests
r = requests.post('/query', json={
    'prompt': 'What is a neural network?',
    'model': 'vexa',
})
response_data = r.json()
if response_data.get('success'):
    print(response_data['response'])
else:
    print(f"Error: {response_data.get('error', 'Unknown error')}")
```

---

## Errors

| Status | Error |
|--------|-------|
| `400` | `Missing required parameter: q, query, or prompt` |
| `400` | `Unknown model 'x'` |
| `429` | `Rate limit exceeded. Try again shortly.` |
| `502` | `Upstream request failed` |