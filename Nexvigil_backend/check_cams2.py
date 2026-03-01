import asyncio
import os
import motor.motor_asyncio
from dotenv import load_dotenv

async def check():
    load_dotenv(".env")
    uri = os.getenv("MONGO_URI")
    client = motor.motor_asyncio.AsyncIOMotorClient(uri)
    db = client.get_default_database()
    cams = await db.cameras.find({}).to_list(None)
    for cam in cams:
        print(f"Name: {cam.get('camera_name')}, URL: {cam.get('camera_url')}")

if __name__ == "__main__":
    asyncio.run(check())
