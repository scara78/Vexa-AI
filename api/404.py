from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def log_message(self, *args): pass

    def do_GET(self):
        self._send()

    def do_POST(self):
        self._send()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

    def _send(self):
        body = json.dumps({
            "success": False,
            "error":   "Not found",
            "path":    self.path,
        }, ensure_ascii=False).encode()
        self.send_response(404)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)