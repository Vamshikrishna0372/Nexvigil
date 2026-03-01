import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def run():
    client = AsyncIOMotorClient(os.getenv('MONGO_URI'))
    db = client['nexvigil']
    cams = await db['cameras'].find().to_list(100)
    print(f"Total cameras: {len(cams)}")
    for c in cams:
        print(f"ID: {c['_id']}, Name: {c.get('camera_name')}, Status: {c.get('status')}")
    client.close()

if __name__ == "__main__":
    asyncio.run(run())
