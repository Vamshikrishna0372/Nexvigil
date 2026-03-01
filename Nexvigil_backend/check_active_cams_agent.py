import asyncio
import os
import motor.motor_asyncio
from dotenv import load_dotenv

async def check():
    load_dotenv(".env")
    uri = os.getenv("MONGO_URI")
    client = motor.motor_asyncio.AsyncIOMotorClient(uri)
    db = client.get_default_database()
    print("Database:", db.name)
    cams = await db.cameras.find({}).to_list(None)
    for cam in cams:
        print(f"ID: {cam['_id']}, status: {cam.get('status')}")
    
    active_cams = await db.cameras.find({"status": {"$in": ["active", "offline"]}}).to_list(None)
    print("Active or Offline cams count:", len(active_cams))

if __name__ == "__main__":
    asyncio.run(check())
