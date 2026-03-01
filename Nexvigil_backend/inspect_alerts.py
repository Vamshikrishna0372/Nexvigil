import asyncio
import os
import sys

# Ensure we can import app
sys.path.append(os.getcwd())

from app.db.mongodb import db

async def check():
    await db.connect_to_database()
    print(f"Connected to db: {db.db.name}")
    
    # Check all alerts with media
    cursor = db.db.alerts.find({
        "$or": [
            {"video_path": {"$ne": None}},
            {"screenshot_path": {"$ne": None}}
        ]
    }).sort("created_at", -1).limit(10)
    
    alerts = await cursor.to_list(10)
    print(f"Total alerts with media (limited to 10): {len(alerts)}")
    for a in alerts:
        print(f"ID={str(a['_id'])}")
        print(f"  video: {a.get('video_path')}")
        print(f"  screenshot: {a.get('screenshot_path')}")
        print(f"  created_at: {a.get('created_at')}")
    
    await db.close_database_connection()

if __name__ == "__main__":
    asyncio.run(check())
