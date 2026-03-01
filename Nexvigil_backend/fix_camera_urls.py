"""
Fix camera URLs and statuses:
- Phone camera: fix URL from https://192.168.0.117:8080 to http://192.168.0.117:8080/video
- Laptop camera: set to active so AI agent picks it up
"""
import asyncio
import sys
sys.path.insert(0, '.')
from app.db.mongodb import db
from bson import ObjectId

async def fix():
    await db.connect_to_database()
    coll = db.client[db.db.name]['cameras']

    # Fix phone camera URL
    result1 = await coll.update_one(
        {"_id": ObjectId("69a09ae42e45b685ca5b76da")},
        {"$set": {
            "camera_url": "http://192.168.0.117:8080/video",
            "status": "active",
            "health_status": "unknown"
        }}
    )
    print(f"Phone camera fix: matched={result1.matched_count}, modified={result1.modified_count}")

    # Fix laptop camera - make active
    result2 = await coll.update_one(
        {"_id": ObjectId("69a08d6e06e0120307a66d83")},
        {"$set": {
            "status": "active",
            "health_status": "unknown"
        }}
    )
    print(f"Laptop camera fix: matched={result2.matched_count}, modified={result2.modified_count}")

    # Verify
    cams = await coll.find({}).to_list(10)
    print("\nUpdated cameras:")
    for c in cams:
        print(f"  [{str(c['_id'])}] {c.get('camera_name')} | url={c.get('camera_url')} | status={c.get('status')} | health={c.get('health_status')}")

asyncio.run(fix())
