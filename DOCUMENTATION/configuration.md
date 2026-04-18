# Configuration

Server-side configuration lives in `config.js`. Most of it is static — changes require a redeploy. Runtime state (which models are currently available) is always accessible via the API.

---

## Reading config via API

You never need to read `config.js` directly. Everything observable is exposed through endpoints:

| What you want | Endpoint |
|---------------|----------|
| Default models and preferences | `GET /models` |
| Which providers are active | `GET /models?details=true` → `model_status` |
| Model availability and latency | `GET /health` |
| Full model list with metadata | `GET /models?details=true` |

---

## Provider settings

Providers are toggled on or off in `PROVIDER_SETTINGS`. Disabled providers are excluded from routing and the `/models` response entirely.

```js
export const PROVIDER_SETTINGS = {
  toolbaz: false,
  deepai: true,
  pollinations: true,
  dolphin: false,
  talkai: true,
  aifree: true,
};
```

To check which providers are currently enabled without reading the source, call `/models?details=true` and inspect `model_status` — only models from enabled providers appear.

---

## Defaults

```js
export const DEFAULT_MODEL = "vexa";
export const DEFAULT_IMAGE_MODEL = "hd";
export const DEFAULT_IMAGE_PREFERENCE = "speed";
```

These are returned by `/models` under the `defaults` key and used whenever a request omits the `model` or `preference` parameter.

---

## Request limits

Enforced by the `/chat` endpoint:

| Limit | Value |
|-------|-------|
| Max messages per request | 100 |
| Max characters per message | 32,000 |
| Max total characters | 200,000 |

Exceeding any of these returns a `400` with a descriptive error message.

---

## Model cache TTL

Text models are scraped from upstream providers and cached in memory:

```js
export const CACHE_SETTINGS = {
  MODELS_CACHE_TTL: 300000  // 5 minutes
};
```

After the TTL expires, the next request to `/models`, `/chat`, or `/query` triggers a background refresh. The cache is per-instance — it does not persist across restarts.

---

## Image preference mapping

The `preference` parameter on `/image` maps to an internal key used by the DeepAI provider:

```js
export const IMAGE_PREFERENCES = {
  speed: "turbo",
  quality: "quality"
};
```

Only the `hd` model uses this. Pollinations image models ignore the preference entirely.

---

## Health check settings

```js
export const HEALTH_SETTINGS = {
  HEALTH_PROBE: "Hi",
  MAX_MODELS_TO_CHECK: 100
};
```

`HEALTH_PROBE` is the message sent to each model during a `/health` check. `MAX_MODELS_TO_CHECK` caps how many models are probed in a single health call to prevent timeouts. If the total model count exceeds this, the response includes a `_skipped` note in `checks.models`.

---

## Image generation defaults

```js
export const IMAGE_GENERATION = {
  DEFAULT_WIDTH: 1024,
  DEFAULT_HEIGHT: 1024,
  SEED_RANGE: 999999
};
```

---

## Proxy cache

The image proxy (`/image/proxy/:id`) stores URL mappings in a module-level `Map`. This means:

- IDs are valid only for the lifetime of the current server instance
- A server restart clears all cached IDs
- There is no cross-instance sharing — not suitable for multi-instance deployments without a shared store

---

## What's static vs dynamic

| Setting | Type | How to change |
|---------|------|---------------|
| Provider enabled/disabled | Static | Edit `PROVIDER_SETTINGS`, redeploy |
| Default model | Static | Edit `DEFAULT_MODEL`, redeploy |
| Default image model | Static | Edit `DEFAULT_IMAGE_MODEL`, redeploy |
| Available text models | Dynamic | Scraped from providers, refreshed every 5 min |
| Available image models | Static | Defined in `IMAGE_MODELS` array, requires redeploy |
| Request limits | Static | Hardcoded in `chat.js`, requires redeploy |
