import asyncio
import motor.motor_asyncio
import os
from dotenv import load_dotenv

async def check():
    load_dotenv()
    uri = os.getenv("MONGO_URI")
    client = motor.motor_asyncio.AsyncIOMotorClient(uri)
    db = client.get_default_database()
    cams = await db.cameras.find({}).to_list(None)
    for c in cams:
        print(f"ID: {c['_id']} | Name: {c.get('camera_name')} | URL: {c.get('camera_url')}")

if __name__ == "__main__":
    asyncio.run(check())
