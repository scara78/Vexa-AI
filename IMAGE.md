# Image

Generate images via DeepAI (HD model) or Pollinations.ai (Flux, Turbo, Kontext, Seedream, Nano Banana) — free, no API key required.

All generated images are served through a proxy. The upstream URL is never exposed to the client.

```
GET  /image
POST /image
```

---

## Parameters

| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| `q` / `prompt` | yes | — | Image description |
| `model` | no | `hd` | Model to use — see [Models](#models) below |
| `preference` | no | `speed` | `speed` or `quality` — HD model only |

---

## Models

| Name | Provider | Notes |
|------|----------|-------|
| `hd` | DeepAI | Default — supports `preference` param |
| `flux` | Pollinations.ai | Fast, high quality |
| `turbo-img` | Pollinations.ai | Fastest generation |
| `kontext` | Pollinations.ai | Instruction-following edits |
| `seedream` | Pollinations.ai | ByteDance — photorealistic |
| `nanobanana` | Pollinations.ai | Gemini-powered — high detail |

`preference` only applies to `hd`. Pollinations models always generate at 1024×1024 with a random seed.

---

## GET

```bash
# Default HD model, speed preference
curl "/image?q=a+sunset+over+mountains"

# HD with quality preference
curl "/image?q=a+portrait+of+a+knight&preference=quality"

# Pollinations Flux
curl "/image?q=a+neon+city&model=flux"

# Pollinations Seedream
curl "/image?q=a+realistic+portrait&model=seedream"
```

---

## POST

```bash
curl -X POST /image \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a highly detailed fantasy castle on a cliff at sunset",
    "model": "flux"
  }'
```

---

## Response

```json
{
  "success": true,
  "prompt": "a sunset over mountains",
  "model": "hd",
  "preference": "speed",
  "proxy_url": "/image/proxy/abc123def456",
  "source": "deepai.org",
  "elapsed_ms": 4200
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |
| `prompt` | string | Prompt used (max 1000 chars) |
| `model` | string | Model used |
| `preference` | string | Preference used — only present for `hd` model |
| `proxy_url` | string | Proxied image URL |
| `source` | string | `deepai.org` or `pollinations.ai` |
| `elapsed_ms` | number | Time to generate |

---

## Displaying Images

```html
<img src="/image/proxy/abc123def456">
```

```js
const res = await fetch('/image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'a mountain lake at sunrise', model: 'flux' })
});
const data = await res.json();
const img = document.createElement('img');
img.src = data.proxy_url;
document.body.appendChild(img);
```

---

## Proxy Endpoint

```
GET /image/proxy/:id
```

Fetches and streams the image from the upstream source without revealing the origin URL. Returns image bytes with the appropriate `Content-Type` header.

---

## Errors

| Status | Error | Cause |
|--------|-------|-------|
| `400` | `Missing required parameter: q or prompt` | No prompt provided |
| `400` | `Invalid JSON body` | Malformed POST body |
| `400` | `Invalid model` | Unknown model name |
| `400` | `Invalid preference` | Unknown preference value (HD only) |
| `429` | `Rate limit exceeded` | More than 10 requests / IP / 60s |
| `502` | `Generation failed: ...` | Upstream error |
| `404` | `Image not found` | Proxy ID expired or invalid |