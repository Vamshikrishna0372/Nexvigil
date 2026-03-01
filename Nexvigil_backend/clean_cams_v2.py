import asyncio
import os
import motor.motor_asyncio
from dotenv import load_dotenv
from bson import ObjectId

async def clean_cams():
    load_dotenv()
    uri = os.getenv("MONGO_URI")
    client = motor.motor_asyncio.AsyncIOMotorClient(uri)
    db = client.get_default_database()
    
    # 1. Fetch all cameras
    cams = await db.cameras.find({}).to_list(None)
    
    url_zero_cams = [c for c in cams if c.get('camera_url') == "0"]
    print(f"Found {len(url_zero_cams)} cameras with URL 0")
    
    if url_zero_cams:
        # Keep the first one active
        target_id = url_zero_cams[0]['_id']
        print(f"Keeping {target_id} active, disabling the rest.")
        
        await db.cameras.update_many({"_id": {"$ne": target_id}}, {"$set": {"status": "inactive"}})
        await db.cameras.update_one({"_id": target_id}, {"$set": {"status": "active"}})
    
    print("Cleanup done.")

if __name__ == "__main__":
    asyncio.run(clean_cams())
