import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import json

load_dotenv()

async def run():
    client = AsyncIOMotorClient(os.getenv('MONGO_URI'))
    db = client['nexvigil']
    rules = await db['detection_rules'].find().to_list(100)
    for r in rules:
        r['_id'] = str(r['_id'])
        if 'created_at' in r: r['created_at'] = str(r['created_at'])
        if 'updated_at' in r: r['updated_at'] = str(r['updated_at'])
    with open('rules_dump.json', 'w') as f:
        json.dump(rules, f, indent=2)
    client.close()

if __name__ == "__main__":
    asyncio.run(run())
