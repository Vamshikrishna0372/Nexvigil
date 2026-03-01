
import motor.motor_asyncio
import asyncio
from bson import ObjectId

async def get_cam_status():
    uri = "mongodb+srv://admin:admin%40vamshi@cluster0.xn2lwhn.mongodb.net/nexvigil?appName=Cluster0"
    client = motor.motor_asyncio.AsyncIOMotorClient(uri)
    db = client.nexvigil
    
    camera_id = "69976176a578a5a0ff9791fb"
    cam = await db.cameras.find_one({"_id": ObjectId(camera_id)})
    if cam:
        print(f"ID: {cam['_id']}")
        print(f"Name: {cam.get('camera_name')}")
        print(f"Status: {cam.get('status')}")
        print(f"URL: {cam.get('camera_url')}")
    else:
        print("Camera not found")
        
    client.close()

if __name__ == "__main__":
    asyncio.run(get_cam_status())
