import asyncio
import motor.motor_asyncio
import os
from dotenv import load_dotenv

async def fix_cams():
    load_dotenv()
    uri = os.getenv("MONGO_URI")
    client = motor.motor_asyncio.AsyncIOMotorClient(uri)
    db = client.get_default_database()
    
    print(f"Connecting to: {db.name}")
    result = await db.cameras.update_many(
        {"status": "inactive"},
        {"$set": {"status": "active"}}
    )
    print(f"Updated {result.modified_count} cameras to 'active' status.")
    
    # Also ensure there's at least one camera with URL '0' for the laptop cam if needed
    # But usually just setting them to active is enough for the agent to try.

if __name__ == "__main__":
    asyncio.run(fix_cams())
