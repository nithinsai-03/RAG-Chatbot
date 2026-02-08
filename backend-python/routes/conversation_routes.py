"""
Conversation Management Routes
CRUD operations and history management
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from database.db import get_db
from services.db_service import ConversationService, MessageService, UserService
from services.auth_service import verify_token, extract_token_from_header


# ============== Pydantic Models ==============

class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    mode: Optional[str]
    sources: List = []
    created_at: str

    class Config:
        from_attributes = True


class ConversationDetailResponse(BaseModel):
    id: str
    title: str
    mode: str
    agent: str
    created_at: str
    updated_at: str
    is_archived: bool
    message_count: Optional[int] = None


class ConversationListResponse(BaseModel):
    id: str
    title: str
    mode: str
    created_at: str
    updated_at: str
    last_message: Optional[str] = None


class CreateConversationRequest(BaseModel):
    title: Optional[str] = None
    mode: str = "auto"
    agent: str = "rag"


class UpdateConversationRequest(BaseModel):
    title: Optional[str] = None


class SendMessageRequest(BaseModel):
    content: str


# ============== Dependency ==============

async def get_current_user_id(authorization: Optional[str] = None):
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


# ============== Router ==============

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.get("/", response_model=List[ConversationListResponse])
async def list_conversations(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """List user's conversations"""
    
    conversations = await ConversationService.get_user_conversations(
        db, user_id, limit=limit, offset=skip
    )
    
    return [
        ConversationListResponse(
            id=conv.id,
            title=conv.title,
            mode=conv.mode,
            created_at=conv.created_at.isoformat(),
            updated_at=conv.updated_at.isoformat(),
            last_message=None
        )
        for conv in conversations
    ]


@router.post("/", response_model=ConversationDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    request: CreateConversationRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Create a new conversation"""
    
    conversation = await ConversationService.create_conversation(
        db,
        user_id=user_id,
        title=request.title,
        mode=request.mode,
        agent=request.agent
    )
    
    return ConversationDetailResponse(
        id=conversation.id,
        title=conversation.title,
        mode=conversation.mode,
        agent=conversation.agent,
        created_at=conversation.created_at.isoformat(),
        updated_at=conversation.updated_at.isoformat(),
        is_archived=conversation.is_archived
    )


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Get conversation details"""
    
    conversation = await ConversationService.get_conversation(db, conversation_id)
    
    if not conversation or conversation.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return ConversationDetailResponse(
        id=conversation.id,
        title=conversation.title,
        mode=conversation.mode,
        agent=conversation.agent,
        created_at=conversation.created_at.isoformat(),
        updated_at=conversation.updated_at.isoformat(),
        is_archived=conversation.is_archived,
        message_count=len(conversation.messages)
    )


@router.patch("/{conversation_id}", response_model=ConversationDetailResponse)
async def update_conversation(
    conversation_id: str,
    request: UpdateConversationRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Update conversation"""
    
    conversation = await ConversationService.get_conversation(db, conversation_id)
    
    if not conversation or conversation.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    if request.title:
        conversation = await ConversationService.update_conversation_title(
            db, conversation_id, request.title
        )
    
    return ConversationDetailResponse(
        id=conversation.id,
        title=conversation.title,
        mode=conversation.mode,
        agent=conversation.agent,
        created_at=conversation.created_at.isoformat(),
        updated_at=conversation.updated_at.isoformat(),
        is_archived=conversation.is_archived
    )


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Delete a conversation"""
    
    conversation = await ConversationService.get_conversation(db, conversation_id)
    
    if not conversation or conversation.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    await ConversationService.delete_conversation(db, conversation_id)


@router.post("/{conversation_id}/archive", response_model=ConversationDetailResponse)
async def archive_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Archive a conversation"""
    
    conversation = await ConversationService.get_conversation(db, conversation_id)
    
    if not conversation or conversation.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    conversation = await ConversationService.archive_conversation(db, conversation_id)
    
    return ConversationDetailResponse(
        id=conversation.id,
        title=conversation.title,
        mode=conversation.mode,
        agent=conversation.agent,
        created_at=conversation.created_at.isoformat(),
        updated_at=conversation.updated_at.isoformat(),
        is_archived=conversation.is_archived
    )


@router.get("/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_messages(
    conversation_id: str,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Get conversation messages"""
    
    conversation = await ConversationService.get_conversation(db, conversation_id)
    
    if not conversation or conversation.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    messages = await MessageService.get_conversation_messages(db, conversation_id, limit=limit)
    
    return [
        MessageResponse(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            mode=msg.mode,
            sources=msg.sources,
            created_at=msg.created_at.isoformat()
        )
        for msg in messages
    ]
