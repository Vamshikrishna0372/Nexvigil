import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = "nexvigil"

rules_data = [
    {
        "rule_name": "Emergency: Cold Weapon Detected",
        "is_active": True,
        "target_classes": ["knife", "scissors"],
        "min_confidence": 0.45,
        "persistence_seconds": 0,
        "cooldown_seconds": 30,
        "severity": "critical",
        "recording_enabled": True,
        "recording_duration": 60,
        "description": "Immediate alert for bladed weapons in view."
    },
    {
        "rule_name": "Unauthorized Intrusion (After Hours)",
        "is_active": True,
        "target_classes": ["person"],
        "min_confidence": 0.55,
        "persistence_seconds": 1,
        "cooldown_seconds": 60,
        "severity": "high",
        "time_restriction": {
            "enabled": True,
            "start_time": "22:00",
            "end_time": "06:00"
        },
        "recording_enabled": True,
        "recording_duration": 30,
        "description": "Alerts for any person detected during late night hours."
    },
    {
        "rule_name": "Suspicious Loitering Detected",
        "is_active": True,
        "target_classes": ["person"],
        "min_confidence": 0.65,
        "persistence_seconds": 10,
        "cooldown_seconds": 300,
        "severity": "medium",
        "recording_enabled": True,
        "recording_duration": 15,
        "description": "Triggered when a person remains in the frame for more than 10 seconds."
    },
    {
        "rule_name": "Unattended Object/Bag Watch",
        "is_active": True,
        "target_classes": ["backpack", "suitcase", "handbag"],
        "min_confidence": 0.5,
        "persistence_seconds": 20,
        "cooldown_seconds": 600,
        "severity": "medium",
        "recording_enabled": False,
        "recording_duration": 0,
        "description": "Alert for bags left stationary for 20 seconds."
    },
    {
        "rule_name": "Vehicle Entry Log",
        "is_active": True,
        "target_classes": ["car", "truck", "motorcycle", "bus"],
        "min_confidence": 0.7,
        "persistence_seconds": 2,
        "cooldown_seconds": 10,
        "severity": "low",
        "recording_enabled": False,
        "recording_duration": 0,
        "description": "General logging of vehicle movements."
    },
    {
        "rule_name": "Electronics Restriction Compliance",
        "is_active": False,
        "target_classes": ["cell phone", "laptop"],
        "min_confidence": 0.6,
        "persistence_seconds": 3,
        "cooldown_seconds": 120,
        "severity": "medium",
        "recording_enabled": False,
        "recording_duration": 0,
        "description": "Alert if mobile phones or laptops are used in high-security zones."
    }
]

async def seed_rules():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    # Get first user to assign rules (or system user)
    user = await db.users.find_one({})
    if not user:
        print("No user found to assign rules. Please create a user first.")
        return
    
    user_id = str(user["_id"])
    print(f"Assigning rules to user: {user.get('email', user_id)}")
    
    collection = db.detection_rules
    
    for r in rules_data:
        rule = r.copy()
        rule["owner_id"] = user_id
        rule["created_at"] = datetime.now(timezone.utc)
        rule["updated_at"] = datetime.now(timezone.utc)
        
        # Merge old fields for compatibility
        rule["active"] = rule["is_active"]
        
        # Upsert by name
        existing = await collection.find_one({"rule_name": rule["rule_name"], "owner_id": user_id})
        if not existing:
            await collection.insert_one(rule)
            print(f"Created: {rule['rule_name']}")
        else:
            await collection.update_one({"_id": existing["_id"]}, {"$set": rule})
            print(f"Updated: {rule['rule_name']}")
            
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_rules())
