import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

async def seed_professional_rules():
    client = AsyncIOMotorClient(os.getenv("MONGO_URI"))
    db = client["nexvigil"]
    collection = db["detection_rules"]

    user = await db["users"].find_one({"role": "admin"})
    owner_id = str(user["_id"]) if user else "system"

    professional_rules = [
        {
            "rule_name": "Crowd Detection (Safety Protocol)",
            "is_active": True,
            "target_classes": ["person"],
            "min_confidence": 0.50,
            "min_people": 4, # Used by AI Agent logic
            "persistence_seconds": 2,
            "cooldown_seconds": 300,
            "severity": "high",
            "description": "Triggered when more than 4 people aggregate in view.",
            "owner_id": owner_id,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "rule_name": "Unattended Baggage Alert",
            "is_active": True,
            "target_classes": ["backpack", "handbag", "suitcase"],
            "min_confidence": 0.45,
            "persistence_seconds": 15,
            "cooldown_seconds": 600,
            "severity": "critical",
            "description": "Critical alert for bags left without an owner nearby.",
            "owner_id": owner_id,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "rule_name": "After-Hours Activity (Security)",
            "is_active": True,
            "target_classes": ["person", "car"],
            "min_confidence": 0.50,
            "time_restriction": {
                "enabled": True,
                "start_time": "20:00",
                "end_time": "06:00"
            },
            "persistence_seconds": 1,
            "cooldown_seconds": 300,
            "severity": "critical",
            "description": "Restricted time breach protocol.",
            "owner_id": owner_id,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
    ]

    for r in professional_rules:
        await collection.update_one(
            {"rule_name": r["rule_name"]},
            {"$set": r},
            upsert=True
        )
    
    print(f"Professional rules seeded successfully.")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_professional_rules())
