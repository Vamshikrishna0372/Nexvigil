import smtplib
import logging
import os
import asyncio
from datetime import datetime, timezone, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from app.core.config import settings
from app.db.mongodb import db

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.log_collection = "email_logs"
        self._lock = asyncio.Lock()

    async def _can_send_email(self, camera_id: str, severity: str, recipient: str) -> bool:
        """
        Check cooldown and daily limit.
        Requirement: Allow all captures (including low severity) to trigger emails.
        """
        # Requirement: "for every capture it will send to gmail"
        # We now allow 'critical', 'high', 'medium', and 'low' (Periodic Captures)
        allowed_severities = ["critical", "high", "medium", "low"]
        if severity.lower() not in allowed_severities:
            return False

        # Get current config
        from app.services.ai_service import ai_service
        config = (await ai_service.get_config()).model_dump()
        if not config.get("email_notifications_enabled", True):
            return False

        # Apply recipient
        final_recipient = recipient
        if not final_recipient:
            logger.warning("No recipient email configured.")
            return False

        # Daily limit check (max 400 per day globally or per recipient? Prompt says "400 emails/day")
        # Global daily limit for the system.
        start_of_day = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        daily_count = await db.db[self.log_collection].count_documents({
            "timestamp": {"$gte": start_of_day}
        })
        
        limit = config.get("email_daily_limit", 400)
        if daily_count >= limit:
            logger.warning(f"Daily email limit reached ({daily_count}/{limit}).")
            return False

        # Cooldown check
        # Requirement: Bypass cooldown for low-severity snapshots to allow frequent updates
        if severity.lower() == "low":
            return True

        cooldown_mins = config.get("email_cooldown_minutes", 5)
        cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=cooldown_mins)
        
        last_email = await db.db[self.log_collection].find_one({
            "camera_id": camera_id,
            "severity": severity, # Cooldown per severity
            "timestamp": {"$gte": cutoff_time}
        })
        
        if last_email:
            logger.info(f"Email cooldown active for {severity} alert on camera {camera_id}.")
            return False

        return True

    async def send_alert_email(self, alert: dict):
        """
        Asynchronously send alert email.
        """
        camera_id = alert.get("camera_id")
        severity = alert.get("severity", "critical")
        
        owner_id = alert.get("owner_id")
        from bson import ObjectId
        user = await db.db["users"].find_one({"_id": ObjectId(owner_id)}) if owner_id else None
        
        if user and not user.get("alerts_enabled", True):
            logger.info(f"User {owner_id} has disabled alerts. Skipping email.")
            return
            
        recipient = user.get("alert_email") or user.get("email") if user else ""
        
        if not await self._can_send_email(camera_id, severity, recipient):
            return

        # Trigger actual sending in a background thread
        asyncio.create_task(self._execute_send(alert, recipient))

    async def _execute_send(self, alert: dict, default_recipient: str):
        # Re-fetch config for credentials
        from app.services.ai_service import ai_service
        config = (await ai_service.get_config()).model_dump()
        recipient = default_recipient
        
        if not recipient:
            return

        smtp_user = config.get("sender_email") or settings.SMTP_USER
        smtp_pass = config.get("sender_app_password") or settings.SMTP_PASS
        if smtp_pass:
            smtp_pass = smtp_pass.replace(" ", "")

        if not smtp_user or not smtp_pass:
            logger.error("Sender Email and App Password must be configured to send alert emails.")
            return

        # Format email
        subject = f"ALERT: {alert.get('object_detected', 'Unknown').capitalize()} Detected"
        
        # Camera Details
        from bson import ObjectId
        camera = await db.db["cameras"].find_one({"_id": ObjectId(alert.get("camera_id"))})
        camera_name = camera.get("camera_name", "Unknown Node") if camera else "Unknown Node"

        timestamp = alert.get("created_at")
        if isinstance(timestamp, datetime):
            timestamp_str = timestamp.strftime("%Y-%m-%d %H:%M:%S UTC")
        else:
            timestamp_str = str(timestamp)

        confidence = f"{ (alert.get('confidence', 0) * 100):.1f}%"
        
        # Body
        body_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nexvigil Security Alert</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 40px 20px;">
                <tr>
                    <td align="center">
                        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);">
                            <!-- Header -->
                            <tr>
                                <td style="background-color: #dc2626; padding: 30px 40px; text-align: center;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px;">CRITICAL SECURITY ALERT</h1>
                                    <p style="color: #fca5a5; font-size: 13px; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 2px;">Nexvigil AI Surveillance</p>
                                </td>
                            </tr>
                            
                            <!-- Content -->
                            <tr>
                                <td style="padding: 40px;">
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td style="text-align: center; padding-bottom: 25px;">
                                                <div style="background-color: #fee2e2; color: #b91c1c; display: inline-block; padding: 8px 20px; border-radius: 30px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                                                    ACTION REQUIRED
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0; text-align: center;">
                                                    A high-severity unauthorized event has been detected on your surveillance network and requires immediate review.
                                                </p>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 25px;">
                                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                    <tr>
                                                        <td style="color: #64748b; font-size: 13px; font-weight: 600; width: 40%; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">CAMERA NODE</td>
                                                        <td style="color: #0f172a; font-size: 14px; font-weight: bold; padding-bottom: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">{camera_name}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="color: #64748b; font-size: 13px; font-weight: 600; width: 40%; padding: 12px 0; border-bottom: 1px solid #e2e8f0;">DETECTION</td>
                                                        <td style="color: #dc2626; font-size: 14px; font-weight: bold; text-transform: uppercase; padding: 12px 0; text-align: right; border-bottom: 1px solid #e2e8f0;">{alert.get('object_detected')}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="color: #64748b; font-size: 13px; font-weight: 600; padding: 12px 0; border-bottom: 1px solid #e2e8f0;">CONFIDENCE MATCH</td>
                                                        <td style="color: #0f172a; font-size: 14px; font-weight: bold; padding: 12px 0; text-align: right; border-bottom: 1px solid #e2e8f0;">{confidence}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="color: #64748b; font-size: 13px; font-weight: 600; padding-top: 12px;">UTC TIMESTAMP</td>
                                                        <td style="color: #0f172a; font-size: 14px; font-weight: bold; padding-top: 12px; text-align: right;">{timestamp_str}</td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        
                                        <tr>
                                            <td style="padding-top: 25px;">
                                                <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
                                                    <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
                                                        <strong>Log ID:</strong> <span style="font-family: monospace;">{alert.get('id')}</span><br>
                                                        Automated AI verification identified a <strong>{alert.get('object_detected')}</strong> with <strong>{confidence}</strong> confidence at <strong>{camera_name}</strong>.
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                        
                                        <tr>
                                            <td style="text-align: center; padding-top: 35px;">
                                                <a href="{settings.FRONTEND_URL}/dashboard/alerts/{alert.get('id')}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                                                    Review Full Investigation
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">{"Evidence captured and stored in vault. Video link available in dashboard." if alert.get("video_path") else "Alert logged successfully."}</p>
                                    <p style="color: #cbd5e1; font-size: 10px; margin: 5px 0 0 0;">Nexvigil Enterprise Security © 2026</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

        msg = MIMEMultipart()
        msg['From'] = f"Nexvigil Command Center <{smtp_user}>"
        msg['To'] = recipient
        msg['Subject'] = subject
        msg.attach(MIMEText(body_html, 'html'))

        # Attach Screenshot
        screenshot_path = alert.get("screenshot_path")
        if screenshot_path:
            full_path = os.path.join(settings.MEDIA_DIR, screenshot_path)
            if os.path.exists(full_path):
                try:
                    with open(full_path, 'rb') as f:
                        img_data = f.read()
                        image = MIMEImage(img_data, name=os.path.basename(full_path))
                        msg.attach(image)
                except Exception as e:
                    logger.error(f"Failed to attach screenshot: {e}")

        # Send
        try:
            await asyncio.to_thread(self._send_smtp_sync, msg, smtp_user, smtp_pass)
            
            # Log success
            await db.db[self.log_collection].insert_one({
                "camera_id": alert.get("camera_id"),
                "alert_id": alert.get("id"),
                "recipient": recipient,
                "timestamp": datetime.now(timezone.utc),
                "success": True
            })
            logger.info(f"Critical alert email sent to {recipient}")
        except Exception as e:
            logger.error(f"SMTP error: {e}")
            await db.db[self.log_collection].insert_one({
                "camera_id": alert.get("camera_id"),
                "alert_id": alert.get("id"),
                "recipient": recipient,
                "timestamp": datetime.now(timezone.utc),
                "success": False,
                "error": str(e)
            })

    def _send_smtp_sync(self, msg: MIMEMultipart, user: str, password: str):
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(msg)

    async def test_connection(self) -> dict:
        """
        Test SMTP connection.
        """
        try:
            from app.services.ai_service import ai_service
            config = (await ai_service.get_config()).model_dump()
            
            smtp_user = config.get("sender_email") or settings.SMTP_USER
            smtp_pass = config.get("sender_app_password") or settings.SMTP_PASS
            if smtp_pass:
                smtp_pass = smtp_pass.replace(" ", "")
            
            if not smtp_user or not smtp_pass or smtp_user == "your_email@gmail.com":
                return {"status": "error", "message": "SMTP Sender credentials missing from both config and .env"}
                
            def _sync_test():
                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=5) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_pass)
                    return True
            
            await asyncio.to_thread(_sync_test)
            return {"status": "connected", "message": "Connected successfully"}
        except Exception as e:
            logger.error(f"SMTP Test Error: {e}")
            return {"status": "error", "message": str(e)}

    async def send_test_email(self, recipient: str) -> dict:
        """
        Send a test email to verify configuration.
        """
        from app.services.ai_service import ai_service
        config = (await ai_service.get_config()).model_dump()
        
        smtp_user = config.get("sender_email") or settings.SMTP_USER
        smtp_pass = config.get("sender_app_password") or settings.SMTP_PASS
        if smtp_pass:
            smtp_pass = smtp_pass.replace(" ", "")

        if not smtp_user or not smtp_pass:
             return {"success": False, "message": "Sender Email and App Password must be configured first."}

        subject = "Nexvigil System - Authentication Verified"
        body_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nexvigil Authentication</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 40px 20px;">
                <tr>
                    <td align="center">
                        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);">
                            <!-- Header -->
                            <tr>
                                <td style="background-color: #1e3a8a; padding: 30px 40px; text-align: center;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px;">N E X V I G I L</h1>
                                    <p style="color: #93c5fd; font-size: 13px; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 2px;">Advanced AI Surveillance</p>
                                </td>
                            </tr>
                            
                            <!-- Content -->
                            <tr>
                                <td style="padding: 40px;">
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td style="text-align: center; padding-bottom: 25px;">
                                                <div style="background-color: #dcfce7; color: #166534; display: inline-block; padding: 8px 20px; border-radius: 30px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                                                    Connection Verified
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 15px 0; text-align: center;">SMTP Configuration Successful</h2>
                                                <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0; text-align: center;">
                                                    Your Nexvigil AI surveillance node has successfully authenticated with Google's secure SMTP relay. Professional critical event alerts will now be actively dispatched to this address.
                                                </p>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                    <tr>
                                                        <td style="color: #64748b; font-size: 13px; font-weight: 600; width: 40%; padding-bottom: 10px;">AUTHORIZED EMAIL:</td>
                                                        <td style="color: #0f172a; font-size: 14px; font-weight: bold; padding-bottom: 10px;">{smtp_user}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="color: #64748b; font-size: 13px; font-weight: 600; padding-bottom: 10px;">DISPATCH TARGET:</td>
                                                        <td style="color: #0f172a; font-size: 14px; font-weight: bold; padding-bottom: 10px;">{recipient}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="color: #64748b; font-size: 13px; font-weight: 600;">ENCRYPTION:</td>
                                                        <td style="color: #059669; font-size: 14px; font-weight: bold;">TLS SECURED (Port 587)</td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">Automated System Diagnostics • Nexvigil Backend API</p>
                                    <p style="color: #cbd5e1; font-size: 10px; margin: 5px 0 0 0;">Do not reply directly to this automated heartbeat.</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

        msg = MIMEMultipart()
        msg['From'] = f"Nexvigil Security <{smtp_user}>"
        msg['To'] = recipient
        msg['Subject'] = subject
        msg.attach(MIMEText(body_html, 'html'))
        
        try:
            await asyncio.to_thread(self._send_smtp_sync, msg, smtp_user, smtp_pass)
            return {"success": True, "message": f"Test email sent successfully to {recipient}"}
        except Exception as e:
            logger.error(f"Test email failed: {e}")
            return {"success": False, "message": str(e)}

email_service = EmailService()
