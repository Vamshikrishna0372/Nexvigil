import asyncio
import motor.motor_asyncio
import os
from dotenv import load_dotenv

async def fix():
    load_dotenv()
    uri = os.getenv("MONGO_URI")
    client = motor.motor_asyncio.AsyncIOMotorClient(uri)
    db = client.get_default_database()
    
    # Set all cameras to source 0 and status active
    result = await db.cameras.update_many(
        {},
        {"$set": {"camera_url": "0", "status": "active", "health_status": "online"}}
    )
    print(f"Updated {result.modified_count} cameras.")

if __name__ == "__main__":
    asyncio.run(fix())
