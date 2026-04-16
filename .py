import requests

history = [{'role': 'system', 'content': 'You are a concise assistant.'}]

def chat(msg, model='vexa'):
    history.append({'role': 'user', 'content': msg})
    r = requests.post('https://vexa-ai.pages.dev/chat', json={'model': model, 'messages': history})
    reply = r.json()['message']['content']
    history.append({'role': 'assistant', 'content': reply})
    return reply

print(chat('Hello!'))