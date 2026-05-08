import { createServer } from "node:http";
import worker from "./_worker.js";

const PORT = process.env.PORT || 8787;

// Minimal KV stub for local use (in-memory)
function makeKV() {
    const store = new Map();
    return {
        async get(key) { return store.get(key) ?? null; },
        async put(key, value) { store.set(key, value); },
        async delete(key) { store.delete(key); },
    };
}

const env = {
    PROXY_CACHE: makeKV(),
    ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
    },
};

const ctx = { waitUntil: () => {} };

const server = createServer(async (req, res) => {
    try {
        // Build full URL
        const host = req.headers.host || `localhost:${PORT}`;
        const url = `http://${host}${req.url}`;

        // Read body
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const body = chunks.length > 0 ? Buffer.concat(chunks) : null;

        // Build Web API Request
        const init = {
            method: req.method,
            headers: req.headers,
        };
        if (body && body.length > 0) init.body = body;

        const request = new Request(url, init);

        // Dispatch to worker
        const response = await worker.fetch(request, env, ctx);

        // Write status + headers
        res.writeHead(response.status, Object.fromEntries(response.headers.entries()));

        // Stream body back
        if (response.body) {
            const reader = response.body.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
            }
        }
        res.end();
    } catch (err) {
        console.error("Server error:", err);
        if (!res.headersSent) res.writeHead(500);
        res.end(JSON.stringify({ success: false, error: err.message }));
    }
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Vexa AI running on http://0.0.0.0:${PORT}`);
});
