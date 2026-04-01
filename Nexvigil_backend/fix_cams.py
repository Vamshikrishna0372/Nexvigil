import asyncio
import os
import sys

# Add the project root to sys.path
sys.path.append(os.getcwd())

from app.db.mongodb import db

async def fix_camera_typos():
    try:
        await db.connect_to_database()
        
        # 1. Fix the 'videooo' typo in the URL
        # Use simple find and replace first to see if it works
        cameras = await db.db.cameras.find({"camera_url": {"$regex": "videooo"}}).to_list(100)
        for cam in cameras:
            new_url = cam["camera_url"].replace("videooo", "video")
            await db.db.cameras.update_one({"_id": cam["_id"]}, {"$set": {"camera_url": new_url}})
            print(f"Fixed URL for {cam['camera_name']}: {new_url}")

        # 2. Ensure its active if it's the demo one
        await db.db.cameras.update_one({"camera_name": "demo"}, {"$set": {"is_active": True}})
        
        await db.close_database_connection()
        print("✅ Camera fix completed.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(fix_camera_typos())
