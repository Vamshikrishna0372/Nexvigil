import requests
import json

BASE_URL = "http://localhost:8000/api/v1"
INTERNAL_KEY = "change_me_to_a_secure_random_key_for_ai_agent"
HEADERS = {"x-api-key": INTERNAL_KEY}

def test_alerts():
    print("Testing /alerts/ endpoint...")
    # We need a token since it's Depends(deps.get_current_active_user)
    # But wait, internal endpoints don't use tokens, they use API keys.
    # The read_alerts endpoint USES tokens.
    
    # Let's try to login first to get a token
    login_url = f"{BASE_URL}/auth/login"
    login_data = {"username": "admin", "password": "password"} # Assuming default/known local creds for testing
    
    try:
        r = requests.post(login_url, data=login_data)
        if r.status_code == 200:
            token = r.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            r = requests.get(f"{BASE_URL}/alerts/", headers=headers)
            print(f"Status: {r.status_code}")
            if r.status_code != 200:
                print(r.text)
            else:
                print("Alerts retrieved successfully")
        else:
            print(f"Login failed: {r.status_code}")
            print(r.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_alerts()
