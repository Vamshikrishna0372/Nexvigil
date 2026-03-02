import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "Nexvigil_backend"))

from Nexvigil_backend.app.db.mongodb import db
from Nexvigil_backend.app.core.config import settings

async def check_users():
    print(f"Connecting to {settings.MONGO_URI}")
    await db.connect_to_database()
    users = await db.client[db.db.name]["users"].find().to_list(10)
    for u in users:
        print(f"User: {u.get('email')}, Role: {u.get('role')}")
    await db.close_database_connection()

if __name__ == "__main__":
    asyncio.run(check_users())
