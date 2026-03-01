import asyncio
import os
import sys

# Ensure we can import app
sys.path.append(os.getcwd())

from app.db.mongodb import db

async def check():
    await db.connect_to_database()
    print(f"Connected to db: {db.db.name}")
    
    # Check all cameras
    all_cams = await db.db.cameras.find({}).to_list(100)
    print(f"Total cameras in DB: {len(all_cams)}")
    for c in all_cams:
        print(f" - {c.get('camera_name')}: ID={str(c['_id'])}, status='{c.get('status')}', url='{c.get('camera_url')}'")

    # Check active cameras using the EXACT logic from internal.py
    cursor = db.client[db.db.name]["cameras"].find({"status": {"$in": ["active", "online", "offline", "unknown"]}})
    active_cams = await cursor.to_list(100)
    print(f"Active cameras (by internal logic): {len(active_cams)}")
    
    await db.close_database_connection()

if __name__ == "__main__":
    asyncio.run(check())
