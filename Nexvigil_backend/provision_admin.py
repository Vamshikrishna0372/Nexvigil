"""
NexVigil Admin Provisioning Script
Ensures the admin@nexvigil.com user exists in MongoDB.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone
from dotenv import load_dotenv
import os

load_dotenv('.env')
MONGO_URI = os.getenv('MONGO_URI')
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

async def main():
    if not MONGO_URI:
        print("❌ MONGO_URI missing in .env")
        return

    client = AsyncIOMotorClient(MONGO_URI)
    db_name = MONGO_URI.split('/')[-1].split('?')[0] or 'nexvigil'
    db = client[db_name]
    
    admin_email = "admin@nexvigil.com"
    admin_pass  = "admin123" # Default password
    
    print(f"Checking for admin user: {admin_email}...")
    user = await db['users'].find_one({"email": admin_email})
    
    if not user:
        print("🚀 Creating Admin User...")
        admin_doc = {
            "name": "NexVigil Admin",
            "email": admin_email,
            "hashed_password": pwd_context.hash(admin_pass),
            "role": "admin",
            "status": "active",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "last_login": None
        }
        await db['users'].insert_one(admin_doc)
        print(f"✅ Admin Account created successfully!")
        print(f"   Email: {admin_email}")
        print(f"   Pass:  {admin_pass}")
    else:
        print("✅ Admin user already exists. Updating role/status...")
        await db['users'].update_one(
            {"email": admin_email},
            {"$set": {"role": "admin", "status": "active"}}
        )
    
    # Also verify some core cameras are active
    await db['cameras'].update_many({}, {"$set": {"status": "active"}})
    
    client.close()
    print("DONE.")

if __name__ == "__main__":
    asyncio.run(main())
