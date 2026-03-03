from http.server import BaseHTTPRequestHandler
import json, time, collections, re, html as html_lib
import requests as req

TOOLBAZ_PAGE_URL   = "https://toolbaz.com/writer/chat-gpt-alternative"
HORDE_WORKERS_URL  = "https://aihorde.net/api/v2/workers?type=image"
HORDE_MODELREF_URL = "https://aihorde.net/api/model_references/v2/image_generation"

CACHE_TTL    = 300
UA           = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
CLIENT_AGENT = "vexa-api:1.0:github.com/vexa-ai"
ANON_KEY     = "0000000000"
DEFAULT_TEXT_MODEL = "toolbaz-v4.5-fast"

_cache: dict = {"text_models": {}, "default": DEFAULT_TEXT_MODEL, "image_models": [], "ts": 0}


def _scrape_text_models(raw_html: str) -> tuple[dict, str]:
    select_block = re.search(r'<select[^>]*\bname=["\']?model["\']?[^>]*>(.*?)(?:</select>|$)', raw_html, re.DOTALL | re.IGNORECASE)
    if not select_block:
        return {}, DEFAULT_TEXT_MODEL

    value_to_label: dict = {}
    keys: list = []
    seen: set  = set()
    for m in re.finditer(r'<option[^>]*\bvalue=["\']?([^"\'>\s]+)["\']?[^>]*>\s*([^\n<]+)', select_block.group(1), re.IGNORECASE):
        val   = html_lib.unescape(m.group(1)).strip()
        label = html_lib.unescape(m.group(2)).strip()
        if val and val not in seen:
            keys.append(val)
            seen.add(val)
            value_to_label[val] = label

    provider_map: dict = {}
    segments = re.split(r'(By\s+[^<\n]{2,60})', raw_html)
    current_provider = ""
    for seg in segments:
        by = re.match(r'By\s+(.+)', seg.strip())
        if by:
            current_provider = re.sub(r'[^\w\s\(\)]', '', by.group(1)).strip()
        else:
            for m in re.finditer(r'data-value=(?:["\']?)([^"\'>\s]+)', seg, re.IGNORECASE):
                provider_map.setdefault(m.group(1).strip(), current_provider)

    dv_positions = [(m.start(), m.group(1)) for m in re.finditer(r'data-value=(?:["\']?)([^"\'>\s]+)', raw_html, re.IGNORECASE)]
    speed_map:   dict = {}
    quality_map: dict = {}
    for i, (start, val) in enumerate(dv_positions):
        end    = dv_positions[i + 1][0] if i + 1 < len(dv_positions) else start + 2000
        window = raw_html[start:end]
        spd    = re.search(r'(\d+)\s*W/s', window)
        qlt    = re.search(r'quality-indicator[^>]*>(?:\s*<[^>]+>)*\s*(\d+)', window)
        if spd:
            speed_map[val]   = int(spd.group(1))
        if qlt:
            quality_map[val] = int(qlt.group(1))

    models: dict = {}
    for val in keys:
        models[val] = {
            "label":    value_to_label.get(val, val),
            "provider": provider_map.get(val, ""),
            "speed":    speed_map.get(val, 0),
            "quality":  quality_map.get(val, 0),
        }

    default = DEFAULT_TEXT_MODEL if DEFAULT_TEXT_MODEL in models else (keys[0] if keys else DEFAULT_TEXT_MODEL)
    return models, default


def _fetch_text_models() -> tuple[dict, str]:
    try:
        r = req.get(TOOLBAZ_PAGE_URL, headers={"User-Agent": UA}, timeout=10)
        r.raise_for_status()
        return _scrape_text_models(r.text)
    except Exception:
        return {}, DEFAULT_TEXT_MODEL


def _fetch_image_models() -> list:
    headers     = {"User-Agent": UA, "Client-Agent": CLIENT_AGENT, "apikey": ANON_KEY}
    workers_err = ""
    try:
        r = req.get(HORDE_WORKERS_URL, headers=headers, timeout=15)
        r.raise_for_status()
        workers = r.json()
        if isinstance(workers, list) and workers:
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
        body  = json.dumps({
            "success":      True,
            "default":      cache["default"],
            "models":       cache["text_models"],
            "image_models": cache["image_models"],
        }, ensure_ascii=False).encode()
        self.send_response(200)
        self.send_header("Content-Type",   "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)