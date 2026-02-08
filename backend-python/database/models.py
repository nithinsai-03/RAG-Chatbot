"""
SQLAlchemy ORM Models for RAG Chatbot
Defines User, Conversation, Message, and Document models
"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Integer, Text, JSON, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from database.db import Base


class User(Base):
    """User model for authentication and profiles"""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    
    # Profile
    avatar_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True, index=True)
    is_verified = Column(Boolean, default=False)
    
    # Settings (JSON for flexibility)
    settings = Column(JSON, default={
        "theme": "dark",
        "language": "en",
        "notifications_enabled": True,
        "model_preference": "auto"
    })
    
    # Timestamps
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_user_email_active", "email", "is_active"),
        Index("idx_user_username_active", "username", "is_active"),
    )


class Conversation(Base):
    """Conversation model for chat sessions"""
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Metadata
    title = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    
    # Settings
    mode = Column(String(20), default="auto")  # 'auto', 'rag', 'general'
    agent = Column(String(20), default="rag")  # 'rag', 'conversation'
    model = Column(String(100), nullable=True)
    
    # Configuration (JSON)
    config = Column(JSON, default={
        "temperature": 0.7,
        "max_tokens": 2000,
        "top_k": 5
    })
    
    # Status
    is_archived = Column(Boolean, default=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_message_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_conversation_user_archived", "user_id", "is_archived"),
        Index("idx_conversation_created_at", "created_at"),
    )


class Message(Base):
    """Message model for chat history"""
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Content
    role = Column(String(20), nullable=False)  # 'user', 'assistant', 'system'
    content = Column(Text, nullable=False)
    
    # RAG-specific fields
    mode = Column(String(20), nullable=True)  # 'auto', 'rag', 'general'
    sources = Column(JSON, default=[])  # List of source documents with scores
    
    # Metadata
    message_metadata = Column(JSON, default={})
    
    # Timestamps
    created_at = Column(DateTime, default=func.now(), nullable=False, index=True)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    
    __table_args__ = (
        Index("idx_message_conversation_created", "conversation_id", "created_at"),
    )


class Document(Base):
    """Document model for uploaded files"""
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # File info
    filename = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)  # in bytes
    file_type = Column(String(50), nullable=True)  # pdf, docx, txt, etc.
    file_path = Column(String(1000), nullable=True)
    
    # Vector store info
    vector_doc_id = Column(String(36), unique=True, nullable=False)  # Reference to FAISS
    chunk_count = Column(Integer, default=0)
    
    # Metadata
    doc_metadata = Column(JSON, default={})
    
    # Status
    is_deleted = Column(Boolean, default=False, index=True)
    upload_status = Column(String(20), default="processing")  # processing, success, failed
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="documents")
    
    __table_args__ = (
        Index("idx_document_user_deleted", "user_id", "is_deleted"),
        Index("idx_document_created_at", "created_at"),
        Index("idx_document_upload_status", "upload_status"),
    )


class APIKey(Base):
    """API Key model for external integrations"""
    __tablename__ = "api_keys"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Key info
    name = Column(String(255), nullable=False)
    key = Column(String(255), unique=True, nullable=False, index=True)
    
    # Usage
    is_active = Column(Boolean, default=True, index=True)
    last_used_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now(), nullable=False)
    expires_at = Column(DateTime, nullable=True)
    
    __table_args__ = (
        Index("idx_api_key_user_active", "user_id", "is_active"),
    )
