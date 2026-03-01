from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client.nexvigil

print("--- Camera Details ---")
for cam in db.cameras.find({}):
    cid = str(cam['_id'])
    name = cam.get('camera_name', 'No Name')
    url = cam.get('camera_url', 'No URL')
    status = cam.get('status', 'No Status')
    print(f"ID: {cid}")
    print(f"  Name: {name}")
    print(f"  URL: {url}")
    print(f"  Status: {status}")
print("--- End ---")
