# Models

```
GET https://vexa-ai.vercel.app/models
```

Returns all available text models scraped live from toolbaz.com, plus the top image models from Stable Horde. Cached for 5 minutes per serverless instance.

---

## Response

```json
{
  "success": true,
  "default": "toolbaz-v4.5-fast",
  "models": {
    "toolbaz-v4.5-fast": {
      "label": "ToolBaz v4.5 Fast",
      "provider": "ToolBaz",
      "speed": 250,
      "quality": 90
    },
    "deepseek-v3.1": {
      "label": "DeepSeek V3.1",
      "provider": "DeepSeek",
      "speed": 295,
      "quality": 80
    }
  },
  "image_models": [
    { "name": "Deliberate", "count": 42, "queued": 5 },
    { "name": "AlbedoBase XL 3.1", "count": 38, "queued": 2 },
    { "name": "Dreamshaper", "count": 31, "queued": 8 }
  ]
}
```

### Text model fields

| Field | Type | Description |
|-------|------|-------------|
| `label` | string | Human-readable display name |
| `provider` | string | Company or team behind the model |
| `speed` | number | Words per second (scraped from toolbaz) |
| `quality` | number | Quality score 0–100 (scraped from toolbaz) |

### Image model fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Exact model name — pass this to `/image?model=` or `/image` POST body |
| `count` | number | Number of active workers serving this model right now |
| `queued` | number | Jobs currently queued for this model |

---

## Text Models

Model IDs are scraped live — always use `/models` for the authoritative list. Approximate list as of last update:

| Model ID | Provider | Quality |
|----------|----------|---------|
| `toolbaz-v4.5-fast` | ToolBaz | 90 |
| `gpt-5.2` | OpenAI | 92 |
| `gemini-3-flash` | Google | 94 |
| `gemini-2.5-pro` | Google | 84 |
| `gemini-2.5-flash` | Google | 79 |
| `claude-sonnet-4` | Anthropic | 90 |
| `deepseek-v3.1` | DeepSeek | 80 |
| `deepseek-v3` | DeepSeek | 78 |
| `deepseek-r1-distill` | DeepSeek | 70 |
| `gpt-5` | OpenAI | 85 |
| `gpt-oss-120b` | OpenAI | 79 |
| `o3-mini` | OpenAI | 85 |
| `gpt-4o-latest` | OpenAI | 80 |
| `grok-4-fast` | xAI | 82 |
| `toolbaz-v4` | ToolBaz | 82 |
| `llama-4-maverick` | Meta | 82 |
| `L3-70B-Euryale-v2.1` | HuggingFace | 75 |
| `midnight-rose` | HuggingFace | 72 |
| `unfiltered-x-8x22b` | HuggingFace | 76 |

> This table may go stale. Use `/models` for live data.

---

## Image Models

Image models are fetched live from Stable Horde, sorted by active worker count. Models with more workers have shorter queue times. `Deliberate` is used as the default.

Pass the exact `name` string to `/image?model=` or the `model` field in a POST body.

> If you pass a model name with no available workers (`count: 0`), the `/image` request fails immediately with a `502` rather than waiting in queue. Always check `count` before choosing a model.

---

## Caching

Both text and image model lists are cached for **5 minutes** per serverless instance. Vercel may spin up multiple instances so different requests may see slightly different cached states.

---

## Errors

```json
{ "success": false, "error": "Failed to fetch models" }
```

| Status | Cause |
|--------|-------|
| `502` | toolbaz.com unreachable or returned unexpected HTML |