import asyncio
from app.db.mongodb import db
from app.core.config import settings

async def main():
    await db.connect_to_database()
    coll = db.db['ai_config']
    result = await coll.update_one(
        {}, 
        {'$set': {
            'sender_email': 'nagulakrish21@gmail.com', 
            'sender_app_password': 'iypx fxbr dcsa dutp', 
            'recipient_email': 'nagulakrish21@gmail.com', 
            'email_notifications_enabled': True
        }}, 
        upsert=True
    )
    print("Database updated:", result.modified_count, "upserted:", result.upserted_id)
    await db.close_database_connection()

if __name__ == "__main__":
    asyncio.run(main())
