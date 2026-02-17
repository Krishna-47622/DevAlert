
import requests
import json

api_key = "AIzaSyBAOuQXLB7ES2HD1hQJ3snGoirizDJfpU0"
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

print(f"Testing Key: {api_key[:10]}...")

try:
    response = requests.get(url, timeout=10)
    
    with open("debug_output.txt", "w") as f:
        f.write(f"Status Code: {response.status_code}\n")
        f.write("--- Response Body ---\n")
        f.write(response.text)
        f.write("\n---------------------\n")
        
    print("Output written to debug_output.txt")
    
except Exception as e:
    with open("debug_output.txt", "w") as f:
        f.write(f"Error: {e}")
    print("Error written to debug_output.txt")
