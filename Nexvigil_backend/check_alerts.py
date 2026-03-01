from pymongo import MongoClient

client = MongoClient('mongodb+srv://admin:admin%40vamshi@cluster0.xn2lwhn.mongodb.net/nexvigil?appName=Cluster0')
db = client['nexvigil']

print("Total alerts:", db.alerts.count_documents({}))

severities = list(db.alerts.aggregate([
    {"$group": {"_id": "$severity", "count": {"$sum": 1}}}
]))

import pprint
pprint.pprint(severities)
