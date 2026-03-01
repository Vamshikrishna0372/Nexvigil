import asyncio
from app.db.mongodb import db
from app.services.email_service import email_service

async def test_can_send():
    await db.connect_to_database()
    can_send = await email_service._can_send_email("dummy_cam", "critical", "nagulakrish21@gmail.com")
    print("Can send email?", can_send)
    await db.close_database_connection()

if __name__ == "__main__":
    asyncio.run(test_can_send())
