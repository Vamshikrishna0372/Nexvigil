import asyncio
import motor.motor_asyncio
import os
from dotenv import load_dotenv

async def check_cams():
    load_dotenv()
    uri = os.getenv("MONGO_URI")
    client = motor.motor_asyncio.AsyncIOMotorClient(uri)
    db = client.get_default_database()
    
    print(f"Connecting to: {db.name}")
    cams = await db.cameras.find({}).to_list(None)
    
    print(f"Found {len(cams)} cameras:")
    for cam in cams:
        print(f"ID: {cam['_id']}, Name: {cam.get('camera_name')}, Status: {cam.get('status')}, URL: {cam.get('camera_url')}")

if __name__ == "__main__":
    asyncio.run(check_cams())
