import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = "nexvigil" # From URI or standard

async def seed_rules():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db["detection_rules"]

    # Get a user ID to assign rules to (or leave as None if global)
    user = await db["users"].find_one({"role": "admin"})
    owner_id = str(user["_id"]) if user else "system"

    rules = [
        {
            "rule_name": "Security Breach (Person)",
            "is_active": True,
            "target_classes": ["person"],
            "min_confidence": 0.50,
            "persistence_seconds": 1,
            "cooldown_seconds": 10,
            "severity": "critical",
            "recording_enabled": True,
            "recording_duration": 30,
            "owner_id": owner_id,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "rule_name": "Unauthorized Vehicle",
            "is_active": True,
            "target_classes": ["car", "truck", "bus", "motorcycle"],
            "min_confidence": 0.60,
            "persistence_seconds": 3,
            "cooldown_seconds": 20,
            "severity": "high",
            "recording_enabled": True,
            "recording_duration": 15,
            "owner_id": owner_id,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "rule_name": "Package Monitoring",
            "is_active": True,
            "target_classes": ["backpack", "handbag", "suitcase"],
            "min_confidence": 0.55,
            "persistence_seconds": 5,
            "cooldown_seconds": 60,
            "severity": "medium",
            "recording_enabled": False,
            "owner_id": owner_id,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
    ]

    # Clear existing rules to avoid duplicates if re-running
    await collection.delete_many({"rule_name": {"$in": [r["rule_name"] for r in rules]}})
    
    result = await collection.insert_many(rules)
    print(f"Successfully seeded {len(result.inserted_ids)} rules.")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_rules())
