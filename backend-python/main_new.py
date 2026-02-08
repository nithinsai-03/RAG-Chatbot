"""
RAG Chatbot - Python Backend with LangChain & LangGraph
FastAPI server providing REST API for the RAG chatbot
Now with PostgreSQL, Authentication, and Conversation Persistence
"""

import os
import uuid
import shutil
import math
from typing import Optional, List, Dict
from datetime import datetime

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Header, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database.db import get_db, init_db, close_db, Base, engine
from database.models import User, Conversation, Message, Document
from services import document_loader, vector_store, llm_service
from services.db_service import ConversationService, MessageService, DocumentService, UserService
from services.auth_service import verify_token, extract_token_from_header
from agents import rag_agent, conversation_agent
from routes import auth_routes, conversation_routes


# ============== Pydantic Models ==============

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    mode: str = "auto"  # 'auto', 'rag', 'general'
    agent: str = "rag"  # 'rag' or 'conversation'


class ChatResponse(BaseModel):
    conversation_id: str
    message_id: str
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
    description="Python backend with LangChain & LangGraph for RAG operations with PostgreSQL",
    version="4.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_routes.router)
app.include_router(conversation_routes.router)

# Upload directory
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ============== Startup & Shutdown Events ==============

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print("\n🚀 Starting RAG Chatbot Backend (Python + PostgreSQL)")
    print("=" * 60)
    
    # Initialize database
    try:
        await init_db()
        print("✅ Database initialized")
    except Exception as e:
        print(f"⚠️ Database init warning: {e}")
    
    # Initialize services
    vector_store.initialize()
    llm_service.initialize()
    
    # Build agent graphs
    rag_agent.build_graph()
    conversation_agent.build_graph()
    
    print("=" * 60)
    print("✅ Server ready!\n")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await close_db()


# ============== Dependency ==============

async def get_current_user_id(authorization: Optional[str] = Header(None)):
    """Get current user ID from token"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header"
        )
    
    token = extract_token_from_header(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header"
        )
    
    token_data = verify_token(token)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    return token_data.user_id


# ============== Health & Info Endpoints ==============

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "version": "4.0.0-python",
        "framework": "FastAPI + LangChain + LangGraph + PostgreSQL",
        "documents_loaded": vector_store.get_document_count(),
        "llm_provider": llm_service.provider,
        "features": {
            "langchain": True,
            "langgraph": True,
            "rag_agent": True,
            "conversation_agent": True,
            "database": True,
            "authentication": True,
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
async def get_stats(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Get system statistics"""
    user = await UserService.get_user_by_id(db, user_id)
    conversations = await ConversationService.get_user_conversations(db, user_id, limit=1000)
    
    return {
        "documents": vector_store.get_document_count(),
        "conversations": len(conversations),
        "llm": llm_service.get_model_info(),
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username
        }
    }


# ============== Document Endpoints ==============

@app.post("/api/documents/upload")
async def upload_documents(
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
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
            
            # Save document metadata to database
            file_type = file.filename.split(".")[-1] if "." in file.filename else "unknown"
            file_size = os.path.getsize(file_path)
            
            await DocumentService.create_document(
                db,
                user_id=user_id,
                filename=file.filename,
                vector_doc_id=doc_id,
                file_type=file_type,
                file_size=file_size,
                chunk_count=len(chunks)
            )
            
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
async def ingest_url(
    request: URLRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Ingest content from a URL"""
    
    if not request.url:
        raise HTTPException(status_code=400, detail="URL is required")
    
    try:
        doc_id = str(uuid.uuid4())
        
        # Load URL with LangChain
        chunks = await document_loader.load_url(request.url)
        
        # Add to vector store
        await vector_store.add_documents(doc_id, request.url, chunks)
        
        # Save to database
        await DocumentService.create_document(
            db,
            user_id=user_id,
            filename=request.url,
            vector_doc_id=doc_id,
            file_type="url",
            chunk_count=len(chunks)
        )
        
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
async def list_documents(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """List user's documents"""
    documents = await DocumentService.get_user_documents(db, user_id)
    return {
        "documents": [
            {
                "id": doc.id,
                "filename": doc.filename,
                "doc_id": doc.vector_doc_id,
                "chunks": doc.chunk_count,
                "file_type": doc.file_type,
                "file_size": doc.file_size,
                "created_at": doc.created_at.isoformat()
            }
            for doc in documents
        ]
    }


@app.delete("/api/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Delete a document"""
    
    doc = await DocumentService.get_document(db, doc_id)
    
    if not doc or doc.user_id != user_id:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Remove from vector store
    if vector_store.remove_document(doc.vector_doc_id):
        # Mark as deleted in database
        await DocumentService.delete_document(db, doc_id)
        return {"success": True, "message": "Document removed"}
    else:
        raise HTTPException(status_code=500, detail="Failed to remove document")


@app.post("/api/documents/clear")
async def clear_documents(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Clear all user documents"""
    
    documents = await DocumentService.get_user_documents(db, user_id, limit=1000)
    
    for doc in documents:
        vector_store.remove_document(doc.vector_doc_id)
        await DocumentService.delete_document(db, doc.id)
    
    return {"success": True, "message": "All documents cleared"}


# ============== Chat Endpoints ==============

@app.post("/api/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Main chat endpoint using LangGraph agents with persistent conversations"""
    
    if not request.message:
        raise HTTPException(status_code=400, detail="Message is required")
    
    # Get or create conversation
    conversation_id = request.conversation_id
    if conversation_id:
        conversation = await ConversationService.get_conversation(db, conversation_id)
        if not conversation or conversation.user_id != user_id:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = await ConversationService.create_conversation(
            db,
            user_id=user_id,
            mode=request.mode,
            agent=request.agent
        )
        conversation_id = conversation.id
    
    # Save user message to database
    await MessageService.create_message(
        db,
        conversation_id=conversation_id,
        role="user",
        content=request.message,
        mode=request.mode
    )
    
    print(f"\n💬 Chat [{request.agent}/{request.mode}]: {request.message[:50]}...")
    
    try:
        # Get chat history from database
        messages = await MessageService.get_conversation_messages(db, conversation_id)
        chat_history = [
            {
                "role": msg.role,
                "content": msg.content
            }
            for msg in messages
        ]
        
        # Use appropriate LangGraph agent
        if request.agent == "conversation":
            result = await conversation_agent.run(
                query=request.message,
                conversation_id=conversation_id,
                chat_history=chat_history
            )
        else:
            result = await rag_agent.run(
                query=request.message,
                mode=request.mode,
                chat_history=chat_history
            )
        
        # Save assistant message to database
        assistant_msg = await MessageService.create_message(
            db,
            conversation_id=conversation_id,
            role="assistant",
            content=result["answer"],
            mode=result["mode"],
            sources=result.get("sources", [])
        )
        
        return ChatResponse(
            conversation_id=conversation_id,
            message_id=assistant_msg.id,
            answer=result["answer"],
            mode=result["mode"],
            sources=result.get("sources", []),
            agent=request.agent
        )
        
    except Exception as e:
        print(f"❌ Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== Search Endpoints ==============

@app.post("/api/search")
async def search_documents(
    request: SearchRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
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
            distance = float(score)
            similarity = math.exp(-distance) if distance >= 0 else 0
            formatted_results.append({
                "content": doc.page_content,
                "metadata": doc.metadata,
                "score": float(similarity),
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
