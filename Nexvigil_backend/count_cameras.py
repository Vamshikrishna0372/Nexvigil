
import motor.motor_asyncio
import asyncio

async def count_cams():
    uri = "mongodb+srv://admin:admin%40vamshi@cluster0.xn2lwhn.mongodb.net/nexvigil?appName=Cluster0"
    client = motor.motor_asyncio.AsyncIOMotorClient(uri)
    db = client.nexvigil
    count = await db.cameras.count_documents({})
    print(f"Total cameras in nexvigil.cameras: {count}")
    
    # Also check if there's another DB name
    dbs = await client.list_database_names()
    print(f"All databases: {dbs}")
    
    for dbname in dbs:
        c = await client[dbname].cameras.count_documents({})
        if c > 0:
            print(f"Database {dbname} has {c} cameras")

    client.close()

if __name__ == "__main__":
    asyncio.run(count_cams())
