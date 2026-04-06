# Models

```
GET /models
```

Returns all available text and image models. Text models are scraped live from Toolbaz and cached for 5 minutes. DeepAI and Pollinations models are injected on top of the scraped list.

---

## Response

```json
{
  "success": true,
  "default": "vexa",
  "models": {
    "vexa": {
      "label": "Vexa",
      "provider": "Vexa-AI",
      "speed": 0,
      "quality": 0
    },
    "toolbaz-v4.5-fast": {
      "label": "ToolBaz-v4.5-Fast",
      "provider": "ToolBaz",
      "speed": 250,
      "quality": 90
    }
  },
  "image_models": [
    {
      "name": "hd",
      "label": "HD",
      "description": "Standard HD generation — default",
      "default": true
    }
  ],
  "pollinations_models": [
    {
      "key": "pol-openai-fast",
      "label": "Pollinations GPT-OSS",
      "provider": "Pollinations.ai"
    }
  ]
}
```

---

## Text Models

Scraped live from Toolbaz on every cache miss. Includes models from Google, OpenAI, Anthropic, DeepSeek, Meta, xAI, and Toolbaz. DeepAI models (`vexa`, `gemini-2.5-flash-lite`, `gpt-4.1-nano`, `deepseek-v3.2`) and `gpt-5` via AIFreeForever are injected regardless of the scrape.

Use `GET /models` to discover what's currently available — the list updates as Toolbaz adds or removes models.

### Text model fields

| Field | Type | Description |
|-------|------|-------------|
| `label` | string | Display name |
| `provider` | string | Company behind the model |
| `speed` | number | Words per second |
| `quality` | number | Quality score (0–100) |

### Default model

`vexa` — used when no `model` param is provided.

---

## Image Models

Returned under `image_models`. Pass the exact `name` to `/image?model=` or the POST body.

| Name | Provider | Notes |
|------|----------|-------|
| `hd` | DeepAI | Default — supports `preference` param |
| `flux` | Pollinations.ai | Fast, high quality |
| `turbo-img` | Pollinations.ai | Fastest generation |
| `kontext` | Pollinations.ai | Instruction-following edits |
| `seedream` | Pollinations.ai | ByteDance — photorealistic |
| `nanobanana` | Pollinations.ai | Gemini-powered — high detail |

`preference` (`speed` / `quality`) only applies to the `hd` model. Pollinations models ignore it.

---

## Pollinations Text Models

Returned separately under `pollinations_models`. Pass the `key` as the `model` param to `/query` or `/chat`.

| Key | Label |
|-----|-------|
| `pol-openai-fast` | Pollinations GPT-OSS |

---

## Caching

Text models cached for **5 minutes** per serverless instance. Falls back to last successful cache or a minimal default set if upstream is unreachable.