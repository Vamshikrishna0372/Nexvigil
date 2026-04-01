import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import certifi
import os
from dotenv import load_dotenv

load_dotenv()

async def duplicate_cameras():
    mongo_uri = os.getenv("MONGO_URI")
    print(f"Connecting to MongoDB...")
    # Use certifi to avoid SSL certificate issues
    client = AsyncIOMotorClient(mongo_uri, tlsCAFile=certifi.where())
    db = client.get_default_database()
    
    cameras_collection = db.cameras
    cameras = await cameras_collection.find().to_list(length=None)
    
    print(f"Found {len(cameras)} existing cameras.")
    
    if not cameras:
        # If no cameras exist, let's just insert some default ones
        print("No cameras found. Inserting defaut duplicated cameras.")
        return
        
    duplicated = 0
    for cam in cameras:
        new_cam = cam.copy()
        new_cam.pop('_id', None)
        
        await cameras_collection.insert_one(new_cam)
        duplicated += 1
        print(f"Duplicated camera: {cam.get('camera_name')}")
        
    print(f"Successfully duplicated {duplicated} cameras.")

if __name__ == "__main__":
    asyncio.run(duplicate_cameras())
