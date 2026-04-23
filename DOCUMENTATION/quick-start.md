# Quick Start

No setup. No API key. Start with a single `curl`.

**Base URL** — `https://vexa-ai.pages.dev`

---

## Your first call

```bash
curl "https://vexa-ai.pages.dev/query?q=Hello"
```

```json
{
  "success": true,
  "response": "Hello! How can I help you today?",
  "model": "vexa",
  "elapsed_ms": 721,
  "source": "deepai.org"
}
```

---

## Pick the right endpoint

**Just need a text response?** Use `/query` — GET or POST, returns plain JSON.

**Building a chatbot?** Use `/chat` — POST only, always streams via SSE.

**Generating an image?** Use `/image` — GET or POST, returns a `proxy_url` you can drop straight into an `<img>` tag.

**Analyzing an image?** Use `/visual` — POST only, accepts a URL, file upload, or base64. Returns plain JSON.

---

## JavaScript

### One-off query

```javascript
const res = await fetch(
  'https://vexa-ai.pages.dev/query?q=' + encodeURIComponent('Explain async/await in one paragraph')
);
const { success, response, error } = await res.json();
if (!success) throw new Error(error);
console.log(response);
```

### Streaming chat

`/chat` always streams — never call `.json()` on the response.

```javascript
async function chat(messages, model = 'vexa') {
  const res = await fetch('https://vexa-ai.pages.dev/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model })
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let output = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    for (const line of decoder.decode(value).split('\n')) {
      if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.error) throw new Error(data.error.message);
        const content = data.choices?.[0]?.delta?.content;
        if (content) output += content;
      } catch (e) {
        if (e.message !== 'Unexpected end of JSON input') throw e;
      }
    }
  }

  return output;
}

// Single turn
const reply = await chat([
  { role: 'user', content: 'What is a JWT?' }
]);

// With system prompt (only effective for DeepAI and Pollinations models)
const reply2 = await chat([
  { role: 'system', content: 'You are a terse coding assistant.' },
  { role: 'user', content: 'What is a closure?' }
]);
```

### Stateful chatbot

The API is stateless — pass the full message history on every request.

```javascript
const history = [];

async function send(userMessage) {
  history.push({ role: 'user', content: userMessage });

  const res = await fetch('https://vexa-ai.pages.dev/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: history })
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let reply = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value).split('\n')) {
      if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.error) throw new Error(data.error.message);
        const content = data.choices?.[0]?.delta?.content;
        if (content) reply += content;
      } catch (e) {
        if (e.message !== 'Unexpected end of JSON input') throw e;
      }
    }
  }

  history.push({ role: 'assistant', content: reply });
  return reply;
}

await send('My name is Alex.');
await send('What did I just tell you?'); // → "Your name is Alex."
```

### Image generation

```javascript
const res = await fetch('https://vexa-ai.pages.dev/image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'a fox in a snowy forest, oil painting' })
});
const { success, proxy_url, error } = await res.json();
if (!success) throw new Error(error);
// Use proxy_url directly in <img src="...">
```

### Image analysis

```javascript
// From a URL
const res = await fetch('https://vexa-ai.pages.dev/visual', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'What is in this image?',
    image_url: 'https://example.com/photo.jpg'
  })
});
const { success, response, error } = await res.json();
if (!success) throw new Error(error);
console.log(response);

// From a file input (<input type="file">)
async function analyzeFile(file, prompt) {
  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('image', file);

  const res = await fetch('https://vexa-ai.pages.dev/visual', {
    method: 'POST',
    body: formData
  });
  const { success, response, error } = await res.json();
  if (!success) throw new Error(error);
  return response;
}
```

---

## Python

### One-off query

```python
import requests

res = requests.get('https://vexa-ai.pages.dev/query', params={'q': 'What is a REST API?'})
data = res.json()
if not data['success']:
    raise RuntimeError(data['error'])
print(data['response'])
```

### Streaming chat

```python
import requests, json

def chat(messages, model='vexa'):
    res = requests.post(
        'https://vexa-ai.pages.dev/chat',
        json={'messages': messages, 'model': model},
        stream=True
    )
    output = ''
    for line in res.iter_lines():
        if not line:
            continue
        line = line.decode()
        if not line.startswith('data: ') or '[DONE]' in line:
            continue
        data = json.loads(line[6:])
        if 'error' in data:
            raise RuntimeError(data['error']['message'])
        content = data['choices'][0]['delta'].get('content', '')
        if content:
            print(content, end='', flush=True)
            output += content
    print()
    return output

chat([{'role': 'user', 'content': 'Write a Python one-liner to flatten a nested list'}])
```

### Image generation

```python
import requests

res = requests.post(
    'https://vexa-ai.pages.dev/image',
    json={'prompt': 'a fox in a snowy forest, oil painting'}
)
data = res.json()
if not data['success']:
    raise RuntimeError(data['error'])
print(data['proxy_url'])
```

### Image analysis

```python
import requests

# From a URL
res = requests.post(
    'https://vexa-ai.pages.dev/visual',
    json={
        'prompt': 'Describe what you see',
        'image_url': 'https://example.com/photo.jpg',
        'template': 'summary'
    }
)
data = res.json()
if not data['success']:
    raise RuntimeError(data['error'])
print(data['response'])

# From a local file
with open('/path/to/photo.jpg', 'rb') as f:
    res = requests.post(
        'https://vexa-ai.pages.dev/visual',
        data={'prompt': 'Describe what you see', 'template': 'summary'},
        files={'image': ('photo.jpg', f, 'image/jpeg')}
    )
print(res.json()['response'])
```

---

## Node.js

Node 18+ has native `fetch`. No packages needed.

```javascript
async function chat(messages, model = 'vexa') {
  const res = await fetch('https://vexa-ai.pages.dev/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model })
  });

  const decoder = new TextDecoder();
  let output = '';

  for await (const chunk of res.body) {
    for (const line of decoder.decode(chunk).split('\n')) {
      if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.error) throw new Error(data.error.message);
        const content = data.choices?.[0]?.delta?.content;
        if (content) { process.stdout.write(content); output += content; }
      } catch (e) {
        if (e.message !== 'Unexpected end of JSON input') throw e;
      }
    }
  }

  return output;
}

chat([{ role: 'user', content: 'Explain closures in JavaScript' }]);
```

---

## Choosing a model

Always fetch the live list — models update dynamically.

```javascript
const { text_models, text_models_by_provider, defaults } = await fetch(
  'https://vexa-ai.pages.dev/models'
).then(r => r.json());

console.log('Default model:', defaults.text);
console.log('All text models:', text_models);
// Bucket keys: DeepAI, TalkAI, Toolbaz
// Check each model's .provider field for the actual upstream provider
console.log('By bucket:', Object.keys(text_models_by_provider));
```

Pass any model name in your request:

```javascript
// /query
fetch('https://vexa-ai.pages.dev/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'Hello', model: 'pol-openai-fast' })
});

// /chat
fetch('https://vexa-ai.pages.dev/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'pol-openai-fast',
    messages: [{ role: 'user', content: 'Hello' }]
  })
});
```

Not all models support conversation history and system prompts. See [`/models`](./models.md) for the full provider breakdown.

---

## Common mistakes

**Calling `.json()` on a `/chat` response** — `/chat` is SSE, not JSON. Always use a stream reader.

**No `user` message in the array** — `/chat` requires at least one message with `role: "user"`. Missing it returns a `400` before the stream opens.

**Expecting system prompts to work on all models** — only DeepAI and Pollinations models forward system messages. DeepAI coerces `system` role to `user` internally. TalkAI, Dolphin, and Toolbaz receive only the last user message and ignore everything else.

**Using an expired proxy ID** — without a `PROXY_CACHE` KV binding, proxy IDs are in-memory and lost on restart. With KV bound, they persist for 24 hours. Either way, a missing ID returns `404`.

**Hardcoding model names** — models are scraped and updated dynamically. Fetch `/models` at startup and use the live list.

**Sending a GET to `/visual`** — `/visual` is POST only. A GET returns `405`.