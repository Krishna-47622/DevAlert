import os
import requests
from dotenv import load_dotenv

load_dotenv('d:/ADD(DevAlert)/backend/.env')

def test_gemini():
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("❌ ERROR: GEMINI_API_KEY not found in .env")
        return

    print(f"Testing Gemini with key: {api_key[:8]}...")
    
    # Test 1: List Models
    print("\n--- Test 1: Listing Models ---")
    list_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    try:
        r = requests.get(list_url)
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            models = r.json().get('models', [])
            flash_models = [m['name'] for m in models if 'flash' in m['name'].lower()]
            print(f"Found {len(flash_models)} Flash models:")
            for m in flash_models:
                print(f"  - {m}")
        else:
            print(f"Error: {r.text}")
    except Exception as e:
        print(f"Exception: {e}")

    # Test 2: Direct Generate Content
    print("\n--- Test 2: Generate Content (Stable v1) ---")
    gen_url = f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key={api_key}"
    payload = {"contents": [{"parts": [{"text": "Hello"}]}]}
    try:
        r = requests.post(gen_url, json=payload)
        print(f"V1 Status: {r.status_code}")
        if r.status_code != 200:
            print(f"V1 Error: {r.text}")
    except Exception as e:
        print(f"V1 Exception: {e}")

    # Test 3: Generate Content (Beta v1beta)
    print("\n--- Test 3: Generate Content (Beta v1beta) ---")
    gen_url_beta = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    try:
        r = requests.post(gen_url_beta, json=payload)
        print(f"V1Beta Status: {r.status_code}")
        if r.status_code != 200:
            print(f"V1Beta Error: {r.text}")
        else:
            print("V1Beta Success!")
    except Exception as e:
        print(f"V1Beta Exception: {e}")

if __name__ == "__main__":
    test_gemini()
