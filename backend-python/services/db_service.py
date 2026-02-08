"""
Database Service Layer
CRUD operations for User, Conversation, Message, and Document models
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, and_, or_
from datetime import datetime
import uuid

from database.models import User, Conversation, Message, Document, APIKey
from services.auth_service import hash_password, verify_password


class UserService:
    """User service for authentication and profile management"""

    @staticmethod
    async def create_user(
        db: AsyncSession,
        email: str,
        username: str,
        password: str,
        full_name: Optional[str] = None
    ) -> User:
        """Create a new user"""
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            username=username,
            full_name=full_name,
            hashed_password=hash_password(password)
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        """Get user by email"""
        result = await db.execute(
            select(User).where(User.email == email).where(User.is_active == True)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
        """Get user by username"""
        result = await db.execute(
            select(User).where(User.username == username).where(User.is_active == True)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
        """Get user by ID"""
        return await db.get(User, user_id)

    @staticmethod
    async def authenticate_user(
        db: AsyncSession,
        email: str,
        password: str
    ) -> Optional[User]:
        """Authenticate user with email and password"""
        user = await UserService.get_user_by_email(db, email)
        if not user or not verify_password(password, user.hashed_password):
            return None
        return user

    @staticmethod
    async def update_user_last_login(db: AsyncSession, user_id: str):
        """Update user's last login time"""
        user = await UserService.get_user_by_id(db, user_id)
        if user:
            user.last_login = datetime.utcnow()
            await db.commit()

    @staticmethod
    async def user_email_exists(db: AsyncSession, email: str) -> bool:
        """Check if email already exists"""
        result = await db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none() is not None

    @staticmethod
    async def user_username_exists(db: AsyncSession, username: str) -> bool:
        """Check if username already exists"""
        result = await db.execute(
            select(User).where(User.username == username)
        )
        return result.scalar_one_or_none() is not None


class ConversationService:
    """Conversation service for chat session management"""

    @staticmethod
    async def create_conversation(
        db: AsyncSession,
        user_id: str,
        title: Optional[str] = None,
        mode: str = "auto",
        agent: str = "rag"
    ) -> Conversation:
        """Create a new conversation"""
        conversation = Conversation(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=title or "New Conversation",
            mode=mode,
            agent=agent
        )
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
        return conversation

    @staticmethod
    async def get_conversation(db: AsyncSession, conversation_id: str) -> Optional[Conversation]:
        """Get conversation by ID"""
        return await db.get(Conversation, conversation_id)

    @staticmethod
    async def get_user_conversations(
        db: AsyncSession,
        user_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[Conversation]:
        """Get user's conversations"""
        result = await db.execute(
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .where(Conversation.is_archived == False)
            .order_by(desc(Conversation.last_message_at))
            .limit(limit)
            .offset(offset)
        )
        return result.scalars().all()

    @staticmethod
    async def update_conversation_title(
        db: AsyncSession,
        conversation_id: str,
        title: str
    ) -> Optional[Conversation]:
        """Update conversation title"""
        conversation = await ConversationService.get_conversation(db, conversation_id)
        if conversation:
            conversation.title = title
            conversation.updated_at = datetime.utcnow()
            await db.commit()
            await db.refresh(conversation)
        return conversation

    @staticmethod
    async def archive_conversation(
        db: AsyncSession,
        conversation_id: str
    ) -> Optional[Conversation]:
        """Archive a conversation"""
        conversation = await ConversationService.get_conversation(db, conversation_id)
        if conversation:
            conversation.is_archived = True
            conversation.updated_at = datetime.utcnow()
            await db.commit()
            await db.refresh(conversation)
        return conversation

    @staticmethod
    async def delete_conversation(db: AsyncSession, conversation_id: str) -> bool:
        """Delete a conversation"""
        conversation = await ConversationService.get_conversation(db, conversation_id)
        if conversation:
            await db.delete(conversation)
            await db.commit()
            return True
        return False


class MessageService:
    """Message service for chat history management"""

    @staticmethod
    async def create_message(
        db: AsyncSession,
        conversation_id: str,
        role: str,
        content: str,
        mode: Optional[str] = None,
        sources: Optional[List] = None
    ) -> Message:
        """Create a new message"""
        message = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            role=role,
            content=content,
            mode=mode,
            sources=sources or []
        )
        db.add(message)
        
        # Update conversation's last_message_at
        conversation = await ConversationService.get_conversation(db, conversation_id)
        if conversation:
            conversation.last_message_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(message)
        return message

    @staticmethod
    async def get_conversation_messages(
        db: AsyncSession,
        conversation_id: str,
        limit: int = 100
    ) -> List[Message]:
        """Get messages for a conversation"""
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
            .limit(limit)
        )
        return result.scalars().all()


class DocumentService:
    """Document service for file management"""

    @staticmethod
    async def create_document(
        db: AsyncSession,
        user_id: str,
        filename: str,
        vector_doc_id: str,
        file_type: Optional[str] = None,
        file_size: Optional[int] = None,
        chunk_count: int = 0
    ) -> Document:
        """Create a new document record"""
        document = Document(
            id=str(uuid.uuid4()),
            user_id=user_id,
            filename=filename,
            vector_doc_id=vector_doc_id,
            file_type=file_type,
            file_size=file_size,
            chunk_count=chunk_count,
            upload_status="success"
        )
        db.add(document)
        await db.commit()
        await db.refresh(document)
        return document

    @staticmethod
    async def get_user_documents(
        db: AsyncSession,
        user_id: str,
        limit: int = 100,
        offset: int = 0
    ) -> List[Document]:
        """Get user's documents"""
        result = await db.execute(
            select(Document)
            .where(Document.user_id == user_id)
            .where(Document.is_deleted == False)
            .order_by(desc(Document.created_at))
            .limit(limit)
            .offset(offset)
        )
        return result.scalars().all()

    @staticmethod
    async def get_document(db: AsyncSession, doc_id: str) -> Optional[Document]:
        """Get document by ID"""
        return await db.get(Document, doc_id)

    @staticmethod
    async def delete_document(db: AsyncSession, doc_id: str) -> bool:
        """Soft delete a document"""
        document = await DocumentService.get_document(db, doc_id)
        if document:
            document.is_deleted = True
            document.updated_at = datetime.utcnow()
            await db.commit()
            return True
        return False

    @staticmethod
    async def get_document_by_vector_id(
        db: AsyncSession,
        vector_doc_id: str
    ) -> Optional[Document]:
        """Get document by vector store ID"""
        result = await db.execute(
            select(Document).where(Document.vector_doc_id == vector_doc_id)
        )
        return result.scalar_one_or_none()
