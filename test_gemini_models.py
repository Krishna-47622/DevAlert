
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(dotenv_path='backend/.env')

api_key = os.getenv('GEMINI_API_KEY')
print(f"Testing with API Key: {api_key[:10]}...")

if not api_key:
    print("❌ GEMINI_API_KEY not found in backend/.env")
    exit(1)

genai.configure(api_key=api_key)

print("\n--- Listing Available Models ---")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
except Exception as e:
    print(f"❌ Error listing models: {e}")

print("\n--- Testing gemini-1.5-flash ---")
try:
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content("Hello, can you hear me?")
    print(f"✅ gemini-1.5-flash Response: {response.text}")
except Exception as e:
    print(f"❌ gemini-1.5-flash Failed: {e}")

print("\n--- Testing gemini-pro ---")
try:
    model = genai.GenerativeModel('gemini-pro')
    response = model.generate_content("Hello, can you hear me?")
    print(f"✅ gemini-pro Response: {response.text}")
except Exception as e:
    print(f"❌ gemini-pro Failed: {e}")
