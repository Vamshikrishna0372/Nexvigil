import asyncio
import sys
sys.path.insert(0, '.')
from app.db.mongodb import db

async def show():
    await db.connect_to_database()
    coll = db.client[db.db.name]['cameras']
    all_cams = await coll.find({}).to_list(length=100)
    with open('cam_full_dump.txt', 'w') as f:
        f.write(f"Total cameras: {len(all_cams)}\n\n")
        for c in all_cams:
            f.write(f"ID: {str(c['_id'])}\n")
            f.write(f"  name: {c.get('camera_name')}\n")
            f.write(f"  url: {c.get('camera_url')}\n")
            f.write(f"  status: {c.get('status')}\n")
            f.write(f"  health_status: {c.get('health_status')}\n")
            f.write("\n")
    print("Written to cam_full_dump.txt")

asyncio.run(show())
