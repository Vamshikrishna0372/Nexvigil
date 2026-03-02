import asyncio
import motor.motor_asyncio
import json
from bson import json_util

async def run():
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb+srv://admin:admin%40vamshi@cluster0.xn2lwhn.mongodb.net/nexvigil?appName=Cluster0")
    db = client["nexvigil"]
    
    alert = await db["alerts"].find_one({"video_path": {"$ne": None}})
    if alert:
        print("--- SAMPLE ALERT ---")
        print(json.dumps(alert, indent=2, default=json_util.default))
    else:
        print("No alerts with video_path found.")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(run())
