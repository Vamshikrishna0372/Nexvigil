from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
client = MongoClient(os.getenv("MONGO_URI"))
db = client["nexvigil"]

res = db.cameras.update_many({}, {"$set": {"status": "active"}})
print(f"Updated {res.modified_count} cameras to 'active'")

for cam in db.cameras.find({}):
    print(f"ID: {cam['_id']}, Name: {cam.get('camera_name')}, Status: {cam.get('status')}")
