import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = "nexvigil"

async def check_rules():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db.detection_rules
    
    rules = await collection.find({}).to_list(length=100)
    print(f"Total Rules found: {len(rules)}")
    for r in rules:
        print(f"- {r['rule_name']} (Active: {r['is_active']}, Severity: {r['severity']})")
            
    client.close()

if __name__ == "__main__":
    asyncio.run(check_rules())
