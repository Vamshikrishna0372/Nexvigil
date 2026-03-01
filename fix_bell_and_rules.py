import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

MONGO_URI = "mongodb+srv://admin:admin%40vamshi@cluster0.xn2lwhn.mongodb.net/nexvigil?appName=Cluster0"

async def run_fix():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.get_default_database()
    print(f"Connected to {db.name}")

    # 1. Clear existing notifications to avoid duplicates for this run
    # await db.notifications.delete_many({})

    # 2. Find all unacknowledged alerts and create notifications for them
    alerts = await db.alerts.find({"is_acknowledged": False}).to_list(None)
    print(f"Found {len(alerts)} unacknowledged alerts.")
    
    count = 0
    for a in alerts:
        # Check if notification already exists for this alert
        existing = await db.notifications.find_one({"alert_id": str(a["_id"])})
        if not existing:
            notification = {
                "user_id": a["owner_id"],
                "alert_id": str(a["_id"]),
                "message": f"{a.get('severity', 'MEDIUM').upper()} Alert: {a.get('object_detected')} detected",
                "severity": a.get("severity", "medium"),
                "is_read": False,
                "created_at": a.get("created_at") or datetime.now(timezone.utc)
            }
            await db.notifications.insert_one(notification)
            count += 1
    
    print(f"Created {count} new notifications.")

    # 3. Ensure all rules have 'is_active' = True if missing
    res = await db.detection_rules.update_many(
        {"is_active": {"$exists": False}},
        {"$set": {"is_active": True}}
    )
    print(f"Ensured {res.modified_count} rules are active.")

if __name__ == "__main__":
    asyncio.run(run_fix())
