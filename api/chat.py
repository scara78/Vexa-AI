from http.server import BaseHTTPRequestHandler
import json, time, collections, base64, random, re
import requests as req

TOOLBAZ_PAGE_URL  = "https://toolbaz.com/writer/chat-gpt-alternative"
TOKEN_URL         = "https://data.toolbaz.com/token.php"
WRITE_URL         = "https://data.toolbaz.com/writing.php"
MODELS_CACHE_TTL  = 300
DEFAULT_MODEL     = "toolbaz-v4.5-fast"
SESSION_ID        = "yz3SJSGvR1ih8w5vfOmk9Fpd87iSGfUos54s"

MAX_PROMPT_LENGTH = 16000
MAX_REQUESTS      = 20
RATE_WINDOW       = 60

_rate_store:   dict = {}
_models_cache: dict = {"models": set(), "ts": 0}

UA   = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
HDRS = {
    "Referer":             TOOLBAZ_PAGE_URL,
    "Origin":              "https://toolbaz.com",
    "X-Requested-With":    "XMLHttpRequest",
    "Content-Type":        "application/x-www-form-urlencoded; charset=UTF-8",
    "User-Agent":          UA,
}


def _gRS(n: int) -> str:
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    return "".join(random.choice(chars) for _ in range(n))


def _make_client_token() -> str:
    payload = {
        "bR6wF": {
            "nV5kP": UA,
            "lQ9jX": "en-US",
            "sD2zR": "1920x1080",
            "tY4hL": "America/New_York",
            "pL8mC": "Win32",
            "cQ3vD": 24,
            "hK7jN": 8,
        },
        "uT4bX": {"mM9wZ": [], "kP8jY": []},
        "tuTcS": int(time.time()),
        "tDfxy": None,
        "RtyJt": _gRS(36),
    }
    b64 = base64.b64encode(
        json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode()
    ).decode("ascii")
    return _gRS(6) + b64


def _get_valid_models() -> set:
    now = time.time()
    if _models_cache["models"] and now - _models_cache["ts"] < MODELS_CACHE_TTL:
        return _models_cache["models"]
    try:
        r = req.get(TOOLBAZ_PAGE_URL, headers={"User-Agent": UA}, timeout=10)
        r.raise_for_status()
        models = set()
        seen = set()
        for match in re.finditer(
            r'<option[^>]+value=["\']([^"\']+)["\'][^>]*>\s*([^<]+?)\s*</option>',
            r.text,
        ):
            mid = match.group(1).strip()
            if mid and mid not in seen:
                seen.add(mid)
                models.add(mid)
        if models:
            _models_cache["models"] = models
            _models_cache["ts"] = now
            return models
    except Exception:
        pass
    return _models_cache["models"] or {DEFAULT_MODEL}


def _toolbaz_complete(prompt: str, model: str) -> str:
    s = req.Session()
    s.headers.update({"User-Agent": UA})
    s.cookies.set("SessionID", SESSION_ID, domain="data.toolbaz.com")

    client_token = _make_client_token()
    r = s.post(TOKEN_URL, data={"session_id": SESSION_ID, "token": client_token},
               headers=HDRS, timeout=10)
    r.raise_for_status()
    capcha = r.json().get("token", "")
    if not capcha:
        raise ValueError("Failed to obtain capcha token")

    r2 = s.post(WRITE_URL, data={
        "text":       prompt,
        "capcha":     capcha,
        "model":      model,
        "session_id": SESSION_ID,
    }, headers={**HDRS, "Accept": "text/event-stream,*/*"}, timeout=30)
    r2.raise_for_status()

    text = r2.text
    if "capcha" in text.lower() or "expired" in text.lower():
        raise ValueError(f"Toolbaz rejected request: {text[:200]}")
    return text.strip()


def _messages_to_prompt(messages: list) -> str:
    parts = []
    for m in messages:
        role    = m.get("role", "user")
        content = m.get("content", "").strip()
        if role == "system":
            parts.append(f"[System]: {content}")
        elif role == "assistant":
            parts.append(f"Assistant: {content}")
        else:
            parts.append(f"User: {content}")
    parts.append("Assistant:")
    return "\n\n".join(parts)


def _is_rate_limited(ip: str) -> bool:
    now = time.time()
    if ip not in _rate_store:
        _rate_store[ip] = collections.deque()
    dq = _rate_store[ip]
    while dq and now - dq[0] > RATE_WINDOW:
        dq.popleft()
    if len(dq) >= MAX_REQUESTS:
        return True
    dq.append(now)
    return False


def _get_ip(h) -> str:
    forwarded = h.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real = h.headers.get("x-real-ip", "")
    if real:
        return real
    return h.client_address[0] if h.client_address else "unknown"


def _respond(h, status: int, data: dict):
    body = json.dumps({"success": status < 400, **data}, ensure_ascii=False).encode()
    h.send_response(status)
    h.send_header("Content-Type",   "application/json")
    h.send_header("Content-Length", str(len(body)))
    h.send_header("Access-Control-Allow-Origin",  "*")
    h.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
    h.send_header("Access-Control-Allow-Headers", "Content-Type")
    h.end_headers()
    h.wfile.write(body)


class handler(BaseHTTPRequestHandler):
    def log_message(self, *args): pass

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        _respond(self, 405, {
            "error":          "GET not supported on /chat",
            "reason":         "This endpoint requires a POST request with a JSON body containing a 'messages' array.",
            "frontend_only":  True,
            "how_to_use": {
                "method":  "POST",
                "url":     "https://vexa-ai.vercel.app/chat",
                "headers": {"Content-Type": "application/json"},
                "body": {
                    "model":    "toolbaz-v4.5-fast",
                    "messages": [
                        {"role": "system",  "content": "You are a helpful assistant."},
                        {"role": "user",    "content": "Your message here"},
                    ],
                },
            },
            "docs": "https://vexa-ai.vercel.app",
        })

    def do_POST(self):
        ip = _get_ip(self)
        if _is_rate_limited(ip):
            _respond(self, 429, {"error": "Rate limit exceeded. Try again shortly."})
            return

        length = int(self.headers.get("Content-Length", 0))
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            _respond(self, 400, {"error": "Invalid JSON body"})
            return

        messages = body.get("messages")
        if not messages or not isinstance(messages, list) or len(messages) == 0:
            _respond(self, 400, {"error": "Missing or empty 'messages' array"})
            return

        for i, msg in enumerate(messages):
            if not isinstance(msg, dict):
                _respond(self, 400, {"error": f"messages[{i}] must be an object"})
                return
            if msg.get("role") not in ("system", "user", "assistant"):
                _respond(self, 400, {"error": f"messages[{i}].role must be 'system', 'user', or 'assistant'"})
                return
            if not isinstance(msg.get("content", ""), str):
                _respond(self, 400, {"error": f"messages[{i}].content must be a string"})
                return

        model        = body.get("model") or DEFAULT_MODEL
        valid_models = _get_valid_models()
        if model not in valid_models:
            model = DEFAULT_MODEL

        total_chars = sum(len(m.get("content", "")) for m in messages)
        if total_chars > MAX_PROMPT_LENGTH:
            _respond(self, 400, {"error": f"Conversation exceeds maximum length of {MAX_PROMPT_LENGTH} characters"})
            return

        prompt = _messages_to_prompt(messages)

        try:
            t0   = time.time()
            text = _toolbaz_complete(prompt, model)
            _respond(self, 200, {
                "message":      {"role": "assistant", "content": text},
                "model":        model,
                "elapsed_ms":   round((time.time() - t0) * 1000),
                "prompt_chars": total_chars,
            })
        except Exception as e:
            _respond(self, 502, {"error": f"Upstream request failed: {e}"})