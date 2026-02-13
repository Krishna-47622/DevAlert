import requests
import os
import json
import sys
from dotenv import load_dotenv

# Load env from explicit path
load_dotenv(r'd:\ADD(DevAlert)\backend\.env')

api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    print("❌ API Key not found!", flush=True)
    exit()

print(f"Using Key: {api_key[:8]}...", flush=True)

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={api_key}"
headers = {'Content-Type': 'application/json'}

# Payload with Google Search Grounding Tool
payload = {
    "contents": [{
        "parts": [{"text": "Find 3 recent hackathons happening in India in March 2026. List their names, dates, and a brief description."}]
    }],
    "tools": [{
        "google_search": {}
    }]
}

try:
    print(f"\n🤖 Asking Gemini (REST): '{payload['contents'][0]['parts'][0]['text']}'...", flush=True)
    response = requests.post(url, headers=headers, json=payload, timeout=30)
    
    print(f"\nStatus Code: {response.status_code}", flush=True)
    if response.status_code == 200:
        data = response.json()
        # Check for grounding metadata
        candidates = data.get('candidates', [])
        if candidates:
            content = candidates[0].get('content', {})
            parts = content.get('parts', [])
            text = parts[0].get('text', '') if parts else ''
            print(f"\n✅ Response:\n{text}", flush=True)
            
            grounding_metadata = candidates[0].get('groundingMetadata', {})
            if grounding_metadata.get('searchEntryPoint'):
                print("\n🌐 Google Search used!", flush=True)
                print(grounding_metadata['searchEntryPoint'], flush=True)
            else:
                 print("\n⚠️ No grounding metadata found in response.", flush=True)
        else:
             print("\n⚠️ No candidates returned.", flush=True)
             print(data, flush=True)
    else:
        print(f"\n❌ Error: {response.text}", flush=True)

except Exception as e:
    print(f"\n❌ Exception: {e}", flush=True)
