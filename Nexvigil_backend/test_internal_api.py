import requests
import os
from dotenv import load_dotenv

def test_internal_api():
    load_dotenv()
    url = "http://localhost:8000/api/v1/internal/cameras/active"
    key = os.getenv("INTERNAL_API_KEY")
    headers = {"x-api-key": key}
    
    print(f"Testing {url} with key {key[:5]}...")
    try:
        res = requests.get(url, headers=headers)
        print(f"Status: {res.status_code}")
        print(f"Body: {res.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_internal_api()
