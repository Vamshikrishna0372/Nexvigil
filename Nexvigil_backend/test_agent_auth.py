
import requests
import os
from dotenv import load_dotenv

load_dotenv("ai_agent/.env")

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000/api/v1")
INTERNAL_KEY = os.getenv("INTERNAL_API_KEY")

headers = {"x-api-key": INTERNAL_KEY, "Content-Type": "application/json"}

print(f"Testing connectivity to {BACKEND_URL}...")
print(f"Using Key: {INTERNAL_KEY[:5]}...")

try:
    res = requests.get(f"{BACKEND_URL}/internal/cameras/active", headers=headers)
    print(f"Status Code: {res.status_code}")
    if res.status_code == 200:
        cameras = res.json()
        print(f"Cameras found: {len(cameras)}")
        for cam in cameras:
            print(f" - {cam['camera_name']} (ID: {cam['id']}) Source: {cam['camera_url']}")
    else:
        print(f"Error Response: {res.text}")
except Exception as e:
    print(f"Request failed: {e}")
