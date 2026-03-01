import asyncio
from app.db.mongodb import db

async def get_logs():
    await db.connect_to_database()
    logs = await db.db['email_logs'].find().sort('_id', -1).limit(5).to_list(10)
    for l in logs:
        print(l)
    
    print("AI Config:")
    ai_config = await db.db['ai_config'].find_one()
    print(ai_config)
    
    await db.close_database_connection()

if __name__ == "__main__":
    asyncio.run(get_logs())
