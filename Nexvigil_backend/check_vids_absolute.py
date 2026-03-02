import asyncio
import motor.motor_asyncio
from pathlib import Path
import os

async def check_media():
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb+srv://admin:admin%40vamshi@cluster0.xn2lwhn.mongodb.net/nexvigil?appName=Cluster0")
    db = client["nexvigil"]
    
    media_root = Path(r"C:\Users\Vamshikrishna\Desktop\Nexvigil\Nexvigil_backend\media")
    
    # Check Alerts with video
    cursor = db["alerts"].find({"video_path": {"$ne": None}}).sort("created_at", -1)
    alerts = await cursor.to_list(20)
    
    print(f"--- DATABASE VS DISK CHECK ---")
    for a in alerts:
        vid = a.get("video_path")
        aid = str(a["_id"])
        
        # Resolve path
        # If vid is '/media/alerts/cam_id/file.webm'
        # Disk path should be media_root / 'alerts' / 'cam_id' / 'file.webm'
        
        clean_rel = vid.replace("/media/", "")
        disk_path = media_root / clean_rel
        
        exists = disk_path.exists()
        size = disk_path.stat().st_size if exists else 0
        
        print(f"Alert: {aid}")
        print(f"  DB Path:   {vid}")
        print(f"  Disk Path: {disk_path}")
        print(f"  Exists:    {'YES' if exists else 'NO'} ({size} bytes)")
        print("-" * 20)

    print("\n--- DISK SCAN (recordings/alerts folders) ---")
    for folder in ["alerts", "recordings"]:
        path = media_root / folder
        if path.exists():
            for root, dirs, files in os.walk(path):
                for f in files:
                    if f.endswith((".webm", ".mp4")):
                        print(f"File found: {os.path.join(root, f)}")

    client.close()

if __name__ == "__main__":
    asyncio.run(check_media())
