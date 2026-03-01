import asyncio
import os
import sys

# Add project root to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.db.mongodb import db
from app.services.user_service import user_service
from app.schemas.user import UserCreate

async def seed():
    print("Seeding Admin User...")
    try:
        await db.connect_to_database()
        
        email = "admin@nexvigil.com"
        existing = await user_service.get_user_by_email(email)
        
        if existing:
            print(f"✅ Admin account already exists: {email}")
        else:
            print(f"creating admin account: {email}")
            user_in = UserCreate(
                email=email,
                name="System Administrator",
                password="adminPassword123!",
                role="admin"
            )
            # user_service.create_user enforces role=admin for this email
            user = await user_service.create_user(user_in)
            print(f"✅ Admin account created successfully. ID: {user.id}")
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"❌ Error seeding admin: {e}")
    finally:
        await db.close_database_connection()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed())
