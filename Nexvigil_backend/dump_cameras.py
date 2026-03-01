from pymongo import MongoClient
import os
import json
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

from datetime import datetime

class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        if isinstance(o, datetime):
            return o.isoformat()
        return json.JSONEncoder.default(self, o)

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client.nexvigil

cameras = list(db.cameras.find({}))
with open('cameras_dump.json', 'w') as f:
    json.dump(cameras, f, cls=JSONEncoder, indent=2)

print(f"Dumped {len(cameras)} cameras to cameras_dump.json")
