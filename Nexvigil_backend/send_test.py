import asyncio
from app.db.mongodb import db
from app.services.email_service import email_service

async def main():
    await db.connect_to_database()
    res = await email_service.send_test_email("nagulakrish21@gmail.com")
    print(res)
    await db.close_database_connection()

if __name__ == "__main__":
    asyncio.run(main())
