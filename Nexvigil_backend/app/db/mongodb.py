from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class Database:
    client: Optional[AsyncIOMotorClient] = None
    db = None # Database object

    async def connect_to_database(self):
        logger.info("Connecting to MongoDB...")
        try:
            self.client = AsyncIOMotorClient(settings.MONGO_URI)
            self.db = self.client.get_default_database()
            # Verify connection
            await self.client.admin.command('ping')
            logger.info("Connected to MongoDB!")
            await self.create_indexes()
        except Exception as e:
            logger.error(f"Could not connect to MongoDB: {e}")
            raise e

    async def close_database_connection(self):
        logger.info("Closing MongoDB connection...")
        if self.client:
            self.client.close()
        logger.info("MongoDB connection closed.")

    async def create_indexes(self):
        logger.info("Creating database indexes...")
        try:
            # Users
            await self.db.users.create_index("email", unique=True)
            await self.db.users.create_index("organization_id")
            
            # Cameras
            await self.db.cameras.create_index("owner_id")
            await self.db.cameras.create_index("organization_id")
            await self.db.cameras.create_index("status")
            
            # Alerts
            await self.db.alerts.create_index("owner_id")
            await self.db.alerts.create_index("organization_id")
            await self.db.alerts.create_index("camera_id")
            await self.db.alerts.create_index("severity")
            await self.db.alerts.create_index("created_at")
            await self.db.alerts.create_index([("is_acknowledged", 1)])
            
            # Notifications
            await self.db.notifications.create_index("user_id")
            await self.db.notifications.create_index([("user_id", 1), ("is_read", 1)])
            
            # TimeSeriesStats
            await self.db.time_series_stats.create_index("timestamp")
            
            logger.info("Database indexes created successfully.")
        except Exception as e:
             logger.error(f"Error creating indexes: {e}")

db = Database()

async def get_database():
    return db.db
