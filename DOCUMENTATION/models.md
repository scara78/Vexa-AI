# /models

Returns available text and image models, grouped by provider, along with system defaults.

**Method:** `GET`

---

## Parameters

| Name | Default | Description |
|------|---------|-------------|
| `type` | — | Filter by `text` or `image`. Omit for both |
| `details` | `false` | Include per-model provider, speed, quality, and enabled status |

---

## Response

```json
{
  "success": true,
  "defaults": {
    "text": "vexa",
    "image": "hd",
    "image_preference": "speed"
  },
  "counts": {
    "text": 15,
    "image": 5
  },
  "text_models": ["vexa", "gpt-4.1-nano", "..."],
  "text_models_by_provider": {
    "DeepAI": [
      { "name": "vexa", "label": "Vexa", "provider": "DeepAI", "description": "..." }
    ],
    "TalkAI": [
      { "name": "...", "label": "...", "provider": "TalkAI", "description": "..." }
    ],
    "Toolbaz": [
      { "name": "...", "label": "...", "provider": "OpenAI", "description": "..." }
    ]
  },
  "image_models": ["hd", "flux", "turbo-img", "kontext", "seedream", "nanobanana"],
  "valid_image_models": "hd, flux, turbo-img, kontext, seedream, nanobanana"
}
```

> **Note:** The `text_models_by_provider` object always contains the keys `DeepAI`, `TalkAI`, and `Toolbaz`. Models from Pollinations, AIFree, and other providers appear inside `Toolbaz` unless they are DeepAI- or TalkAI-sourced. Use the individual model's `provider` field (not the bucket key) to determine the actual upstream provider.

When `details=true`, a `model_status` object is also included:

```json
{
  "model_status": {
    "vexa":   { "enabled": true },
    "hd":     { "enabled": true, "type": "image" },
    "flux":   { "enabled": true, "type": "image" }
  }
}
```

---

## Filtering

```bash
# Text models only
curl "https://vexa-ai.pages.dev/models?type=text"

# Image models only
curl "https://vexa-ai.pages.dev/models?type=image"

# Full detail per model
curl "https://vexa-ai.pages.dev/models?details=true"
```

---

## How Models Are Discovered

Text models are scraped from upstream providers at runtime and cached in memory for 5 minutes. On each refresh:

1. Models are fetched from each enabled provider (DeepAI, TalkAI, Toolbaz, AIFree)
2. Results are merged — DeepAI and TalkAI models are stored under their own keys; all others fall into the Toolbaz bucket
3. Pollinations text models are merged in from a static list in `config.js`
4. Models from disabled providers are excluded from the response

Image models are static — defined in `config.js` and fixed per deploy.

Always query `/models` for the live list. Do not hardcode model names.

---

## Conversation History Support

Provider behaviour when receiving the `messages` array from `/chat`:

| Provider | Full history | System prompt | Notes |
|----------|:---:|:---:|-------|
| DeepAI | ✅ | ⚠️ | `system` role is coerced to `user` internally |
| Pollinations | ✅ | ✅ | Full array forwarded unmodified |
| AIFree | ✅ partial | ✅ partial | All messages except final user turn sent as history |
| TalkAI | ❌ | ❌ | Last user message only |
| Dolphin | ❌ | ❌ | Last user message only |
| Toolbaz | ❌ | ❌ | Last user message only |

Use `text_models_by_provider` and each model's `provider` field to determine which provider handles a given model before building a stateful chat.

---

## Dynamic Model Selection

```js
async function getDefaultModel() {
  const { defaults } = await fetch("https://vexa-ai.pages.dev/models").then(r => r.json());
  return defaults.text;
}

async function getModelsByProvider(providerName) {
  const { text_models_by_provider } = await fetch("https://vexa-ai.pages.dev/models").then(r => r.json());
  // Note: bucket keys are DeepAI, TalkAI, Toolbaz
  // Check each model's .provider field for the actual upstream provider
  return text_models_by_provider[providerName] ?? [];
}
```