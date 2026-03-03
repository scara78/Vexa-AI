from http.server import BaseHTTPRequestHandler
import json, time, collections, re
import requests as req

TOOLBAZ_PAGE_URL   = "https://toolbaz.com/writer/chat-gpt-alternative"
HORDE_WORKERS_URL  = "https://aihorde.net/api/v2/workers?type=image"
HORDE_MODELREF_URL = "https://aihorde.net/api/model_references/v2/image_generation"

CACHE_TTL          = 300
UA                 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
CLIENT_AGENT       = "vexa-api:1.0:github.com/vexa-ai"
DEFAULT_TEXT_MODEL = "toolbaz-v4.5-fast"

_cache: dict = {"text_models": {}, "default": DEFAULT_TEXT_MODEL, "image_models": [], "ts": 0}

PROVIDER_HINTS = [
    (["gpt", "openai", "o3", "o4"], "OpenAI"),
    (["mistral"],                    "Mistral AI"),
    (["llama", "maverick"],          "Meta"),
    (["deepseek"],                   "DeepSeek"),
    (["gemini"],                     "Google"),
    (["claude"],                     "Anthropic"),
    (["phi"],                        "Microsoft"),
    (["qwen"],                       "Alibaba"),
    (["grok"],                       "xAI"),
    (["toolbaz"],                    "ToolBaz"),
    (["flux"],                       "Black Forest Labs"),
    (["euryale", "midnight", "unfiltered", "rose", "l3"], "HuggingFace"),
]


def _infer_provider(mid: str) -> str:
    n = mid.lower()
    for keywords, provider in PROVIDER_HINTS:
        if any(k in n for k in keywords):
            return provider
    return ""


def _fetch_text_models() -> tuple[dict, str]:
    try:
        r = req.get(TOOLBAZ_PAGE_URL, headers={"User-Agent": UA}, timeout=10)
        r.raise_for_status()
        html = r.text

        models  = {}
        default = DEFAULT_TEXT_MODEL
        seen    = set()
        first   = True

        for match in re.finditer(
            r'<option[^>]+value=["\']([^"\']+)["\'][^>]*>\s*([^<]+?)\s*</option>',
            html,
        ):
            mid  = match.group(1).strip()
            name = match.group(2).strip()
            if not mid or mid in seen:
                continue
            seen.add(mid)
            models[mid] = {
                "label":    name,
                "provider": _infer_provider(mid),
            }
            if first:
                default = mid
                first   = False

        if DEFAULT_TEXT_MODEL in models:
            default = DEFAULT_TEXT_MODEL

        return models, default
    except Exception:
        return {}, DEFAULT_TEXT_MODEL


def _fetch_image_models() -> list:
    headers     = {"User-Agent": UA, "Client-Agent": CLIENT_AGENT, "apikey": "0000000000"}
    workers_err = ""

    try:
        r = req.get(HORDE_WORKERS_URL, headers=headers, timeout=15)
        r.raise_for_status()
        workers = r.json()
        if isinstance(workers, list) and len(workers) > 0:
            counts = collections.defaultdict(int)
            for w in workers:
                if not w.get("online"):
                    continue
                for model_name in w.get("models", []):
                    counts[model_name] += 1
            if counts:
                ranked = sorted(counts.items(), key=lambda x: x[1], reverse=True)
                return [{"name": name, "count": cnt} for name, cnt in ranked[:30]]
        workers_err = "empty or non-list response"
    except Exception as e:
        workers_err = str(e)

    try:
        r = req.get(HORDE_MODELREF_URL, headers=headers, timeout=15)
        r.raise_for_status()
        data = r.json()
        if isinstance(data, dict):
            return [{"name": name, "count": 0} for name in sorted(data.keys())[:30]]
        if isinstance(data, list):
            return [{"name": m.get("name", ""), "count": 0} for m in data[:30] if m.get("name")]
    except Exception as e:
        return [{"_error": f"workers: {workers_err} | modelref: {e}"}]

    return [{"_error": f"workers: {workers_err} | modelref: unexpected shape"}]


def _refresh() -> dict:
    now = time.time()
    if _cache["text_models"] and now - _cache["ts"] < CACHE_TTL:
        return _cache
    text_models, default   = _fetch_text_models()
    _cache["text_models"]  = text_models
    _cache["default"]      = default
    _cache["image_models"] = _fetch_image_models()
    _cache["ts"]           = now
    return _cache


class handler(BaseHTTPRequestHandler):
    def log_message(self, *args): pass

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        cache = _refresh()
        body  = json.dumps(
            {
                "success":      True,
                "default":      cache.get("default", DEFAULT_TEXT_MODEL),
                "models":       cache["text_models"],
                "image_models": cache["image_models"],
            },
            ensure_ascii=False,
        ).encode()
        self.send_response(200)
        self.send_header("Content-Type",   "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)