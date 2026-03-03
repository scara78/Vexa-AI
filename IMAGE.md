# Image

Generate images using the Stable Horde community GPU cluster. No API key required for anonymous use.

```
GET  https://vexa-ai.vercel.app/image
POST https://vexa-ai.vercel.app/image
```

---

## Parameters

| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| `q` / `prompt` | yes | — | Image description |
| `negative_prompt` / `negative` | no | — | Things to exclude from the image |
| `model` | no | `Deliberate` | Model name. See [`/models`](./MODELS.md) → `image_models`. |
| `resolution` | no | `512x512` | `512x512`, `512x768`, `768x512`, `768x768` |
| `num` / `numImages` | no | `1` | Number of images to generate (1–4) |
| `cfg_scale` / `guidance_scale` | no | `7` | Guidance scale 1–20. Higher = prompt-adherent, lower = creative. |
| `steps` | no | `20` | Inference steps 1–50. More steps = more detail, slower generation. |

---

## GET

```bash
# Basic
curl "https://vexa-ai.vercel.app/image?q=a+sunset+over+mountains"

# Full options
curl "https://vexa-ai.vercel.app/image?q=a+portrait+of+a+knight&negative_prompt=blurry,watermark,text&model=Deliberate&resolution=512x768&num=2&cfg_scale=10&steps=30"
```

---

## POST

Use POST for long prompts that would be truncated in a URL.

```bash
curl -X POST https://vexa-ai.vercel.app/image \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a highly detailed fantasy castle on a cliff at sunset, dramatic lighting, volumetric fog, 8k",
    "negative_prompt": "blurry, watermark, text, low quality, cartoon",
    "model": "Deliberate",
    "resolution": "768x512",
    "num": 2,
    "cfg_scale": 9,
    "steps": 30
  }'
```

---

## Response

```json
{
  "success": true,
  "prompt": "a sunset over mountains",
  "negative_prompt": "blurry, watermark",
  "model": "Deliberate",
  "resolution": "512x512",
  "cfg_scale": 7.0,
  "steps": 20,
  "num_images": 1,
  "elapsed_ms": 34200,
  "images": [
    {
      "url": "https://...r2.cloudflarestorage.com/...webp?X-Amz-...",
      "b64": "<base64-encoded webp>",
      "seed": "149576367",
      "worker": "Caustic"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | `true` on success |
| `prompt` | string | Prompt used |
| `negative_prompt` | string \| null | Negative prompt used, or null if none |
| `model` | string | Model used |
| `resolution` | string | Resolution used |
| `cfg_scale` | number | Guidance scale used |
| `steps` | number | Inference steps used |
| `num_images` | number | Number of images returned |
| `elapsed_ms` | number | Total time including queue wait and download |
| `images[].url` | string | Signed R2 URL — expires in ~30 minutes |
| `images[].b64` | string | Base64-encoded webp — use this, it never expires |
| `images[].seed` | string | Seed used for this image — save it to reproduce results |
| `images[].worker` | string | Stable Horde worker that generated it |

> Always use `b64` over `url`. The signed R2 URL expires after 30 minutes.

---

## cfg_scale

Controls how closely the model follows your prompt.

| Value | Effect |
|-------|--------|
| 1–4 | Very creative, loosely follows prompt |
| 5–8 | Balanced (default: 7) |
| 9–13 | Strong prompt adherence |
| 14–20 | Very strict, can cause artifacts at extremes |

---

## steps

Controls how many denoising iterations the model runs.

| Value | Effect |
|-------|--------|
| 1–10 | Fast, rough output |
| 15–25 | Good quality, reasonable speed (default: 20) |
| 30–40 | High detail, noticeably slower |
| 41–50 | Diminishing returns, slow |

---

## negative_prompt

Describe what you want to avoid. Common uses:

```
blurry, watermark, text, signature, low quality, deformed, ugly, extra limbs
```

Negative prompt is passed to Stable Horde using the `###` separator format it natively understands.

---

## Displaying Images

### HTML

```html
<img src="data:image/webp;base64,{{ b64 }}">
```

### JavaScript

```js
const res = await fetch('https://vexa-ai.vercel.app/image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'a mountain lake at sunrise, photorealistic',
    negative_prompt: 'blurry, watermark, cartoon',
    cfg_scale: 8,
    steps: 25
  })
});
const data = await res.json();

data.images.forEach(img => {
  const el = document.createElement('img');
  el.src = `data:image/webp;base64,${img.b64}`;
  document.body.appendChild(el);
  console.log(`seed: ${img.seed}, worker: ${img.worker}`);
});
```

### Python — save to file

```python
import requests, base64

r = requests.post('https://vexa-ai.vercel.app/image', json={
    'prompt': 'a mountain lake at sunrise, photorealistic, dramatic lighting',
    'negative_prompt': 'blurry, watermark, low quality',
    'model': 'Deliberate',
    'resolution': '512x512',
    'num': 2,
    'cfg_scale': 8,
    'steps': 25,
})
data = r.json()
print(f"Generated in {data['elapsed_ms']}ms")

for i, img in enumerate(data['images']):
    with open(f'image_{i}.webp', 'wb') as f:
        f.write(base64.b64decode(img['b64']))
    print(f"Saved image_{i}.webp  seed={img['seed']}  worker={img['worker']}")
```

---

## Choosing a Model

Use `/models` to see which models have active workers right now:

```bash
curl "https://vexa-ai.vercel.app/models" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for m in d['image_models']:
    print(f\"{m['count']:3} workers  {m['queued']:3} queued  {m['name']}\")
"
```

Pick a model with `count > 0`. If you pass a model with no active workers the request fails immediately with a `502` rather than sitting in queue.

---

## Timing

| Condition | Typical wait |
|-----------|-------------|
| Short queue, fast model | 10–20s |
| Normal conditions | 20–45s |
| Long queue or high steps | 45–120s |

The server waits up to **120 seconds** before timing out. Higher `steps` values increase generation time.

---

## Limits

| Limit | Value |
|-------|-------|
| Max prompt length | 500 characters |
| Max negative prompt length | 300 characters |
| Max images per request | 4 |
| cfg_scale range | 1–20 |
| steps range | 1–50 |
| Rate limit | 10 requests / IP / 60s |
| Server timeout | 120s |

---

## Errors

| Status | Error | Cause |
|--------|-------|-------|
| `400` | `Missing required parameter: q or prompt` | No prompt provided |
| `429` | `Rate limit exceeded` | Too many requests |
| `502` | `No workers available for this model. Check /models for valid image_models.` | Model has no active workers |
| `502` | `Upstream request failed` | Stable Horde unreachable or job faulted |