import asyncio
import sys
sys.path.insert(0, '.')
from app.db.mongodb import db

async def activate():
    await db.connect_to_database()
    coll = db.client[db.db.name]['cameras']
    result = await coll.update_many(
        {"camera_url": "0"},
        {"$set": {"status": "active"}}
    )
    print(f"Updated {result.modified_count} cameras to active status.")

asyncio.run(activate())
