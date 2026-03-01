import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def run():
    client = AsyncIOMotorClient(os.getenv('MONGO_URI'))
    db = client['nexvigil']
    cams = await db['cameras'].find().to_list(100)
    for c in cams:
        print(f"{c.get('camera_name')} | Status: {c.get('status')} | URL: {c.get('camera_url')}")
    client.close()

if __name__ == "__main__":
    asyncio.run(run())
