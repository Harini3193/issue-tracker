from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import requests
import asyncio
from database import db_adapter
from vector_search import vector_engine

app = FastAPI(
    title="Issue Tracker AI & NoSQL Service",
    description="Microservice handling comments, logs, and vector search powered by MongoDB",
    version="1.0.0"
)

# Enable CORS for frontend and Spring Boot integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SPRING_BOOT_URL = "http://localhost:8088"

# --- Pydantic Schemas ---
class CommentCreate(BaseModel):
    issue_id: int
    author: str
    content: str

class CommentPayload(BaseModel):
    author: str
    content: str

class LogCreate(BaseModel):
    issue_id: int
    action: str
    details: str
    performed_by: str

class EmbeddingCreate(BaseModel):
    issue_id: int
    text: str

# --- Endpoints ---

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "FastAPI Issue Vector Search & NoSQL Service",
        "mongodb_fallback_active": db_adapter.is_fallback
    }

# ==========================================
# SPRING BOOT PROXIES
# ==========================================

@app.get("/api/users")
def get_users():
    resp = requests.get(f"{SPRING_BOOT_URL}/api/users")
    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type"))

@app.post("/api/users/login")
async def login(request: Request):
    body = await request.body()
    resp = await asyncio.to_thread(requests.post, f"{SPRING_BOOT_URL}/api/users/login", data=body, headers={"Content-Type": "application/json"})
    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type"))

@app.post("/api/users/signup")
async def signup(request: Request):
    body = await request.body()
    resp = await asyncio.to_thread(requests.post, f"{SPRING_BOOT_URL}/api/users/signup", data=body, headers={"Content-Type": "application/json"})
    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type"))

@app.get("/api/status")
def get_status():
    resp = requests.get(f"{SPRING_BOOT_URL}/api/status")
    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type"))

@app.get("/api/issues")
def get_issues():
    resp = requests.get(f"{SPRING_BOOT_URL}/api/issues")
    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type"))

@app.post("/api/issues")
async def create_issue(request: Request):
    body = await request.body()
    resp = await asyncio.to_thread(requests.post, f"{SPRING_BOOT_URL}/api/issues", data=body, headers={"Content-Type": "application/json"})
    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type"))

@app.get("/api/issues/{issue_id}")
def get_issue(issue_id: int):
    resp = requests.get(f"{SPRING_BOOT_URL}/api/issues/{issue_id}")
    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type"))

@app.put("/api/issues/{issue_id}")
async def update_issue(issue_id: int, request: Request, updater: str = Query(None)):
    body = await request.body()
    url = f"{SPRING_BOOT_URL}/api/issues/{issue_id}"
    if updater:
        url += f"?updater={updater}"
    resp = await asyncio.to_thread(requests.put, url, data=body, headers={"Content-Type": "application/json"})
    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type"))

# ==========================================
# NATIVE FASTAPI ENDPOINTS
# ==========================================

@app.post("/api/comments")
def create_comment_legacy(comment: CommentCreate):
    comment_doc = {
        "issue_id": comment.issue_id,
        "author": comment.author,
        "content": comment.content,
        "created_at": datetime.utcnow().isoformat()
    }
    return db_adapter.insert_comment(comment_doc)

@app.post("/api/issues/{issue_id}/comments")
def create_comment_frontend(issue_id: int, comment: CommentPayload):
    comment_doc = {
        "issue_id": issue_id,
        "author": comment.author,
        "content": comment.content,
        "created_at": datetime.utcnow().isoformat()
    }
    inserted = db_adapter.insert_comment(comment_doc)
    
    # Log comment addition
    log_doc = {
        "issue_id": issue_id,
        "action": "COMMENT_ADDED",
        "details": f"Comment added by {comment.author}",
        "performed_by": comment.author,
        "created_at": datetime.utcnow().isoformat()
    }
    db_adapter.insert_log(log_doc)
    
    return inserted

@app.get("/api/comments/{issue_id}")
@app.get("/api/issues/{issue_id}/comments")
def get_comments(issue_id: int):
    return db_adapter.get_comments(issue_id)

@app.post("/api/logs")
def create_log(log: LogCreate):
    log_doc = {
        "issue_id": log.issue_id,
        "action": log.action,
        "details": log.details,
        "performed_by": log.performed_by,
        "created_at": datetime.utcnow().isoformat()
    }
    return db_adapter.insert_log(log_doc)

@app.get("/api/logs")
@app.get("/api/issues/logs")
def get_all_logs(limit: int = 10):
    if not db_adapter.is_fallback:
        try:
            cursor = db_adapter.db.issue_logs.find({}).sort("created_at", -1).limit(limit)
            return [{**doc, "_id": str(doc["_id"])} for doc in cursor]
        except Exception:
            return []
    logs = db_adapter.fallback_db.find("issue_logs")
    return sorted(logs, key=lambda x: x.get("created_at", ""), reverse=True)[:limit]

@app.get("/api/logs/{issue_id}")
@app.get("/api/issues/{issue_id}/logs")
def get_logs(issue_id: int):
    return db_adapter.get_logs(issue_id)

@app.post("/api/embeddings")
def index_issue_text(data: EmbeddingCreate):
    vector = vector_engine.text_to_vector(data.text)
    saved = db_adapter.save_embedding(data.issue_id, data.text, vector)
    return {
        "issue_id": saved["issue_id"],
        "text_preview": saved["text"][:50] + "..." if len(saved["text"]) > 50 else saved["text"],
        "vector_dimensions": len(saved["vector"])
    }

@app.get("/api/search")
@app.get("/api/issues/search")
def search_issues(query: str = Query(..., description="The query to search issues semantically"), limit: int = 10):
    if not query.strip():
        return []
    query_vector = vector_engine.text_to_vector(query)
    all_embeddings = db_adapter.get_all_embeddings()
    if not all_embeddings:
        return []
        
    results = []
    for item in all_embeddings:
        score = vector_engine.cosine_similarity(query_vector, item["vector"])
        if score > 0.05:
            results.append({
                "issue_id": item["issue_id"],
                "score": round(score, 4)
            })
    results.sort(key=lambda x: x["score"], reverse=True)
    results = results[:limit]
    
    enriched_results = []
    for r in results:
        issue_id = r["issue_id"]
        resp = requests.get(f"{SPRING_BOOT_URL}/api/issues/{issue_id}")
        if resp.status_code == 200:
            enriched_results.append({
                "issue": resp.json(),
                "score": r["score"]
            })
            
    return enriched_results
