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
    "model-key": {
      "label": "Model Display Name",
      "provider": "Provider Name",
      "speed": 250,
      "quality": 90
    }
  },
  "image_models": [
    {
      "name": "model-name",
      "label": "Model Display Name",
      "description": "Model description"
    }
  ],
  "pollinations_models": [
    {
      "key": "model-key",
      "label": "Model Display Name",
      "provider": "Provider Name"
    }
  ]
}
```

---

## Text Models

Scraped live from Toolbaz on every cache miss. Includes models from Google, OpenAI, Anthropic, DeepSeek, Facebook (Meta), xAI, and Toolbaz. DeepAI models and `gpt-5` via AIFreeForever are injected regardless of the scrape.

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
| `model-name` | Provider | Model description |

`preference` (`speed` / `quality`) only applies to the `hd` model. Pollinations models ignore it.

---

## Pollinations Text Models

Returned separately under `pollinations_models`. Pass the `key` as the `model` param to `/query` or `/chat`.

| Key | Label |
|-----|-------|
| `model-key` | Model Display Name |

---

## Caching

Text models cached for **5 minutes** per serverless instance. Falls back to last successful cache or a minimal default set if upstream is unreachable.