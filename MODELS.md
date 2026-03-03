# Models

```
GET https://vexa-ai.vercel.app/models
```

Returns all available text models fetched live from Pollinations.AI, and live image models from Stable Horde. Cached for 5 minutes per serverless instance.

---

## Response

```json
{
  "success": true,
  "default": "openai",
  "models": {
    "openai-fast": {
      "label": "GPT-OSS 20B Reasoning LLM (OVH)",
      "provider": "OpenAI"
    },
    "openai": {
      "label": "GPT-4o",
      "provider": "OpenAI"
    },
    "llama": {
      "label": "Llama 3",
      "provider": "Meta"
    }
  },
  "image_models": [
    { "name": "stable_diffusion", "count": 6 },
    { "name": "Deliberate",       "count": 4 },
    { "name": "Dreamshaper",      "count": 3 }
  ]
}
```

---

## Text Models

Text models are fetched **fully dynamically** from the live Pollinations.AI endpoint — there is no hardcoded list. The set of available models will vary over time as Pollinations adds or removes them.

Use `GET /models` to discover what's currently available before making requests to `/query` or `/chat`. If a requested model ID is not in the live list, the API falls back to the default model.

### Text model fields

| Field | Type | Description |
|-------|------|-------------|
| `label` | string | Human-readable display name or description |
| `provider` | string | Company behind the model (inferred from model ID if not provided by upstream) |

### Default model

The `default` field in the response contains the model ID that will be used when no `model` param is specified. This is also sourced dynamically from Pollinations and may change.

---

## Image Models

Fetched live from Stable Horde, filtered to models with at least 1 active worker, sorted by worker count descending. Top 30 returned.

Pass the exact `name` string to `/image?model=` or the `model` POST body field.

### Image model fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Exact model name to pass to `/image` |
| `count` | number | Active workers serving this model right now |

> **Worker availability:** All models in the response have `count >= 1`. Higher count means more capacity and faster responses.

---

## Caching

Both text and image model lists are cached for **5 minutes** per serverless instance. Vercel may spin up multiple instances so cache state can vary slightly between requests.

---

## Errors

The `/models` endpoint never returns an error response. If upstream sources are unreachable:
- Text models fall back to the last successful cache, or `{}` on a cold start
- Image models fall back to `[]`

```json
{ "success": true, "default": "openai", "models": {}, "image_models": [] }
```