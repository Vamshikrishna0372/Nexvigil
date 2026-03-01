import asyncio
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__)))

from app.db.mongodb import db

async def check():
    try:
        await db.connect_to_database()
        print("DB Connected")
        colls = await db.db.list_collection_names()
        print("Collections:", colls)
        await db.close_database_connection()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check())
