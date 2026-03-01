import asyncio
import os
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.core.config import settings
from app.db.mongodb import db
from app.services.user_service import user_service

async def validate():
    print("Starting System Validation...")
    
    # 1. Database Connection
    try:
        await db.connect_to_database()
        print("db_ok|Verified")
    except Exception as e:
        print(f"db_fail|{e}")
        return

    # 2. Collections Check
    collections = await db.db.list_collection_names()
    required = ["users", "cameras", "alerts", "system_settings", "notification_settings", "audit_logs", "ai_performance", "anomaly_events"]
    missing = [c for c in required if c not in collections]
    
    if missing:
        print(f"colls_warn|Missing: {missing}")
    else:
        print("colls_ok|Verified")

    # 3. Admin Account Check
    admin_email = "admin@nexvigil.com"
    admin = await user_service.get_user_by_email(admin_email)
    if admin:
        if admin.get("role") == "admin":
            print("admin_ok|Verified")
        else:
            print(f"admin_fail|Expected admin, got {admin.get('role')}")
    else:
        print(f"admin_missing|{admin_email}")

    # 4. Media Folders
    media_path = Path(settings.MEDIA_DIR)
    # Check explicitly if missing, create them via main.py startup... but script runs isolated.
    # Just check existence.
    missing_dirs = []
    if not media_path.exists(): missing_dirs.append("media_root")
    if not (media_path / "recordings").exists(): missing_dirs.append("recordings")
    if not (media_path / "screenshots").exists(): missing_dirs.append("screenshots")
    
    if missing_dirs:
        print(f"media_fail|Missing: {missing_dirs}")
    else:
        print("media_ok|Verified")

    # 5. Config Check
    print(f"config_ai|{'Set' if settings.INTERNAL_API_KEY else 'Missing'}")

    await db.close_database_connection()
    print("validation_complete|Done")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(validate())
