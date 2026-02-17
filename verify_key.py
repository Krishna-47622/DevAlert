
import requests
import os
from dotenv import load_dotenv

# Load explicitly from backend/.env
load_dotenv('backend/.env')
api_key = os.getenv('GEMINI_API_KEY')

print(f"Testing Key: {api_key[:10]}...")

# Test 1: List Models (v1beta)
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
print(f"\n--- Checking v1beta/models ---")
try:
    response = requests.get(url, timeout=10)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        models = response.json().get('models', [])
        print(f"Available Models ({len(models)}):")
        for m in models:
            if 'gemini' in m['name']:
                print(f" - {m['name']}")
    else:
        print(f"Error Body: {response.text}")
except Exception as e:
    print(f"Request Failed: {e}")

# Test 2: Try a simple generation (v1beta)
print(f"\n--- Testing Generation (gemini-1.5-flash) ---")
gen_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
payload = {"contents": [{"parts": [{"text": "Hello"}]}]}
try:
    response = requests.post(gen_url, json=payload, headers={'Content-Type': 'application/json'}, timeout=10)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:200]}")
except Exception as e:
    print(f"Gen Request Failed: {e}")
