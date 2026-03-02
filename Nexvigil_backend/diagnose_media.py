import os
import asyncio
import motor.motor_asyncio
from pathlib import Path

async def diagnose_media():
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb+srv://admin:admin%40vamshi@cluster0.xn2lwhn.mongodb.net/nexvigil?appName=Cluster0")
    db = client["nexvigil"]
    
    # 1. Check Alert Records
    alerts = await db["alerts"].find({"video_path": {"$ne": None}}).sort("created_at", -1).to_list(10)
    print(f"Found {len(alerts)} alerts with video paths in DB.\n")
    
    media_root = Path(r"C:\Users\Vamshikrishna\Desktop\Nexvigil\Nexvigil_backend\media")
    
    for a in alerts:
        v_path = a.get("video_path")
        s_path = a.get("screenshot_path")
        
        print(f"Alert ID: {a['_id']}")
        print(f"  DB Video Path: {v_path}")
        print(f"  DB Screenshot Path: {s_path}")
        
        # Resolve actual disk path
        # The app seems to use various conventions. 
        # /media/alerts/... or alerts/... or recordings/...
        
        def check_path(p):
            if not p: return "None"
            # Remove /media/ if present
            clean = p.replace("/media/", "")
            full = media_root / clean
            if full.exists():
                return f"EXISTS at {full}"
            else:
                return f"MISSING at {full}"

        print(f"  Video Status: {check_path(v_path)}")
        print(f"  Screenshot Status: {check_path(s_path)}")
        print("-" * 40)

    # 2. Scan Disk for ANY webm files
    print("\nScanning Disk for any .webm or .mp4 files...")
    for root, dirs, files in os.walk(media_root):
        for f in files:
            if f.endswith((".webm", ".mp4")):
                print(f"Found on disk: {os.path.join(root, f)}")

    client.close()

if __name__ == "__main__":
    asyncio.run(diagnose_media())
