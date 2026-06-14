from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import requests
import asyncio
from vector_search import vector_engine

app = FastAPI(
    title="Issue Tracker AI & API Gateway",
    description="Microservice acting as API Gateway and handling vector search",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os

SPRING_BOOT_URL = os.environ.get("SPRING_BOOT_URL", "http://localhost:8088")
NODEJS_URL = os.environ.get("NODEJS_URL", "http://localhost:3000")

# --- Pydantic Schemas ---
class EmbeddingCreate(BaseModel):
    issue_id: int
    text: str

# --- Helper function to extract headers ---
def get_forward_headers(request: Request):
    headers = {"Content-Type": "application/json"}
    if "authorization" in request.headers:
        headers["Authorization"] = request.headers["authorization"]
    return headers

# --- Endpoints ---

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "FastAPI API Gateway & Vector Search"
    }

# ==========================================
# SPRING BOOT PROXIES (Users & Issues)
# ==========================================

@app.get("/api/users")
def get_users(request: Request):
    resp = requests.get(f"{SPRING_BOOT_URL}/api/users", headers=get_forward_headers(request))
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
def get_status(request: Request):
    resp = requests.get(f"{SPRING_BOOT_URL}/api/status")
    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type"))

@app.get("/api/issues")
def get_issues(request: Request):
    resp = requests.get(f"{SPRING_BOOT_URL}/api/issues", headers=get_forward_headers(request))
    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type"))

@app.post("/api/issues")
async def create_issue(request: Request):
    body = await request.body()
    resp = await asyncio.to_thread(requests.post, f"{SPRING_BOOT_URL}/api/issues", data=body, headers=get_forward_headers(request))
    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type"))

@app.get("/api/issues/{issue_id}")
def get_issue(issue_id: int, request: Request):
    resp = requests.get(f"{SPRING_BOOT_URL}/api/issues/{issue_id}", headers=get_forward_headers(request))
    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type"))

@app.put("/api/issues/{issue_id}")
async def update_issue(issue_id: int, request: Request, updater: str = Query(None)):
    body = await request.body()
    url = f"{SPRING_BOOT_URL}/api/issues/{issue_id}"
    if updater:
        url += f"?updater={updater}"
    resp = await asyncio.to_thread(requests.put, url, data=body, headers=get_forward_headers(request))
    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type"))

@app.delete("/api/issues/{issue_id}")
def delete_issue(issue_id: int, request: Request):
    resp = requests.delete(f"{SPRING_BOOT_URL}/api/issues/{issue_id}", headers=get_forward_headers(request))
    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type"))

# ==========================================
# NODE.JS PROXIES (Comments & Logs)
# ==========================================

@app.post("/api/comments")
async def create_comment(request: Request):
    body = await request.body()
    resp = await asyncio.to_thread(requests.post, f"{NODEJS_URL}/api/comments", data=body, headers=get_forward_headers(request))
    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type"))

@app.post("/api/issues/{issue_id}/comments")
async def create_comment_issue(issue_id: int, request: Request):
    # Frontend sends standard comment body, we proxy to Node.js which expects issue_id in body
    # Actually, the Node backend expects issue_id in body, we should ensure it's there
    # It's better to proxy directly to /api/comments if body has issue_id
    body = await request.body()
    resp = await asyncio.to_thread(requests.post, f"{NODEJS_URL}/api/comments", data=body, headers=get_forward_headers(request))
    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type"))

@app.get("/api/comments/{issue_id}")
@app.get("/api/issues/{issue_id}/comments")
def get_comments(issue_id: int, request: Request):
    resp = requests.get(f"{NODEJS_URL}/api/comments/{issue_id}", headers=get_forward_headers(request))
    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type"))

@app.post("/api/logs")
async def create_log(request: Request):
    body = await request.body()
    resp = await asyncio.to_thread(requests.post, f"{NODEJS_URL}/api/logs", data=body, headers=get_forward_headers(request))
    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type"))

@app.get("/api/logs")
@app.get("/api/issues/logs")
def get_all_logs(request: Request, limit: int = 10):
    resp = requests.get(f"{NODEJS_URL}/api/logs?limit={limit}", headers=get_forward_headers(request))
    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type"))

@app.get("/api/logs/{issue_id}")
@app.get("/api/issues/{issue_id}/logs")
def get_logs(issue_id: int, request: Request):
    resp = requests.get(f"{NODEJS_URL}/api/logs/{issue_id}", headers=get_forward_headers(request))
    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type"))

# ==========================================
# NATIVE ENDPOINTS (Vector Search)
# ==========================================

@app.post("/api/embeddings")
def index_issue_text(data: EmbeddingCreate):
    from database import db_adapter
    vector = vector_engine.text_to_vector(data.text)
    saved = db_adapter.save_embedding(data.issue_id, data.text, vector)
    return {
        "issue_id": saved["issue_id"],
        "text_preview": saved["text"][:50] + "..." if len(saved["text"]) > 50 else saved["text"],
        "vector_dimensions": len(saved["vector"])
    }

@app.get("/api/search")
@app.get("/api/issues/search")
def search_issues(request: Request, query: str = Query(..., description="The query to search issues semantically"), limit: int = 10):
    from database import db_adapter
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
        resp = requests.get(f"{SPRING_BOOT_URL}/api/issues/{issue_id}", headers=get_forward_headers(request))
        if resp.status_code == 200:
            enriched_results.append({
                "issue": resp.json(),
                "score": r["score"]
            })
            
    return enriched_results

@app.get("/api/issues/{issue_id}/similar")
def get_similar_issues(issue_id: int, request: Request, limit: int = 5):
    from database import db_adapter
    all_embeddings = db_adapter.get_all_embeddings()
    if not all_embeddings:
        return []
        
    target_vector = None
    for item in all_embeddings:
        if item["issue_id"] == issue_id:
            target_vector = item["vector"]
            break
            
    if not target_vector:
        return []
        
    results = []
    for item in all_embeddings:
        if item["issue_id"] == issue_id:
            continue
        score = vector_engine.cosine_similarity(target_vector, item["vector"])
        if score > 0.1:
            results.append({
                "issue_id": item["issue_id"],
                "score": round(score, 4)
            })
    results.sort(key=lambda x: x["score"], reverse=True)
    results = results[:limit]
    
    enriched_results = []
    for r in results:
        resp = requests.get(f"{SPRING_BOOT_URL}/api/issues/{r['issue_id']}", headers=get_forward_headers(request))
        if resp.status_code == 200:
            enriched_results.append({
                "issue": resp.json(),
                "score": r["score"]
            })
            
    return enriched_results

@app.get("/api/issues/{issue_id}/summary")
def get_issue_summary(issue_id: int, request: Request):
    # Mock AI Summarization
    resp = requests.get(f"{SPRING_BOOT_URL}/api/issues/{issue_id}", headers=get_forward_headers(request))
    if resp.status_code != 200:
        raise HTTPException(status_code=404, detail="Issue not found")
    issue = resp.json()
    summary = f"AI Summary: This issue titled '{issue.get('title')}' is related to {issue.get('category', 'general')} problems. It was reported by {issue.get('createdBy', {}).get('username', 'a user')}. Immediate attention is suggested to resolve the underlying bug."
    return {"summary": summary}

@app.get("/api/issues/{issue_id}/prediction")
def get_issue_prediction(issue_id: int, request: Request):
    # Mock Resolution Time Prediction
    resp = requests.get(f"{SPRING_BOOT_URL}/api/issues/{issue_id}", headers=get_forward_headers(request))
    if resp.status_code != 200:
        raise HTTPException(status_code=404, detail="Issue not found")
    issue = resp.json()
    category = issue.get('category', '')
    
    predicted_days = 3
    if "Critical" in category or "Security" in category:
        predicted_days = 1
    elif "Payment" in category:
        predicted_days = 2
        
    return {"predictedResolutionTime": f"{predicted_days} day(s)"}
