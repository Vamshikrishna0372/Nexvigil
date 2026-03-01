import asyncio
import motor.motor_asyncio
import os
from dotenv import load_dotenv
from bson import ObjectId

async def set_laptop_cam():
    load_dotenv()
    uri = os.getenv("MONGO_URI")
    client = motor.motor_asyncio.AsyncIOMotorClient(uri)
    db = client.get_default_database()
    
    cam_id = "699ddd924792ca4f775fed0e"
    print(f"Setting camera {cam_id} to use source 0 (laptop cam)")
    
    result = await db.cameras.update_one(
        {"_id": ObjectId(cam_id)},
        {"$set": {"camera_url": "0", "status": "active", "health_status": "online"}}
    )
    print(f"Updated {result.modified_count} camera.")

if __name__ == "__main__":
    asyncio.run(set_laptop_cam())
