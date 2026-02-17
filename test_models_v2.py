import google.generativeai as genai
import os
import sys

# Force unbuffered output
sys.stdout.reconfigure(line_buffering=True)

API_KEY = "AIzaSyBAOuQXLB7ES2HD1hQJ3snGoirizDJfpU0"

print(f"Testing with API Key: {API_KEY[:10]}...")

try:
    genai.configure(api_key=API_KEY)
except Exception as e:
    print(f"❌ Configuration Error: {e}")
    exit(1)

print("\n--- Listing Models ---")
found_models = []
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
            found_models.append(m.name)
except Exception as e:
    print(f"❌ Model List Error: {e}")

models_to_test = ['gemini-1.5-flash', 'gemini-1.5-flash-001', 'gemini-1.5-flash-latest', 'gemini-pro']

print("\n--- Testing Specific Models ---")
for model_name in models_to_test:
    print(f"\nTesting {model_name}...")
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Hello")
        print(f"✅ {model_name} WORKED! Response: {response.text}")
    except Exception as e:
        print(f"❌ {model_name} Failed: {e}")
