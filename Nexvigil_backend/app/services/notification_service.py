from app.db.mongodb import db
from datetime import datetime, timezone
from app.core.config import settings
from typing import Optional
import logging
import smtplib
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

class NotificationService:
    settings_collection = "notification_settings"
    notifications_collection = "notifications"
    
    async def get_user_settings(self, user_id: str) -> dict:
        settings = await db.db[self.settings_collection].find_one({"user_id": user_id})
        if not settings:
            # Create defaults
            settings = {
                "user_id": user_id,
                "in_app": True,
                "email": True,
                "desktop_push": False,
                "severity_preferences": {
                    "low": False,
                    "medium": True,
                    "high": True,
                    "critical": True
                },
                "quiet_hours_enabled": False,
                "quiet_hours_start": "22:00",
                "quiet_hours_end": "07:00",
                "email_digest_frequency": "instant",
                "updated_at": datetime.now(timezone.utc)
            }
            await db.db[self.settings_collection].insert_one(settings)
        return settings
        
    async def update_settings(self, user_id: str, updates: dict) -> dict:
        updates["updated_at"] = datetime.now(timezone.utc)
        await db.db[self.settings_collection].update_one(
            {"user_id": user_id},
            {"$set": updates},
            upsert=True
        )
        return await self.get_user_settings(user_id)
    
    async def send_alert_notification(self, alert: dict):
        user_id = alert["owner_id"]
        user_settings = await self.get_user_settings(user_id)
        severity = alert["severity"]
        
        # 1. Check severity preference
        if not user_settings.get("severity_preferences", {}).get(severity, True):
            return

        # 2. Check Quiet Hours
        if user_settings.get("quiet_hours_enabled"):
            now_time = datetime.now().strftime("%H:%M")
            start = user_settings.get("quiet_hours_start", "22:00")
            end = user_settings.get("quiet_hours_end", "07:00")
            
            # Simple check, assumes same day or overnight
            if start < end:
                if start <= now_time <= end:
                    return # In quiet hours
            else: # Overnight
                if now_time >= start or now_time <= end:
                    return

        # 3. In-App Notification
        if user_settings.get("in_app", True):
            notification = {
                "user_id": user_id,
                "alert_id": alert["id"], # used .id string in alert_service
                "message": f"{severity.upper()} Alert: {alert.get('object_detected')} detected",
                "severity": severity,
                "is_read": False,
                "created_at": datetime.now(timezone.utc)
            }
            await db.db[self.notifications_collection].insert_one(notification)
            
        # 4. Email Notification logic (DEPRECATED: Using new EmailService for professional SMTP alerts)
        # if user_settings.get("email", True) and user_settings.get("email_digest_frequency") == "instant":
        #    user = await db.client[db.db.name]["users"].find_one({"_id": db.client[db.db.name]["users"].database.api.bson.ObjectId(user_id)})
        #    if user:
        #        await asyncio.to_thread(self._send_email_sync, user["email"], alert)

    def _send_email_sync(self, to_email: str, alert: dict):
        """
        Synchronous blocking email sender, to be run in a thread.
        """
        if not settings.SMTP_USER or not settings.SMTP_PASS:
            logger.warning("SMTP not configured, skipping email.")
            return

        try:
            msg = MIMEMultipart()
            msg['From'] = settings.SMTP_FROM_EMAIL
            msg['To'] = to_email
            msg['Subject'] = f"Nexvigil Alert: {alert.get('object_detected')} ({alert.get('severity')})"
            
            body = f"""
            <h1>Nexvigil Security Alert</h1>
            <p><strong>Object:</strong> {alert.get('object_detected')}</p>
            <p><strong>Severity:</strong> {alert.get('severity')}</p>
            <p><strong>Time:</strong> {alert.get('created_at')}</p>
            <p><a href="http://localhost:3000/dashboard/alerts/{alert.get('id')}">View Alert</a></p>
            """
            
            msg.attach(MIMEText(body, 'html'))
            
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.send_message(msg)
            server.quit()
            logger.info(f"Email sent to {to_email}")
        except Exception as e:
            logger.error(f"Failed to send email: {e}")

    async def get_notifications(self, user_id: str, limit: int = 50) -> list:
        cursor = db.db[self.notifications_collection].find(
            {"user_id": user_id}
        ).sort("created_at", -1).limit(limit)
        
        notifs = await cursor.to_list(length=limit)
        for n in notifs:
            n["id"] = str(n["_id"])
        return notifs

    async def mark_read(self, notification_id: str, user_id: str):
        from bson import ObjectId
        await db.db[self.notifications_collection].update_one(
            {"_id": ObjectId(notification_id), "user_id": user_id},
            {"$set": {"is_read": True}}
        )

    async def get_unread_count(self, user_id: str) -> int:
        return await db.db[self.notifications_collection].count_documents(
            {"user_id": user_id, "is_read": False}
        )

notification_service = NotificationService()
