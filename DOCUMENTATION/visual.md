# /visual

Analyze images using Dolphin AI's multimodal vision model. Accepts a URL, a file upload, or raw base64 — no API key required.
 
**Endpoint** — `POST /visual`
 
---
 
## Request Formats
 
### URL JSON
 
```json
{
  "prompt": "What breed is this dog?",
  "image_url": "https://example.com/photo.jpg",
  "template": "summary"
}
```
 
### File Upload (multipart/form-data)
 
```bash
curl -X POST https://vexa-ai.pages.dev/visual \
  -F "prompt=Describe this image" \
  -F "image=@/path/to/photo.jpg"
```
 
### Base64 JSON
 
```json
{
  "prompt": "What is in this image?",
  "image_base64": "<base64 string>",
  "mime_type": "image/png"
}
```
 
---
 
## Parameters
 
| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `prompt` | string | ✅ | Instruction or question about the image. Also accepted as `q` or `query`. |
| `image_url` | string | ✅ * | Public URL of the image to analyze |
| `image` / `file` | file | ✅ * | File upload via multipart form (max 10 MB) |
| `image_base64` | string | ✅ * | Raw base64-encoded image data |
| `mime_type` | string | — | MIME type for base64 input. Defaults to `image/jpeg` |
| `template` | string | — | Analysis mode. Defaults to `summary`. See below. |
 
*Exactly one image source is required.
 
---
 
## Templates
 
| Value | Best For |
|-------|----------|
| `summary` | General image description and key details (default) |
| `logical` | Structured reasoning about the image |
| `creative` | Open-ended, expressive interpretation |
| `summarize` | Concise bullet-point breakdown |
| `code_beginner` | Describe code/diagrams for beginners |
| `code_advanced` | Deep technical analysis of code or architecture diagrams |
 
---
 
## Response
 
```json
{
  "success": true,
  "response": "- Breed: German Shepherd\n- Color: Black and tan\n- Age: Adult\n- Environment: Outdoor",
  "model": "dolphinserver:24B",
  "template": "summary",
  "elapsed_ms": 2232,
  "source": "dphn.ai"
}
```
 
| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | `true` on success |
| `response` | string | Model's analysis of the image |
| `model` | string | Model used — always `dolphinserver:24B` |
| `template` | string | Template that was applied |
| `elapsed_ms` | number | Total request time in milliseconds |
| `source` | string | Upstream provider — always `dphn.ai` |
 
---
 
## Examples
 
### JavaScript
 
```javascript
// URL
const res = await fetch('https://vexa-ai.pages.dev/visual', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'What is in this image?',
    image_url: 'https://example.com/photo.jpg',
    template: 'summary'
  })
});
const { success, response, error } = await res.json();
if (!success) throw new Error(error);
console.log(response);
```
 
```javascript
// File upload
const formData = new FormData();
formData.append('prompt', 'Describe this image');
formData.append('image', fileInput.files[0]);
 
const res = await fetch('https://vexa-ai.pages.dev/visual', {
  method: 'POST',
  body: formData
});
const { success, response } = await res.json();
```
 
```javascript
// Base64
async function analyzeImageFile(file, prompt) {
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
 
  const res = await fetch('https://vexa-ai.pages.dev/visual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      image_base64: base64,
      mime_type: file.type || 'image/jpeg',
      template: 'summary'
    })
  });
  return res.json();
}
```
 
### Python
 
```python
import requests
 
# URL
res = requests.post(
    'https://vexa-ai.pages.dev/visual',
    json={
        'prompt': 'What breed is this dog?',
        'image_url': 'https://example.com/dog.jpg',
        'template': 'summary'
    }
)
data = res.json()
if not data['success']:
    raise RuntimeError(data['error'])
print(data['response'])
```
 
```python
# File upload
with open('/path/to/photo.jpg', 'rb') as f:
    res = requests.post(
        'https://vexa-ai.pages.dev/visual',
        data={'prompt': 'Describe this image', 'template': 'summary'},
        files={'image': ('photo.jpg', f, 'image/jpeg')}
    )
data = res.json()
print(data['response'])
```
 
```python
# Base64
import base64
 
with open('/path/to/photo.png', 'rb') as f:
    b64 = base64.b64encode(f.read()).decode()
 
res = requests.post(
    'https://vexa-ai.pages.dev/visual',
    json={
        'prompt': 'Analyze the chart',
        'image_base64': b64,
        'mime_type': 'image/png',
        'template': 'logical'
    }
)
print(res.json()['response'])
```
 
### PowerShell
 
```powershell
# URL
$body = @{
    prompt    = "What is in this image?"
    image_url = "https://example.com/photo.jpg"
    template  = "summary"
} | ConvertTo-Json
 
Invoke-RestMethod -Method Post -Uri "https://vexa-ai.pages.dev/visual" `
    -Body $body -ContentType "application/json"
```
 
```powershell
# File upload
Invoke-RestMethod -Method Post -Uri "https://vexa-ai.pages.dev/visual" `
    -Form @{ prompt = "Describe this"; image = Get-Item "C:\photo.jpg" }
```
 
---
 
## Errors
 
| Status | Error | Cause |
|--------|-------|-------|
| `400` | `Missing required parameter: prompt` | No prompt provided |
| `400` | `Missing required parameter: image_url, image_base64, or file upload` | No image source provided |
| `400` | `Invalid JSON body` | Malformed JSON |
| `400` | `Invalid form data` | Malformed multipart body |
| `405` | `Method not allowed` | Non-POST request |
| `413` | `Image too large. Max 10MB.` | File upload exceeds 10 MB |
| `502` | `Upstream request failed` | Dolphin AI returned an error |
 
---
 
## Notes
 
- Only `POST` is supported. `GET` returns `405`.
- The `dolphin` provider must be enabled in `PROVIDER_SETTINGS` for this endpoint to function. See [configuration.md](./configuration.md).
- The Dolphin model (`dolphinserver:24B`) does not support conversation history. Each `/visual` call is fully stateless.
- The 10 MB file size limit applies to direct uploads only. URL and base64 inputs are not size-checked server-side — oversized payloads may be rejected by the upstream provider.
- `mime_type` is only used with `image_base64`. For file uploads the MIME type is read from the file itself.