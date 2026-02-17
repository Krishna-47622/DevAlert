
import requests
import json
import os

# Hardcoded key to avoid any env var confusion
API_KEY = "AIzaSyAxfbaTqoKM06IdyBcOI3KKRCM3AXeJNw4"

print(f"--- START API TEST ---")
print(f"Key: {API_KEY[:10]}...")

# 1. Test List Models
print("\n[1] Listing Models (v1beta)...")
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}"
try:
    response = requests.get(url, timeout=10)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        models = [m['name'] for m in data.get('models', []) if 'gemini' in m['name']]
        print(f"Models Found: {len(models)}")
        # print first 5
        for m in models[:5]:
            print(f" - {m}")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Exception: {e}")

# 2. Test Generation (gemini-1.5-flash)
print("\n[2] Testing Generation (models/gemini-1.5-flash)...")
gen_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={API_KEY}"
payload = {
    "contents": [{
        "parts": [{"text": "Hello, explain AI in 10 words."}]
    }]
}
try:
    response = requests.post(gen_url, json=payload, headers={'Content-Type': 'application/json'}, timeout=10)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:200]}...")
except Exception as e:
    print(f"Exception: {e}")

print(f"\n--- END API TEST ---")
