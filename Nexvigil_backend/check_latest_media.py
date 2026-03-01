import asyncio
import os
import sys

# Add the current directory to sys.path so 'app' can be found
sys.path.append(os.getcwd())

from app.db.mongodb import db

async def check():
    await db.connect_to_database()
    print(f"Connected to database: {db.db.name}")
    
    # Get the latest alert with a video
    # Note: Using sort by 'created_at' descending
    alert = await db.db.alerts.find_one({"video_path": {"$ne": None}}, sort=[("created_at", -1)])
    
    if alert:
        print("Latest alert with video:")
        print(f"  ID: {alert['_id']}")
        print(f"  Object: {alert['object_detected']}")
        print(f"  Screenshot Path: {alert.get('screenshot_path')}")
        print(f"  Video Path: {alert.get('video_path')}")
        print(f"  Created At: {alert.get('created_at')}")
        
        # Check if files exist
        from app.core.config import settings
        media_root = settings.MEDIA_DIR
        
        if alert.get('screenshot_path'):
            ss_path = os.path.join(media_root, alert['screenshot_path'])
            print(f"  Screenshot file exists: {os.path.exists(ss_path)} ({ss_path})")
            
        if alert.get('video_path'):
            vid_path = os.path.join(media_root, alert['video_path'])
            print(f"  Video file exists: {os.path.exists(vid_path)} ({vid_path})")
            if os.path.exists(vid_path):
                print(f"  Video file size: {os.path.getsize(vid_path)} bytes")
    else:
        print("No alerts with video found in the database.")
        
    await db.close_database_connection()

if __name__ == "__main__":
    asyncio.run(check())
