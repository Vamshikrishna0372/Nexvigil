import asyncio
import os
import sys
from datetime import datetime
from dotenv import load_dotenv

# Add project root to path
sys.path.append(os.path.join(os.getcwd(), "Nexvigil_backend"))
load_dotenv(os.path.join(os.getcwd(), "Nexvigil_backend", ".env"))

from app.db.mongodb import db
from app.services.email_service import email_service
from app.core.config import settings

async def test_email():
    print("=== NexVigil Email Service Test ===")
    
    # 1. Check Settings
    print(f"SMTP Host: {settings.SMTP_HOST}")
    print(f"SMTP User: {settings.SMTP_USER}")
    
    if not settings.SMTP_PASS:
        print("❌ SMTP_PASS is missing in .env")
        return

    # 2. Connect to DB (Required because email_service checks config and logs)
    await db.connect_to_database()
    
    try:
        # 3. Test Connection
        print("Testing SMTP Connection...")
        conn_result = await email_service.test_connection()
        print(f"Result: {conn_result}")
        
        if conn_result["status"] == "connected":
            # 4. Send Test Email
            recipient = "nagulakrish21@gmail.com"
            print(f"Sending Test Email to {recipient}...")
            send_result = await email_service.send_test_email(recipient)
            print(f"Send Result: {send_result}")
        else:
            print("❌ Skipping test email due to connection failure.")
            
    finally:
        await db.close_database_connection()

if __name__ == "__main__":
    asyncio.run(test_email())
