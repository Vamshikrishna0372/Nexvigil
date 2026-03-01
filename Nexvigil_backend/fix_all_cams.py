import asyncio
import motor.motor_asyncio
import os
from dotenv import load_dotenv

async def fix_all_cams():
    load_dotenv()
    uri = os.getenv("MONGO_URI")
    client = motor.motor_asyncio.AsyncIOMotorClient(uri)
    db = client.get_default_database()
    
    print(f"Connecting to: {db.name}")
    # Update ALL cameras to active status
    result = await db.cameras.update_many(
        {},
        {"$set": {"status": "active", "health_status": "online"}}
    )
    print(f"Updated {result.modified_count} cameras to 'active' status and 'online' health.")
    
    # List them all to verify
    cams = await db.cameras.find({}).to_list(None)
    for cam in cams:
        print(f"ID: {cam['_id']}, Name: {cam.get('camera_name')}, Status: {cam.get('status')}")

if __name__ == "__main__":
    asyncio.run(fix_all_cams())
