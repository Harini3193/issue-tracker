import os
import json
import logging
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Database")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = "issue_tracker_db"
JSON_DB_PATH = os.path.join(os.path.dirname(__file__), "db.json")

# Initialize collections in memory/file-fallback if MongoDB is not available
class JSONFallbackDB:
    def __init__(self, filepath):
        self.filepath = filepath
        if not os.path.exists(self.filepath):
            self.save_data({"issue_comments": [], "issue_logs": [], "issue_embeddings": []})

    def load_data(self):
        try:
            with open(self.filepath, "r") as f:
                return json.load(f)
        except Exception:
            return {"issue_comments": [], "issue_logs": [], "issue_embeddings": []}

    def save_data(self, data):
        try:
            with open(self.filepath, "w") as f:
                json.dump(data, f, indent=4, default=str)
        except Exception as e:
            logger.error(f"Error saving to JSON database: {e}")

    def insert_one(self, collection_name, document):
        data = self.load_data()
        if collection_name not in data:
            data[collection_name] = []
        
        # Ensure document is serializable or handle keys
        doc_copy = dict(document)
        if "_id" in doc_copy:
            doc_copy["_id"] = str(doc_copy["_id"])
        
        data[collection_name].append(doc_copy)
        self.save_data(data)
        return doc_copy

    def find(self, collection_name, query=None):
        data = self.load_data()
        docs = data.get(collection_name, [])
        if not query:
            return docs
        
        results = []
        for doc in docs:
            match = True
            for k, v in query.items():
                if doc.get(k) != v:
                    match = False
                    break
            if match:
                results.append(doc)
        return results

    def find_one(self, collection_name, query):
        results = self.find(collection_name, query)
        return results[0] if results else None

    def update_one(self, collection_name, query, update_data, upsert=False):
        data = self.load_data()
        docs = data.get(collection_name, [])
        
        updated = False
        for doc in docs:
            match = True
            for k, v in query.items():
                if doc.get(k) != v:
                    match = False
                    break
            if match:
                # Simple set update
                if "$set" in update_data:
                    doc.update(update_data["$set"])
                else:
                    doc.update(update_data)
                updated = True
                break
        
        if not updated and upsert:
            new_doc = dict(query)
            if "$set" in update_data:
                new_doc.update(update_data["$set"])
            else:
                new_doc.update(update_data)
            docs.append(new_doc)
            data[collection_name] = docs
        
        self.save_data(data)
        return updated

# Global Database Adapter
class DatabaseAdapter:
    def __init__(self):
        self.client = None
        self.db = None
        self.fallback_db = None
        self.is_fallback = False
        
        try:
            logger.info(f"Connecting to MongoDB at {MONGO_URI}...")
            # Set a 2-second timeout to fail fast if MongoDB is not running
            self.client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
            self.client.server_info()  # Forces a call to check connectivity
            self.db = self.client[DB_NAME]
            logger.info("Successfully connected to MongoDB!")
        except (ConnectionFailure, Exception) as e:
            logger.warning(f"MongoDB connection failed: {e}. Falling back to local file database.")
            self.is_fallback = True
            self.fallback_db = JSONFallbackDB(JSON_DB_PATH)

    def insert_comment(self, comment):
        if not self.is_fallback:
            res = self.db.issue_comments.insert_one(comment)
            comment["_id"] = str(res.inserted_id)
            return comment
        return self.fallback_db.insert_one("issue_comments", comment)

    def get_comments(self, issue_id):
        query = {"issue_id": int(issue_id)}
        if not self.is_fallback:
            cursor = self.db.issue_comments.find(query)
            return [{**doc, "_id": str(doc["_id"])} for doc in cursor]
        return self.fallback_db.find("issue_comments", query)

    def insert_log(self, log):
        if not self.is_fallback:
            res = self.db.issue_logs.insert_one(log)
            log["_id"] = str(res.inserted_id)
            return log
        return self.fallback_db.insert_one("issue_logs", log)

    def get_logs(self, issue_id):
        query = {"issue_id": int(issue_id)}
        if not self.is_fallback:
            cursor = self.db.issue_logs.find(query)
            return [{**doc, "_id": str(doc["_id"])} for doc in cursor]
        return self.fallback_db.find("issue_logs", query)

    def save_embedding(self, issue_id, text, vector):
        query = {"issue_id": int(issue_id)}
        doc = {"issue_id": int(issue_id), "text": text, "vector": vector}
        if not self.is_fallback:
            self.db.issue_embeddings.update_one(query, {"$set": doc}, upsert=True)
            return doc
        self.fallback_db.update_one("issue_embeddings", query, doc, upsert=True)
        return doc

    def get_all_embeddings(self):
        if not self.is_fallback:
            cursor = self.db.issue_embeddings.find({})
            return [{**doc, "_id": str(doc["_id"])} for doc in cursor]
        return self.fallback_db.find("issue_embeddings")

# Singleton instance
db_adapter = DatabaseAdapter()
