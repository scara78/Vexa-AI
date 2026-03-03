from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, unquote_plus
import json, time, random, collections, base64
import requests as req

UA           = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
CLIENT_AGENT = "vexa-api:1.0:github.com/vexa-ai"
HORDE_API    = "https://aihorde.net/api/v2"
ANON_KEY     = "0000000000"
MAX_REQUESTS   = 10
RATE_WINDOW    = 60
POLL_INTERVAL  = 3
POLL_TIMEOUT   = 120
_rate_store: dict = {}

_model_cache: dict = {"names": set(), "ts": 0}
MODEL_CACHE_TTL = 300

def _get_live_models() -> set:
    """Return set of model names currently served by online AI Horde workers."""
    now = time.time()
    if _model_cache["names"] and now - _model_cache["ts"] < MODEL_CACHE_TTL:
        return _model_cache["names"]
    try:
        r = req.get(
            f"{HORDE_API}/workers?type=image",
            headers={"User-Agent": UA, "Client-Agent": CLIENT_AGENT, "apikey": ANON_KEY},
            timeout=10,
        )
        r.raise_for_status()
        names = set()
        for w in r.json():
            if w.get("online"):
                names.update(w.get("models", []))
        if names:
            _model_cache["names"] = names
            _model_cache["ts"]    = now
    except Exception:
        pass
    return _model_cache["names"]

RESOLUTIONS = {
    "512x512":   (512,  512),
    "512x768":   (512,  768),
    "768x512":   (768,  512),
    "768x768":   (768,  768),
    "640x960":   (640,  960),
    "960x640":   (960,  640),
    "1024x576":  (1024, 576),
    "576x1024":  (576,  1024),
    "832x1216":  (832,  1216),
    "1216x832":  (1216, 832),
    "1024x1024": (1024, 1024),
}
DEFAULT_RESOLUTION = "512x512"

DEFAULT_MODEL = "Deliberate"

SAMPLERS = [
    "k_euler", "k_euler_a", "k_dpm_2", "k_dpm_2_a",
    "k_dpmpp_2m", "k_dpmpp_sde", "DDIM", "k_heun",
]
DEFAULT_SAMPLER = "k_euler_a"

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
    fwd = h.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return h.client_address[0] if h.client_address else "unknown"


def _respond(h, status: int, data: dict):
    body = json.dumps({"success": status < 400, **data}, ensure_ascii=False).encode()
    h.send_response(status)
    h.send_header("Content-Type",   "application/json")
    h.send_header("Content-Length", str(len(body)))
    h.send_header("Access-Control-Allow-Origin",  "*")
    h.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    h.send_header("Access-Control-Allow-Headers", "Content-Type")
    h.end_headers()
    h.wfile.write(body)


def _cancel_job(job_id: str):
    try:
        req.delete(
            f"{HORDE_API}/generate/status/{job_id}",
            headers={"apikey": ANON_KEY, "User-Agent": UA},
            timeout=5,
        )
    except Exception:
        pass

def _generate(prompt: str, negative_prompt: str, w: int, h: int, num: int,
              model: str, sampler: str, steps: int, cfg: float, seed: int) -> list:
    payload = {
        "prompt":   f"{prompt} ### {negative_prompt}" if negative_prompt else prompt,
        "params": {
            "width":        w,
            "height":       h,
            "n":            num,
            "steps":        steps,
            "sampler_name": sampler,
            "cfg_scale":    cfg,
            "seed":         str(seed),
        },
        "models":  [model],
        "r2":      True,
        "shared":  False,
        "slow_workers": True,
    }

    r = req.post(
        f"{HORDE_API}/generate/async",
        json=payload,
        headers={"apikey": ANON_KEY, "User-Agent": UA, "Content-Type": "application/json"},
        timeout=15,
    )
    r.raise_for_status()
    job_id = r.json().get("id")
    if not job_id:
        raise RuntimeError(f"No job ID returned: {r.text[:200]}")

    queue_pos = None
    deadline  = time.time() + POLL_TIMEOUT
    while time.time() < deadline:
        time.sleep(POLL_INTERVAL)
        check = req.get(
            f"{HORDE_API}/generate/check/{job_id}",
            headers={"apikey": ANON_KEY, "User-Agent": UA},
            timeout=10,
        ).json()

        queue_pos = check.get("queue_position")

        if not check.get("is_possible", True):
            _cancel_job(job_id)
            raise RuntimeError(
                f"No workers available for model '{model}'. "
                "Check /models for models with active workers."
            )
        if check.get("faulted"):
            raise RuntimeError(f"Job faulted: {check}")
        if check.get("done"):
            break
    else:
        _cancel_job(job_id)
        raise RuntimeError(f"Timed out after {POLL_TIMEOUT}s (last queue position: {queue_pos})")

    status_r = req.get(
        f"{HORDE_API}/generate/status/{job_id}",
        headers={"apikey": ANON_KEY, "User-Agent": UA},
        timeout=15,
    ).json()

    images = []
    for gen in status_r.get("generations", []):
        img_url = gen.get("img", "")
        b64     = None
        if img_url:
            try:
                img_r = req.get(img_url, timeout=20)
                if img_r.status_code == 200:
                    b64 = base64.b64encode(img_r.content).decode()
            except Exception:
                pass
        images.append({
            "b64":    b64,
            "url":    img_url,
            "seed":   gen.get("seed", str(seed)),
            "model":  gen.get("model", model),
            "worker": gen.get("worker_name", ""),
        })
    return images

def _parse_qs_params(raw_path: str) -> dict:
    params = parse_qs(urlparse(raw_path).query, keep_blank_values=True)

    def _get(keys, default=""):
        for k in keys:
            v = params.get(k)
            if v:
                return unquote_plus(v[0])
        return default

    prompt          = _get(["q", "prompt"], None)
    negative_prompt = _get(["negative_prompt", "negative"], "")
    resolution      = _get(["resolution"], DEFAULT_RESOLUTION)
    model           = _get(["model"], DEFAULT_MODEL)
    sampler         = _get(["sampler"], DEFAULT_SAMPLER)

    try:
        num = max(1, min(int(_get(["num", "numImages"], "1")), 4))
    except (ValueError, TypeError):
        num = 1
    try:
        steps = max(10, min(int(_get(["steps"], "25")), 50))
    except (ValueError, TypeError):
        steps = 25
    try:
        cfg = max(1.0, min(float(_get(["cfg", "cfg_scale"], "7.0")), 20.0))
    except (ValueError, TypeError):
        cfg = 7.0
    try:
        seed = int(_get(["seed"], str(random.randint(0, 2**31))))
    except (ValueError, TypeError):
        seed = random.randint(0, 2**31)

    return {
        "prompt":          prompt,
        "negative_prompt": negative_prompt,
        "resolution":      resolution,
        "model":           model or DEFAULT_MODEL,
        "sampler":         sampler if sampler in SAMPLERS else DEFAULT_SAMPLER,
        "num":             num,
        "steps":           steps,
        "cfg":             cfg,
        "seed":            seed,
    }


def _parse_body(body: dict) -> dict:
    m = body.get("model", DEFAULT_MODEL)
    s = body.get("sampler", DEFAULT_SAMPLER)
    try:
        steps = max(10, min(int(body.get("steps", 25)), 50))
    except (ValueError, TypeError):
        steps = 25
    try:
        cfg = max(1.0, min(float(body.get("cfg_scale", body.get("cfg", 7.0))), 20.0))
    except (ValueError, TypeError):
        cfg = 7.0
    try:
        seed = int(body.get("seed", random.randint(0, 2**31)))
    except (ValueError, TypeError):
        seed = random.randint(0, 2**31)

    return {
        "prompt":          body.get("prompt") or body.get("q"),
        "negative_prompt": body.get("negative_prompt") or body.get("negative") or "",
        "resolution":      body.get("resolution", DEFAULT_RESOLUTION),
        "model":           m or DEFAULT_MODEL,
        "sampler":         s if s in SAMPLERS else DEFAULT_SAMPLER,
        "num":             max(1, min(int(body.get("num") or body.get("numImages") or 1), 4)),
        "steps":           steps,
        "cfg":             cfg,
        "seed":            seed,
    }

def _run(h, args: dict):
    prompt = args.get("prompt")
    if not prompt or not str(prompt).strip():
        _respond(h, 400, {"error": "Missing required parameter: q or prompt"})
        return

    prompt          = str(prompt).strip()[:1000]
    negative_prompt = str(args.get("negative_prompt") or "").strip()[:500]
    resolution      = args.get("resolution", DEFAULT_RESOLUTION)
    model           = args.get("model",      DEFAULT_MODEL)
    sampler         = args.get("sampler",    DEFAULT_SAMPLER)
    num             = args.get("num",        1)
    steps           = args.get("steps",      25)
    cfg             = args.get("cfg",        7.0)
    seed            = args.get("seed",       random.randint(0, 2**31))
    w, h_px         = RESOLUTIONS.get(resolution, (512, 512))

    live_models = _get_live_models()
    model_warning = None
    if live_models and model not in live_models:
        model_warning = f"Model '{model}' has no active workers right now. Request may queue or fail."

    t0 = time.time()
    try:
        images = _generate(prompt, negative_prompt, w, h_px, num, model, sampler, steps, cfg, seed)
    except Exception as e:
        _respond(h, 502, {"error": str(e)})
        return

    _respond(h, 200, {
        "prompt":          prompt,
        "negative_prompt": negative_prompt or None,
        "model":           model,
        "resolution":      resolution,
        "sampler":         sampler,
        "steps":           steps,
        "cfg_scale":       cfg,
        "num_images":      len(images),
        "images":          images,
        "elapsed_ms":      round((time.time() - t0) * 1000),
        **({"warning": model_warning} if model_warning else {}),
    })

class handler(BaseHTTPRequestHandler):
    def log_message(self, *args): pass

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if _is_rate_limited(_get_ip(self)):
            _respond(self, 429, {"error": "Rate limit exceeded"})
            return
        _run(self, _parse_qs_params(self.path))

    def do_POST(self):
        if _is_rate_limited(_get_ip(self)):
            _respond(self, 429, {"error": "Rate limit exceeded"})
            return
        length = int(self.headers.get("Content-Length", 0))
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            _respond(self, 400, {"error": "Invalid JSON body"})
            return
        _run(self, _parse_body(body))