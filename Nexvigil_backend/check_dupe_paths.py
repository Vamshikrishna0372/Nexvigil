import asyncio
import os
import sys

sys.path.append(os.getcwd())
from app.db.mongodb import db

async def check():
    await db.connect_to_database()
    print("Checking for alerts with duplicate media paths...")
    
    # Check for non-null video_path equal to screenshot_path
    cursor = db.db.alerts.find({
        "video_path": {"$ne": None},
        "$expr": {"$eq": ["$video_path", "$screenshot_path"]}
    })
    
    dupes = await cursor.to_list(100)
    print(f"Found {len(dupes)} alerts with duplicate paths.")
    for a in dupes[:5]:
        print(f"ID: {a['_id']}, Path: {a['video_path']}")
        
    await db.close_database_connection()

if __name__ == "__main__":
    asyncio.run(check())
