from app.schemas.user import UserCreate
try:
    u = UserCreate(email="a@a.com", name="a", password="adminPassword123!", role="admin")
    print("UserCreate OK")
except Exception as e:
    print(f"UserCreate Failed: {e}")

from app.core.security import get_password_hash
try:
    h = get_password_hash("adminPassword123!")
    print(f"Hash OK: {h[:10]}...")
except Exception as e:
    print(f"Hash Failed: {e}")
