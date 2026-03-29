import asyncio
import httpx
import sys
import os
from datetime import datetime

# Configuration
API_BASE = "http://localhost:8000/api/v1"
AUTH_BASE = "http://localhost:8081"

async def check_api_health():
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Checking FastAPI Health...")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"http://localhost:8000/")
            if resp.status_code == 200:
                print("✅ FastAPI Hub is ONLINE")
                return True
            else:
                print(f"❌ FastAPI Hub returned {resp.status_code}")
                return False
    except Exception as e:
        print(f"❌ FastAPI Hub is OFFLINE: {e}")
        return False

async def check_auth_health():
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Checking Node Auth Health...")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(AUTH_BASE)
            if resp.status_code == 200:
                print("✅ Node Auth Server is ONLINE")
                return True
            else:
                print(f"❌ Node Auth Server returned {resp.status_code}")
                return False
    except Exception as e:
        print(f"❌ Node Auth Server is OFFLINE: {e}")
        return False

async def check_media_dirs():
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Verifying Upload Directories...")
    backend_dir = r"c:\Users\Vamshikrishna\Desktop\Nexvigil\Nexvigil_backend"
    uploads_dir = os.path.join(backend_dir, "uploads")
    
    paths = [
        uploads_dir,
        os.path.join(uploads_dir, "screenshots"),
        os.path.join(uploads_dir, "videos"),
        os.path.join(uploads_dir, "live")
    ]
    
    for p in paths:
        if os.path.exists(p):
            print(f"✅ Directory exists: {p}")
        else:
            print(f"❌ Directory MISSING: {p}")
            # Try to create if missing (though app should do it)
            try:
                os.makedirs(p, exist_ok=True)
                print(f"   (Created directory: {p})")
            except:
                pass

async def main():
    print("=== NexVigil Full System Audit ===")
    api_ok = await check_api_health()
    auth_ok = await check_auth_health()
    await check_media_dirs()
    
    if api_ok and auth_ok:
        print("\n✨ Basic Connectivity Test: SUCCESS")
    else:
        print("\n⚠️ Connectivity Issues Detected. Please check RUN_COMMANDS.md logs.")

if __name__ == "__main__":
    asyncio.run(main())
