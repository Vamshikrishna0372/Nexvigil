import pymongo
import os
from dotenv import load_dotenv

load_dotenv()

def fix():
    client = pymongo.MongoClient(os.getenv("MONGO_URI"))
    db = client["nexvigil"]
    res = db["cameras"].update_many({}, {"$set": {"status": "active", "health_status": "online"}})
    print(f"Updated {res.modified_count} cameras")
    
    # Also check rules
    rules = db["detection_rules"].count_documents({})
    print(f"Total Rules: {rules}")

if __name__ == "__main__":
    fix()
