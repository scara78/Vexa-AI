# AI_RULES.md

## Tech Stack

- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/) — all server-side code runs at the edge via `_worker.js`. No Node.js runtime in production; use `wrangler dev` for local sandbox.
- **Language**: Vanilla JavaScript (ES Modules). No TypeScript, no transpiler, no build step — files are deployed as-is.
- **Routing**: Manual URL-based routing in `_worker.js`. Each path maps directly to a handler in `functions/`. No framework (no Express, no Hono, no itty-router).
- **Configuration**: All constants (API URLs, model sets, provider toggles, defaults) live in `config.js`. Import from there — never hardcode values inline.
- **KV Storage**: Cloudflare KV (`PROXY_CACHE` binding) is available for caching. Use it for expensive or rate-limited data (e.g., model lists). TTL controlled via `CACHE_SETTINGS` in `config.js`.
- **AI Providers**: Multi-provider architecture under `providers/`. Each provider exports stream and/or image functions. Routing logic lives in `lib/ai.js` and `lib/models.js` — never call providers directly from `functions/`.
- **Utilities**: Shared helpers (CORS headers, HTML unescaping, chunk parsing, text cleaning) live in `lib/utils.js`. Crypto helpers in `lib/crypto.js`. Always import from `lib/` rather than re-implementing.
- **HTTP**: Use the native `fetch` API (globally available in Workers). No `axios`, no `node-fetch`, no HTTP client libraries.
- **Streaming**: AI text responses use Server-Sent Events (`text/event-stream`). Use `corsHeadersStream()` from `lib/utils.js` for streaming responses and `corsHeaders()` for standard JSON responses.
- **Static Assets**: Served via `env.ASSETS.fetch()`. Do not serve binary files or large static content from worker logic.

---

## Rules

### Routing
- Add new endpoints **only** in `_worker.js` with an explicit `path ===` or `path.startsWith()` check.
- Each endpoint must have a corresponding handler file in `functions/`.
- Handler functions must be exported as `onRequest({ request, env, ctx })`.

### Configuration
- **All** API URLs, model names, provider flags, and magic constants belong in `config.js`.
- Never import from `config.js` inside `providers/` files directly if `lib/` already re-exports what you need — prefer `lib/models.js` or `lib/ai.js` as the intermediary.
- To enable/disable a provider, toggle its key in `PROVIDER_SETTINGS` in `config.js`. Do not gate providers with inline booleans elsewhere.

### Providers
- One file per provider in `providers/`. Each must register itself (side-effect import) and export named stream/image functions.
- Provider files must **not** contain routing logic, response formatting, or CORS handling — those belong in `functions/` and `lib/`.
- To add a new provider: create `providers/<name>.js`, import it in `_worker.js`, add model sets to `config.js`, add routing case in `lib/models.js` and `lib/ai.js`.

### AI Calls
- All AI completion calls go through `completeWithAIStream()` or `completeWithAI()` in `lib/ai.js`.
- All image generation calls go through `generateImage()` in `lib/ai.js`.
- Never call a provider function directly from a `functions/` handler.

### Utilities
- Use `corsHeaders()` / `corsHeadersStream()` from `lib/utils.js` on every response — no hand-written CORS headers.
- Use `parseFull()` / `parseChunk()` for parsing AI provider responses — don't write custom parsers.
- Use `unescapeHtml()` for any HTML-encoded text from provider responses.

### No External Dependencies
- Do **not** add npm packages. There is no bundler. Everything runs as plain ES modules.
- Do **not** use `require()`. Use ES module `import`/`export` exclusively.
- Do **not** use Node.js built-ins (`fs`, `path`, `crypto`, etc.). Use the Workers runtime globals (`crypto.subtle`, `fetch`, `URL`, `TextEncoder`, etc.).

### Docker / EasyPanel Deployment
- The app runs via `wrangler dev --local` inside Docker — **no Cloudflare account required** for self-hosting.
- The Dockerfile installs `wrangler` globally and starts the dev server on port `8787` bound to `0.0.0.0`.
- KV state is persisted in a named Docker volume (`kv-data`) mounted at `/app/.wrangler/state`.
- In EasyPanel: create a new service → **Docker Compose** → paste `docker-compose.yml`. Set env vars from `.env.example` if needed.
- To deploy to Cloudflare instead (not Docker), run `wrangler deploy` with valid `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.
- Do **not** run `wrangler dev` without `--local` in Docker — it requires interactive auth.
- Health check endpoint is `/health` — EasyPanel should use `http://localhost:8787/health` as the health probe URL.

### Security
- Never log or expose API keys, tokens, or secrets in responses.
- Sanitize/truncate all user-supplied prompt input before forwarding to providers (see `String(prompt).trim().slice(0, 1000)` pattern in `lib/ai.js`).
- Always validate `request.method` in handlers and return `405` for disallowed methods.
- CORS is open (`*`) by design (public API). Do not restrict it without discussion.
