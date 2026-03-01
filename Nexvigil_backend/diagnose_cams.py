
import motor.motor_asyncio
import asyncio
import os
import time

async def diagnose():
    uri = "mongodb+srv://admin:admin%40vamshi@cluster0.xn2lwhn.mongodb.net/nexvigil?appName=Cluster0"
    client = motor.motor_asyncio.AsyncIOMotorClient(uri)
    db = client.nexvigil
    
    print("--- DIAGNOSIS START ---")
    print(f"Current Time: {time.ctime()}")
    
    print("\n[DB: Cameras]")
    cursor = db.cameras.find({})
    cameras = await cursor.to_list(None)
    if not cameras:
        print("No cameras found in DB.")
    for cam in cameras:
        print(f"ID: {str(cam['_id'])}")
        print(f"  Name:   {cam.get('camera_name')}")
        print(f"  Status: {cam.get('status')}")
        print(f"  URL:    {cam.get('camera_url')}")
        print(f"  Health: {cam.get('health_status')}")
        print("-" * 20)
        
    print("\n[Disk: media/live/]")
    live_dir = "media/live"
    if os.path.exists(live_dir):
        files = os.listdir(live_dir)
        for f in files:
            path = os.path.join(live_dir, f)
            mtime = os.path.getmtime(path)
            size = os.path.getsize(path)
            print(f"File: {f:30} | Size: {size:6} | Updated: {time.ctime(mtime)}")
    else:
        print("Directory media/live/ does not exist.")
        
    print("\n--- DIAGNOSIS END ---")
    client.close()

if __name__ == "__main__":
    asyncio.run(diagnose())
