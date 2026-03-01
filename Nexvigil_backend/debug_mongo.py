import pymongo
import os
from dotenv import load_dotenv

load_dotenv()

def check():
    client = pymongo.MongoClient(os.getenv("MONGO_URI"))
    print(f"Databases: {client.list_database_names()}")
    
    db = client["nexvigil"]
    print(f"Collections in 'nexvigil': {db.list_collection_names()}")
    
    cams = list(db["cameras"].find({}))
    print(f"\nTotal Cameras: {len(cams)}")
    for c in cams:
        print(f"ID: {c['_id']}, Name: {c.get('camera_name')}, Status: {c.get('status')}")
    
    rules = list(db["detection_rules"].find({}))
    print(f"\nTotal Rules: {len(rules)}")
    for r in rules[:5]:
        print(f"Rule: {r.get('rule_name')}, Owner: {r.get('owner_id')}, Active: {r.get('is_active')}")

if __name__ == "__main__":
    check()
