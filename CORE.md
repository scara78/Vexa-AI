# Core

`core.js` is the single source of truth for all constants, utilities, and upstream integrations. Every other module imports from here — nothing is hardcoded elsewhere.

---

## URLs

| Export | Value |
|--------|-------|
| `TOOLBAZ_PAGE_URL` | Toolbaz chat page (scraped for models) |
| `TOKEN_URL` | Toolbaz token endpoint |
| `WRITE_URL` | Toolbaz completion endpoint |
| `DEEPAI_API` | DeepAI API base |
| `DEEPAI_CHAT_URL` | DeepAI chat page (scraped for free models) |
| `DEEPAI_IMAGE_URL` | DeepAI image generation endpoint |
| `POLLINATIONS_URL` | Pollinations text completion endpoint |
| `POLLINATIONS_IMAGE_URL` | Pollinations image generation base URL |
| `DOLPHIN_URL` | Dolphin AI chat endpoint |
| `TALKAI_URL` | TalkAI chat endpoint |
| `AIFREE_NONCE_URL` | AIFreeForever nonce endpoint |
| `AIFREE_ANSWER_URL` | AIFreeForever completion endpoint |

---

## Model Sets & Metadata

| Export | Type | Description |
|--------|------|-------------|
| `POLLINATIONS_MODELS` | `Set<string>` | Pollinations text model keys |
| `DOLPHIN_MODELS` | `Set<string>` | Dolphin AI model keys |
| `DOLPHIN_TEMPLATE_MAP` | `object` | Maps Dolphin model key → template name |
| `DEEPAI_MODELS` | `Set<string>` | All DeepAI text model keys (includes Dolphin and TalkAI bridged keys) |
| `TALKAI_MODELS` | `Set<string>` | TalkAI model keys |
| `TALKAI_MODEL_IDS` | `object` | Maps TalkAI model key → upstream model ID |
| `DEEPAI_MODEL_OVERRIDES` | `object` | Label, provider, speed, quality metadata for all DeepAI-routed models |
| `IMAGE_MODELS` | `array` | Full image model list with `name`, `label`, `description` — returned by `/models` |
| `DEEPAI_IMAGE_MODELS` | `Set<string>` | DeepAI image model keys (e.g. `hd`) |
| `POLLINATIONS_IMAGE_MODELS` | `Set<string>` | Pollinations image model keys |
| `IMAGE_PREFERENCES` | `object` | Maps preference string (`speed`, `quality`) → DeepAI param |
| `DEFAULT_IMAGE_MODEL` | `string` | Default image model (`hd`) |
| `DEFAULT_IMAGE_PREFERENCE` | `string` | Default image preference (`speed`) |
| `POLLINATIONS_TEXT_MODELS_LIST` | `array` | Pollinations text model metadata list |
| `DEFAULT_MODEL` | `string` | Default text model (`vexa`) |
| `MODELS_CACHE_TTL` | `number` | Model cache TTL in ms (300000) |
| `HEALTH_PROBE` | `string` | Probe prompt used by `/health` |

---

## Request Helpers

| Export | Description |
|--------|-------------|
| `UA` | User-Agent string used in all upstream requests |
| `POST_HDRS` | Base headers for Toolbaz POST requests |
| `randomString(n)` | Returns a random alphanumeric string of length `n` |
| `makeClientToken()` | Generates the Toolbaz client auth token (base64-encoded fingerprint) |
| `generateTryitKey()` | Generates a `tryit-*` API key for DeepAI text requests |
| `generateImageKey()` | Generates a `tryit-*` API key for DeepAI image requests (async, uses `crypto.subtle`) |
| `unescapeHtml(str)` | Decodes HTML entities (`&amp;`, `&lt;`, etc.) |
| `labelToKey(label)` | Converts a model display name to a lowercase slug key |

---

## Image Utilities

| Export | Description |
|--------|-------------|
| `md5Hex(str)` | Async MD5 hash via `crypto.subtle` — returns hex string |
| `reversedMd5(str)` | Async reversed MD5 hex string |
| `proxyCache` | `Map<string, string>` — proxy ID → upstream URL, shared across image modules |
| `makeProxyId(url)` | Generates a 24-char proxy ID, stores in `proxyCache`, returns the ID |
| `buildDeepAIImageBody(prompt, modelVer, prefKey)` | Builds multipart form body for DeepAI image API |
| `callDeepAIImage(prompt, modelVer, prefKey)` | Calls DeepAI image API, returns upstream image URL |
| `callPollinationsImage(prompt, model)` | Calls Pollinations image API, returns image URL |

---

## Text Completion Functions

| Export | Description |
|--------|-------------|
| `vexaComplete(prompt, messages, model)` | Completes via DeepAI (Vexa and all DeepAI models) |
| `pollinationsComplete(messages, model)` | Completes via Pollinations text API |
| `dolphinComplete(prompt, model)` | Completes via Dolphin AI |
| `talkaiComplete(prompt, model)` | Completes via TalkAI |
| `aiFreeComplete(prompt, messages, model)` | Completes via AIFreeForever |

---

## Parsing & Formatting

| Export | Description |
|--------|-------------|
| `parseChunk(chunk)` | Parses a single SSE `data:` chunk, returns content string |
| `parseFull(raw)` | Parses a full upstream response — handles SSE, JSON, or raw text |
| `messagesToPrompt(messages)` | Converts a messages array to a Toolbaz-style prompt string |
| `resolveSource(model)` | Returns the upstream source label (`deepai.org`, `toolbaz.com`, etc.) for a model key |

---

## CORS Helpers

| Export | Description |
|--------|-------------|
| `corsHeaders(methods?)` | Returns standard JSON CORS headers. Default methods: `GET, POST, OPTIONS` |
| `corsHeadersStream()` | Returns SSE CORS headers for streaming responses |