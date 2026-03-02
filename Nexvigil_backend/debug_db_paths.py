import asyncio
import motor.motor_asyncio
import json

async def run():
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb+srv://admin:admin%40vamshi@cluster0.xn2lwhn.mongodb.net/nexvigil?appName=Cluster0")
    db = client["nexvigil"]
    
    cams = await db["cameras"].find().to_list(100)
    print("--- CAMERA IDs ---")
    for cam in cams:
        print(f"ID: {str(cam['_id'])}, Name: {cam.get('camera_name')}")
    
    alerts = await db["alerts"].find().to_list(100)
    print("\n--- ALERTS ---")
    for alert in alerts:
        print(f"ID: {str(alert['_id'])}, Cam: {alert.get('camera_id')}")
        print(f"  Screenshot: {alert.get('screenshot_path')}")
        print(f"  Video: {alert.get('video_path')}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(run())
