import asyncio
import os
import motor.asyncio
from dotenv import load_dotenv

load_dotenv()

async def check():
    client = motor.asyncio.AsyncIOMotorClient(os.getenv("MONGO_URI"))
    db = client["nexvigil"]
    cams = await db["cameras"].find().to_list(100)
    print("CAMERAS:")
    for c in cams:
        print(f"ID: {c['_id']}, Name: {c.get('camera_name')}, Status: {c.get('status')}")
    
    rules = await db["detection_rules"].find().to_list(100)
    print("\nRULES:")
    for r in rules:
        print(f"ID: {r['_id']}, Name: {r.get('rule_name')}, Active: {r.get('is_active')}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check())
