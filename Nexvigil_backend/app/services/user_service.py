from app.db.mongodb import db
from app.schemas.user import UserCreate, UserLogin, UserInDB, Token, UserResponse
from app.core.security import get_password_hash, verify_password, create_access_token
from fastapi import HTTPException, status
from datetime import datetime, timedelta, timezone
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)

class UserService:
    collection_name = "users"
    audit_collection = "audit_logs"

    async def _log_audit(self, event: str, email: str, success: bool, details: dict = {}):
        """Helper to log security events."""
        log_entry = {
            "event": event,
            "email": email,
            "success": success,
            "details": details,
            "timestamp": datetime.now(timezone.utc)
        }
        try:
            database = await db.get_database()
            if database:
                 await database[self.audit_collection].insert_one(log_entry)
        except Exception as e:
            logger.error(f"Failed to write audit log: {e}")

    async def get_user_by_email(self, email: str) -> Optional[dict]:
        user = await db.client[db.db.name][self.collection_name].find_one({"email": email})
        return user

    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        from bson import ObjectId
        try:
            oid = ObjectId(user_id)
        except:
            return None
        user = await db.client[db.db.name][self.collection_name].find_one({"_id": oid})
        return user
    
    async def create_user(self, user_in: UserCreate) -> UserResponse:
        # Check uniqueness
        existing_user = await self.get_user_by_email(user_in.email)
        if existing_user:
            await self._log_audit("user_registration", user_in.email, False, {"reason": "duplicate_email"})
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email already exists"
            )
        
        # Enforce Admin Role Logic
        # Only admin@nexvigil.com can be admin. All others are user.
        final_role = "user"
        if user_in.email == "admin@nexvigil.com":
            final_role = "admin"
        
        # Hash password
        hashed_password = get_password_hash(user_in.password)
        
        # Create user dict
        user_dict = user_in.model_dump()
        user_dict.pop("password")
        user_dict["hashed_password"] = hashed_password
        user_dict["role"] = final_role  # Override role
        user_dict["created_at"] = datetime.now(timezone.utc)
        user_dict["updated_at"] = datetime.now(timezone.utc)
        user_dict["last_login"] = None
        user_dict["status"] = "active" # Default status
        
        # Insert
        result = await db.client[db.db.name][self.collection_name].insert_one(user_dict)
        
        await self._log_audit("user_registration", user_in.email, True, {"role": final_role})
        
        created_user = await db.client[db.db.name][self.collection_name].find_one({"_id": result.inserted_id})
        
        created_user["id"] = str(created_user["_id"])
        
        # Ensure fallbacks
        created_user["name"] = created_user.get("name") or created_user.get("displayName") or created_user.get("email").split("@")[0]
        created_user["role"] = created_user.get("role") or "user"
        created_user["status"] = created_user.get("status") or "active"

        return UserResponse.model_validate(created_user)

    async def authenticate_user(self, user_in: UserLogin) -> Token:
        user = await self.get_user_by_email(user_in.email)
        
        if not user:
            # Mask user existence to prevent enumeration
            await self._log_audit("login_attempt", user_in.email, False, {"reason": "user_not_found"})
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
            
        # Handle accounts without local passwords (e.g. Google-only users)
        if "hashed_password" not in user:
            await self._log_audit("login_attempt", user_in.email, False, {"reason": "no_local_password"})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This account is registered via Google. Please use the 'Sign in with Google' button."
            )
            
        if not verify_password(user_in.password, user["hashed_password"]):
            await self._log_audit("login_attempt", user_in.email, False, {"reason": "invalid_password"})
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
            
        if user.get("status") != "active":
            await self._log_audit("login_attempt", user_in.email, False, {"reason": "account_disabled"})
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is disabled"
            )
            
        # Update last login
        await db.client[db.db.name][self.collection_name].update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.now(timezone.utc)}}
        )
        
        await self._log_audit("login_success", user_in.email, True)
        
        # Create Token
        access_token = create_access_token(subject=str(user["_id"]), role=user["role"])
        
        # Use robust serialization to convert ObjectId/datetime before validation
        from app.utils import serialize_mongo
        clean_user = serialize_mongo(user)
        
        # Ensure 'id' field is present for the schema (FastAPI expects 'id' over '_id')
        if "_id" in clean_user and "id" not in clean_user:
            clean_user["id"] = clean_user["_id"]
            
        user_response = UserResponse.model_validate(clean_user)
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=user_response
        )

    async def get_users(self, skip: int = 0, limit: int = 100) -> List[dict]:
        cursor = db.client[db.db.name][self.collection_name].find().skip(skip).limit(limit).sort("created_at", -1)
        users = await cursor.to_list(length=limit)
        for u in users:
            u["id"] = str(u["_id"])
            u["name"] = u.get("name") or u.get("displayName") or u.get("email").split("@")[0]
            u["role"] = u.get("role") or "user"
            u["status"] = u.get("status") or "active"
        return users

    async def update_user(self, user_id: str, user_in: any) -> Optional[dict]:
        from bson import ObjectId
        update_data = user_in.model_dump(exclude_unset=True)
        if "password" in update_data:
             update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
        
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        res = await db.client[db.db.name][self.collection_name].find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$set": update_data},
            return_document=True
        )
        if res:
             res["id"] = str(res["_id"])
             res["name"] = res.get("name") or res.get("displayName") or res.get("email").split("@")[0]
             res["role"] = res.get("role") or "user"
             res["status"] = res.get("status") or "active"
        return res

    async def delete_user(self, user_id: str) -> bool:
        from bson import ObjectId
        res = await db.client[db.db.name][self.collection_name].delete_one({"_id": ObjectId(user_id)})
        return res.deleted_count > 0


user_service = UserService()
