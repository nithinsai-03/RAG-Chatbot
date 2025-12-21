"""
RAG Chatbot - Python Backend with LangChain & LangGraph
FastAPI server providing REST API for the RAG chatbot
"""

import os
import uuid
import shutil
import math
from typing import Optional, List, Dict
from datetime import datetime

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import settings
from services import document_loader, vector_store, llm_service
from agents import rag_agent, conversation_agent


# ============== Pydantic Models ==============

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    mode: str = "auto"  # 'auto', 'rag', 'general'
    agent: str = "rag"  # 'rag' or 'conversation'


class ChatResponse(BaseModel):
    conversation_id: str
    answer: str
    mode: str
    sources: List[Dict] = []
    agent: str


class URLRequest(BaseModel):
    url: str


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5


class ModelSetRequest(BaseModel):
    provider: str
    model: str


# ============== FastAPI App ==============

app = FastAPI(
    title="RAG Chatbot API",
    description="Python backend with LangChain & LangGraph for RAG operations",
    version="3.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Conversation memory store
conversations: Dict[str, Dict] = {}

# Upload directory
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ============== Startup Events ==============

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print("\n🚀 Starting RAG Chatbot Backend (Python)")
    print("=" * 50)
    
    # Initialize services
    vector_store.initialize()
    llm_service.initialize()
    
    # Build agent graphs
    rag_agent.build_graph()
    conversation_agent.build_graph()
    
    print("=" * 50)
    print("✅ Server ready!\n")


# ============== Health & Info Endpoints ==============

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "version": "3.0.0-python",
        "framework": "FastAPI + LangChain + LangGraph",
        "documents_loaded": vector_store.get_document_count(),
        "llm_provider": llm_service.provider,
        "features": {
            "langchain": True,
            "langgraph": True,
            "rag_agent": True,
            "conversation_agent": True,
        }
    }


@app.get("/api/models")
async def get_models():
    """Get available LLM models"""
    return {
        "models": llm_service.get_available_models(),
        "current": llm_service.get_model_info(),
    }


@app.get("/api/stats")
async def get_stats():
    """Get system statistics"""
    return {
        "documents": vector_store.get_document_count(),
        "conversations": len(conversations),
        "llm": llm_service.get_model_info(),
    }


# ============== Document Endpoints ==============

@app.post("/api/documents/upload")
async def upload_documents(files: List[UploadFile] = File(...)):
    """Upload and process documents"""
    
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
    
    results = []
    
    for file in files:
        doc_id = str(uuid.uuid4())
        file_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{file.filename}")
        
        try:
            # Save file temporarily
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Process with LangChain document loader
            chunks = await document_loader.load_file(file_path, file.filename)
            
            # Add to vector store
            await vector_store.add_documents(doc_id, file.filename, chunks)
            
            results.append({
                "filename": file.filename,
                "doc_id": doc_id,
                "chunks": len(chunks),
                "status": "success"
            })
            
            print(f"✅ Processed: {file.filename} ({len(chunks)} chunks)")
            
        except Exception as e:
            results.append({
                "filename": file.filename,
                "status": "error",
                "error": str(e)
            })
            print(f"❌ Error processing {file.filename}: {e}")
        
        finally:
            # Clean up temporary file
            if os.path.exists(file_path):
                os.remove(file_path)
    
    return {
        "success": True,
        "processed": len([r for r in results if r["status"] == "success"]),
        "failed": len([r for r in results if r["status"] == "error"]),
        "results": results,
        "total_documents": vector_store.get_document_count(),
    }


@app.post("/api/documents/url")
async def ingest_url(request: URLRequest):
    """Ingest content from a URL"""
    
    if not request.url:
        raise HTTPException(status_code=400, detail="URL is required")
    
    try:
        doc_id = str(uuid.uuid4())
        
        # Load URL with LangChain
        chunks = await document_loader.load_url(request.url)
        
        # Add to vector store
        await vector_store.add_documents(doc_id, request.url, chunks)
        
        print(f"✅ Ingested URL: {request.url} ({len(chunks)} chunks)")
        
        return {
            "success": True,
            "url": request.url,
            "doc_id": doc_id,
            "chunks": len(chunks),
            "total_documents": vector_store.get_document_count(),
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/documents")
async def list_documents():
    """List all uploaded documents"""
    return {
        "documents": vector_store.get_documents(),
    }


@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document"""
    
    if vector_store.remove_document(doc_id):
        return {"success": True, "message": "Document removed"}
    else:
        raise HTTPException(status_code=404, detail="Document not found")


@app.post("/api/documents/clear")
async def clear_documents():
    """Clear all documents"""
    
    await vector_store.clear()
    return {"success": True, "message": "All documents cleared"}


# ============== Chat Endpoints ==============

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Main chat endpoint using LangGraph agents"""
    
    if not request.message:
        raise HTTPException(status_code=400, detail="Message is required")
    
    # Get or create conversation
    conversation_id = request.conversation_id or str(uuid.uuid4())
    
    if conversation_id not in conversations:
        conversations[conversation_id] = {
            "id": conversation_id,
            "messages": [],
            "created_at": datetime.now().isoformat()
        }
    
    conversation = conversations[conversation_id]
    
    # Add user message to history
    conversation["messages"].append({
        "role": "user",
        "content": request.message,
        "timestamp": datetime.now().isoformat()
    })
    
    print(f"\n💬 Chat [{request.agent}/{request.mode}]: {request.message[:50]}...")
    
    try:
        # Use appropriate LangGraph agent
        if request.agent == "conversation":
            result = await conversation_agent.run(
                query=request.message,
                conversation_id=conversation_id,
                chat_history=conversation["messages"]
            )
        else:
            result = await rag_agent.run(
                query=request.message,
                mode=request.mode,
                chat_history=conversation["messages"]
            )
        
        # Add assistant message to history
        conversation["messages"].append({
            "role": "assistant",
            "content": result["answer"],
            "timestamp": datetime.now().isoformat(),
            "mode": result["mode"],
            "sources": result.get("sources", [])
        })
        
        # Trim conversation history
        if len(conversation["messages"]) > 20:
            conversation["messages"] = conversation["messages"][-20:]
        
        return ChatResponse(
            conversation_id=conversation_id,
            answer=result["answer"],
            mode=result["mode"],
            sources=result.get("sources", []),
            agent=request.agent
        )
        
    except Exception as e:
        print(f"❌ Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get conversation history"""
    
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return conversations[conversation_id]


@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation"""
    
    if conversation_id in conversations:
        del conversations[conversation_id]
        return {"success": True, "message": "Conversation deleted"}
    else:
        raise HTTPException(status_code=404, detail="Conversation not found")


# ============== Search Endpoints ==============

@app.post("/api/search")
async def search_documents(request: SearchRequest):
    """Search documents directly"""
    
    if not request.query:
        raise HTTPException(status_code=400, detail="Query is required")
    
    try:
        results = await vector_store.similarity_search_with_scores(
            request.query, 
            k=request.top_k
        )
        
        formatted_results = []
        for doc, score in results:
            # FAISS returns L2 distance (lower is better) as numpy.float32
            # Convert to Python float and then to similarity score (0-1 range)
            distance = float(score)  # Convert numpy.float32 to Python float
            similarity = math.exp(-distance) if distance >= 0 else 0
            formatted_results.append({
                "content": doc.page_content,
                "metadata": doc.metadata,
                "score": float(similarity),  # Ensure it's a Python float
                "distance": distance,
            })
        
        return {"results": formatted_results}
    except Exception as e:
        print(f"❌ Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== Main Entry Point ==============

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
