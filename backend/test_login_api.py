import requests
import json

try:
    print("Testing admin_dev with Krishna@6969")
    r1 = requests.post('http://localhost:5000/api/auth/login', json={'username': 'admin_dev', 'password': 'Krishna@6969'})
    print("r1:", r1.status_code, r1.text)

    print("Testing admin_dev with 123456")
    r2 = requests.post('http://localhost:5000/api/auth/login', json={'username': 'admin_dev', 'password': '123456'})
    print("r2:", r2.status_code, r2.text)

except Exception as e:
    print(e)
