# Health

```
GET /health
```

Returns live status of all upstream services — Toolbaz page, token endpoint, DeepAI image endpoint, and a live probe of every text model (including TalkAI models).

---

## Response

```json
{
  "success": true,
  "status": "ok",
  "timestamp": 1700000000,
  "total_ms": 812,
  "checks": {
    "page": {
      "reachable": true,
      "status_code": 200,
      "latency_ms": 216
    },
    "token": {
      "reachable": true,
      "token_received": true,
      "status_code": 200,
      "latency_ms": 467
    },
    "image": {
      "reachable": true,
      "status_code": 401,
      "latency_ms": 295
    },
    "models": {
      "vexa": { "ok": true, "latency_ms": 924 },
      "toolbaz-v4.5-fast": { "ok": true, "latency_ms": 1902 },
      "pol-openai-fast": { "ok": true, "latency_ms": 778 },
      "gpt-4.1-nano": { "ok": false, "error": "DeepAI error 429", "latency_ms": 120 }
    }
  },
  "failed_models": ["gpt-4.1-nano"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `ok` if all checks pass, `degraded` otherwise |
| `timestamp` | number | Unix timestamp of the check |
| `total_ms` | number | Total time for all checks run in parallel |
| `checks.page` | object | Toolbaz page reachability |
| `checks.token` | object | Toolbaz token endpoint — `token_received` confirms a valid captcha token was returned |
| `checks.image` | object | DeepAI image endpoint — `401` is expected and treated as reachable |
| `checks.models` | object | Per-model live probe results keyed by model ID |
| `checks.models[id].ok` | boolean | Whether the model responded successfully |
| `checks.models[id].latency_ms` | number | Round-trip time for the probe |
| `checks.models[id].error` | string | Error detail if `ok` is `false` |
| `failed_models` | array | Model IDs that failed — omitted when all models pass |

---

## Notes

- All model probes run in parallel — `total_ms` reflects the slowest check, not the sum.
- To prevent timeout, only the first 100 models are probed; remaining models are marked as skipped.
- The Pollinations probe (`pol-openai-fast`) probes each Pollinations model independently.
- TalkAI models are probed individually as separate model keys.
- The image check probing `401` is expected — DeepAI requires auth for HEAD requests but generation still works via the keyless flow.
- `status` is `degraded` if any model probe fails or any upstream is unreachable.