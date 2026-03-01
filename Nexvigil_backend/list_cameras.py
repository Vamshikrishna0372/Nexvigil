import requests
import json

url = 'http://127.0.0.1:8000/api/v1/internal/cameras/active'
headers = {'x-api-key': 'change_me_to_a_secure_random_key_for_ai_agent'}
res = requests.get(url, headers=headers)
data = res.json()
for cam in data:
    print(f"ID: {cam.get('id')} | Name: {cam.get('camera_name')} | URL: {cam.get('camera_url')}")
