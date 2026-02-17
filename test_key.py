
import google.generativeai as genai
import os

API_KEY = "AIzaSyBAOuQXLB7ES2HD1hQJ3snGoirizDJfpU0"

print(f"Testing with API Key: {API_KEY[:10]}...")

try:
    genai.configure(api_key=API_KEY)
except Exception as e:
    print(f"❌ Configuration Error: {e}")
    exit(1)

print("\n--- Listing Models ---")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
except Exception as e:
    print(f"❌ Model List Error: {e}")

print("\n--- Testing gemini-1.5-flash ---")
try:
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content("Hello")
    print(f"✅ gemini-1.5-flash Response: {response.text}")
except Exception as e:
    print(f"❌ gemini-1.5-flash Failed: {e}")
