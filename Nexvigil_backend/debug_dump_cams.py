import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def dump_cams():
    uri = os.getenv("MONGO_URI")
    client = AsyncIOMotorClient(uri)
    db = client.get_default_database()
    print(f"Connected to {db.name}")
    cams = await db["cameras"].find({}).to_list(length=100)
    for cam in cams:
        print(f"ID: {cam['_id']}, Name: {cam.get('camera_name')}, Status: '{cam.get('status')}', Type of Status: {type(cam.get('status'))}")

if __name__ == "__main__":
    asyncio.run(dump_cams())
