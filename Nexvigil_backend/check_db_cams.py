import asyncio
import os
import sys

# Add the project root to sys.path
sys.path.append(os.getcwd())

from app.db.mongodb import db

async def check_cameras():
    try:
        await db.connect_to_database()
        cameras = await db.db.cameras.find({}).to_list(length=100)
        print(f"--- ACTIVE CAMERAS IN DATABASE ---")
        for cam in cameras:
            print(f"ID: {cam.get('_id')}")
            print(f"Name: {cam.get('camera_name')}")
            print(f"URL: {cam.get('camera_url')}")
            print(f"Active: {cam.get('is_active')}")
            print("-" * 20)
        await db.close_database_connection()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_cameras())
