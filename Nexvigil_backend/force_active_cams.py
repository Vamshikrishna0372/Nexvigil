import asyncio
import os
import sys

# Ensure we can import app
sys.path.append(os.getcwd())

from app.db.mongodb import db

async def fix():
    await db.connect_to_database()
    print(f"Connected to db: {db.db.name}")
    
    # Set all cameras to active
    result = await db.db.cameras.update_many(
        {"status": "inactive"}, 
        {"$set": {"status": "active"}}
    )
    print(f"Updated {result.modified_count} cameras from 'inactive' to 'active'")

    # Ensure status field exists for all
    result2 = await db.db.cameras.update_many(
        {"status": {"$exists": False}}, 
        {"$set": {"status": "active"}}
    )
    print(f"Set status to 'active' for {result2.modified_count} cameras with missing status")
    
    await db.close_database_connection()

if __name__ == "__main__":
    asyncio.run(fix())
