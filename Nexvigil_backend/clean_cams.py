import asyncio
import motor.motor_asyncio
import os
from dotenv import load_dotenv
from bson import ObjectId

async def clean_cams():
    load_dotenv()
    uri = os.getenv("MONGO_URI")
    client = motor.motor_asyncio.AsyncIOMotorClient(uri)
    db = client.get_default_database()
    
    target_id = "699ddd924792ca4f775fed0e"
    print(f"Ensuring only camera {target_id} is active for source 0")
    
    # Set all cameras to inactive first
    await db.cameras.update_many({}, {"$set": {"status": "inactive"}})
    
    # Set the target one to active and source 0
    result = await db.cameras.update_one(
        {"_id": ObjectId(target_id)},
        {"$set": {"status": "active", "camera_url": "0", "health_status": "online"}}
    )
    
    if result.matched_count == 0:
        print(f"Warning: Target camera {target_id} not found. Creating it if needed?")
        # If it doesn't exist, we might have a problem. 
        # But I saw it in the list.
    
    print("Cleanup done.")

if __name__ == "__main__":
    asyncio.run(clean_cams())
