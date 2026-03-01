from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client.nexvigil

cameras = db.cameras.find({})
print("--- Cameras in DB ---")
for cam in cameras:
    name = cam.get('camera_name', 'N/A')
    url = cam.get('camera_url', 'N/A')
    status = cam.get('status', 'N/A')
    print(f"ID: {cam['_id']} | Name: {name} | URL: {url} | Status: {status}")
print("--- End ---")
