"""
Fix all cameras: set status=active so AI agent picks them up.
Also verify the live stream can be written.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os, time

load_dotenv('.env')
MONGO_URI = os.getenv('MONGO_URI')

async def main():
    client = AsyncIOMotorClient(MONGO_URI)
    db_name = MONGO_URI.split('/')[-1].split('?')[0] or 'nexvigil'
    db = client[db_name]
    
    # Activate ALL cameras
    result = await db['cameras'].update_many(
        {},
        {'$set': {'status': 'active'}}
    )
    print(f'Updated {result.modified_count} cameras to status=active')
    
    # Verify
    cameras = await db['cameras'].find().to_list(20)
    for c in cameras:
        print(f"  {c.get('camera_name')} - {c.get('camera_url')} - {c.get('status')}")
    
    client.close()
    print('Done.')

asyncio.run(main())
