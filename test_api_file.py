
import requests
import sys

API_KEY = "AIzaSyAxfbaTqoKM06IdyBcOI3KKRCM3AXeJNw4"

with open("api_result.txt", "w") as f:
    f.write(f"Testing Key: {API_KEY[:10]}...\n")
    
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}"
        f.write(f"Requesting {url}...\n")
        
        response = requests.get(url, timeout=10)
        f.write(f"Status: {response.status_code}\n")
        f.write(f"Response: {response.text[:500]}\n")
        
    except Exception as e:
        f.write(f"Error: {e}\n")

print("Done")
