from bson import ObjectId
from datetime import datetime

def serialize_mongo(document):
    """
    Recursively convert ObjectId to str in a MongoDB document or list of documents.
    """
    if isinstance(document, list):
        return [serialize_mongo(item) for item in document]
    
    if hasattr(document, "model_dump"):
        document = document.model_dump(by_alias=True)
    elif hasattr(document, "dict"):
        document = document.dict(by_alias=True)
        
    if isinstance(document, dict):
        new_doc = {}
        for k, v in document.items():
            if isinstance(v, ObjectId):
                new_doc[k] = str(v)
            elif isinstance(v, datetime):
                # Ensure ISO format with Z for UTC if naive
                if v.tzinfo is None:
                    new_doc[k] = v.isoformat() + "Z"
                else:
                    new_doc[k] = v.isoformat().replace("+00:00", "Z")
            elif isinstance(v, dict) or isinstance(v, list):
                new_doc[k] = serialize_mongo(v)
            else:
                new_doc[k] = v
        
        if "_id" in new_doc and isinstance(new_doc["_id"], ObjectId):
             new_doc["_id"] = str(new_doc["_id"])
             
        return new_doc
        
    if isinstance(document, ObjectId):
        return str(document)
        
    return document
