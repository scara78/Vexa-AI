# /image

Generate an image from a text prompt. Returns a `proxy_url` that serves the image binary.

**Methods:** `GET`, `POST`

---

## Parameters

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `q` / `prompt` | Yes | — | Image description. Max 1,000 characters |
| `model` | No | `hd` | Image model name. See [`/models?type=image`](./models.md) for available values |
| `preference` | No | `speed` | `speed` or `quality`. Only applies to the `hd` model; ignored by all Pollinations models |

For `GET`, parameters are query string values. For `POST`, send a JSON body.

---

## Response

```json
{
  "success": true,
  "prompt": "a neon lit Tokyo alley at 2am",
  "model": "flux",
  "proxy_url": "https://vexa-ai.pages.dev/image/proxy/abc123",
  "source": "pollinations.ai",
  "elapsed_ms": 2840
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `true` on success |
| `prompt` | string | The prompt as received (truncated to 1,000 chars) |
| `model` | string | Model used |
| `preference` | string | Only present for the `hd` model |
| `proxy_url` | string | URL to fetch the generated image |
| `source` | string | Upstream provider domain |
| `elapsed_ms` | number | Generation time in milliseconds |

Use `proxy_url` as an `<img src>` or pass it to a download. See [`/image/proxy/:id`](#imageproxyid) below.

---

## Image Models

| Model | Provider | Notes |
|-------|----------|-------|
| `hd` | DeepAI | Respects `preference` (`speed` / `quality`) |
| `flux` | Pollinations | `preference` ignored |
| `turbo-img` | Pollinations | `preference` ignored |
| `kontext` | Pollinations | `preference` ignored |
| `seedream` | Pollinations | `preference` ignored |
| `nanobanana` | Pollinations | `preference` ignored |

Always query [`/models?type=image`](./models.md) for the live list.

---

## Examples

### GET

```bash
curl "https://vexa-ai.pages.dev/image?q=a+neon+lit+Tokyo+alley+at+2am"
```

### POST

```bash
curl -X POST https://vexa-ai.pages.dev/image \
  -H "Content-Type: application/json" \
  -d '{ "prompt": "a neon lit Tokyo alley at 2am", "model": "flux" }'
```

### JavaScript

```js
const res = await fetch("https://vexa-ai.pages.dev/image", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: "a fox in a snowy forest, oil painting", model: "flux" }),
});
const { success, proxy_url, error } = await res.json();
if (!success) throw new Error(error);

// Use directly in the DOM
document.querySelector("img").src = proxy_url;
```

### Python

```python
import requests

res = requests.post(
    "https://vexa-ai.pages.dev/image",
    json={"prompt": "a fox in a snowy forest, oil painting", "model": "flux"},
)
data = res.json()
if not data["success"]:
    raise RuntimeError(data["error"])

img = requests.get(data["proxy_url"])
with open("output.png", "wb") as f:
    f.write(img.content)
```

---

# /image/proxy/:id

Serves a generated image by its proxy ID. Use the `proxy_url` value from a `/image` response.

**Method:** `GET`

```bash
curl "https://vexa-ai.pages.dev/image/proxy/abc123" --output image.png
```

Returns the image binary with the appropriate `Content-Type` and a `Cache-Control: public, max-age=86400` header.

Returns `404` if the ID is not found or has expired.

---

## Proxy ID Behaviour

Proxy IDs are SHA-256 hashes of the upstream image URL, truncated to 32 URL-safe characters. For Pollinations models, this is the constructed request URL. For DeepAI (`hd`), it is the `output_url` returned in the generation response.

**Storage depends on deployment:**

| Environment | Storage | Persistence |
|-------------|---------|-------------|
| With `PROXY_CACHE` KV binding | Cloudflare KV | 24-hour TTL, survives restarts |
| Without `PROXY_CACHE` binding | In-memory `Map` | Lost on server restart |

In production on Cloudflare Pages, bind a KV namespace to `PROXY_CACHE` to get persistent proxy IDs. Without it, any restart invalidates all outstanding proxy URLs.

---

## Notes

- The `preference` field (`speed` / `quality`) only appears in `/image` responses for the `hd` model. All Pollinations models (`flux`, `turbo-img`, `kontext`, `seedream`, `nanobanana`) omit it entirely.
- Prompts are silently truncated to 1,000 characters before generation.
- If `model` is not a valid image model name, returns `502` with a message listing valid values.