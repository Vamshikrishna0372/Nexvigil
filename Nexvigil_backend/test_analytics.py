import urllib.request
import urllib.parse
import json

def fetch_analytics():
    # Login
    login_data = urllib.parse.urlencode({'username': 'admin@nexvigil.com', 'password': 'adminpassword'}).encode('utf-8')
    req = urllib.request.Request('http://localhost:8000/api/v1/auth/login', data=login_data)
    with urllib.request.urlopen(req) as response:
        login_res = json.loads(response.read().decode())
        token = login_res['access_token']

    # Fetch alerts analytics
    req = urllib.request.Request('http://localhost:8000/api/v1/analytics/alerts?days=0', headers={'Authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode())
            print(json.dumps(res, indent=2))
    except urllib.error.HTTPError as e:
        print(f"HTTPError: {e.code} - {e.read().decode()}")

if __name__ == '__main__':
    fetch_analytics()
