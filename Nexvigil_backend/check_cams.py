import asyncio
import sys
sys.path.insert(0, '.')
from app.db.mongodb import db

async def show():
    await db.connect_to_database()
    coll = db.client[db.db.name]['cameras']
    all_cams = await coll.find({}).to_list(length=100)
    print("Total: %d" % len(all_cams))
    for c in all_cams:
        print(f"ID={str(c['_id'])} | name={c.get('camera_name')} | url={c.get('camera_url')} | status={c.get('status')} | health={c.get('health_status')}")

asyncio.run(show())
