import asyncio
import motor.motor_asyncio

async def activate_all():
    uri = "mongodb+srv://admin:admin%40vamshi@cluster0.xn2lwhn.mongodb.net/nexvigil?appName=Cluster0"
    client = motor.motor_asyncio.AsyncIOMotorClient(uri)
    db = client.nexvigil
    result = await db.cameras.update_many({}, {"$set": {"status": "active", "health_status": "unknown"}})
    print(f"Updated {result.modified_count} cameras to active.")

if __name__ == "__main__":
    asyncio.run(activate_all())
