"""
Keep only the 2 most recent alerts, delete all others from MongoDB.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
MONGO_URI = os.getenv("MONGO_URI")

async def main():
    client = AsyncIOMotorClient(MONGO_URI)
    db_name = MONGO_URI.split("/")[-1].split("?")[0] or "nexvigil"
    db = client[db_name]

    total = await db["alerts"].count_documents({})
    print(f"Total alerts before: {total}")

    # Get the 2 most recent alert IDs to keep
    cursor = db["alerts"].find({}, {"_id": 1}).sort("created_at", -1).limit(2)
    keep = await cursor.to_list(2)
    keep_ids = [doc["_id"] for doc in keep]
    print(f"Keeping {len(keep_ids)} alert(s): {[str(i) for i in keep_ids]}")

    # Delete everything except those 2
    result = await db["alerts"].delete_many({"_id": {"$nin": keep_ids}})
    print(f"Deleted: {result.deleted_count} alerts")

    remaining = await db["alerts"].count_documents({})
    print(f"Total alerts after:  {remaining}")
    client.close()

asyncio.run(main())
