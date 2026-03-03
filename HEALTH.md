# Health

Live status check for all upstream services.

```
GET https://vexa-ai.vercel.app/health
```

Actively tests the Toolbaz page, token endpoint, and model scraping — plus submits a real (immediately-cancelled) Stable Horde job to verify the image pipeline.

---

## Response

```json
{
  "success": true,
  "status": "ok",
  "timestamp": 1740888000,
  "total_ms": 270,
  "checks": {
    "page":   { "reachable": true, "status_code": 200, "latency_ms": 107 },
    "token":  { "reachable": true, "token_received": true, "status_code": 200, "latency_ms": 57 },
    "models": { "reachable": true, "model_count": 19, "latency_ms": 103 }
  },
  "models": {
    "toolbaz-v4.5-fast": { "label": "ToolBaz-v4.5-Fast", "provider": "ToolBaz",  "speed": 250, "quality": 90 },
    "gemini-3-flash":    { "label": "Gemini-3-Flash",    "provider": "Google",   "speed": 60,  "quality": 94 },
    "deepseek-v3.1":     { "label": "Deepseek-V3.1",     "provider": "DeepSeek", "speed": 295, "quality": 80 }
  },
  "debug": { ... }
}
```

`status` is `"ok"` when all three checks pass. Otherwise `"degraded"`.

---

## Fields

| Field | Description |
|-------|-------------|
| `checks.page` | HTTP GET to the Toolbaz page |
| `checks.token` | POST to token endpoint with a real fingerprint |
| `checks.models` | Scrapes the model select list, returns count |
| `models` | Full live model catalog with speed/quality/provider |
| `debug` | Raw scraping diagnostic data |
| `total_ms` | Wall time for all checks combined |