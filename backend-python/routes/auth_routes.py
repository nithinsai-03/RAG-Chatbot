"""
Authentication Endpoints
Register, login, logout, token refresh
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from database.db import get_db
from services.db_service import UserService
from services.auth_service import create_tokens, verify_token, extract_token_from_header


# ============== Pydantic Models ==============

class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str]
    is_verified: bool
    created_at: str

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    refresh_token: Optional[str]
    token_type: str
    expires_in: int


# ============== Router ==============

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user"""
    
    # Validate input
    if len(request.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )
    
    if len(request.username) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be at least 3 characters"
        )
    
    # Check if email exists
    if await UserService.user_email_exists(db, request.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username exists
    if await UserService.user_username_exists(db, request.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create user
    try:
        user = await UserService.create_user(
            db,
            email=request.email,
            username=request.username,
            password=request.password,
            full_name=request.full_name
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    
    # Create tokens
    tokens = create_tokens(user.id, user.email, user.username)
    
    return AuthResponse(
        user=UserResponse.from_orm(user),
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        token_type=tokens.token_type,
        expires_in=tokens.expires_in
    )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login user"""
    
    user = await UserService.authenticate_user(db, request.email, request.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Update last login
    await UserService.update_user_last_login(db, user.id)
    
    # Create tokens
    tokens = create_tokens(user.id, user.email, user.username)
    
    return AuthResponse(
        user=UserResponse.from_orm(user),
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        token_type=tokens.token_type,
        expires_in=tokens.expires_in
    )


@router.post("/refresh")
async def refresh_token(request: TokenRefreshRequest):
    """Refresh access token"""
    
    token_data = verify_token(request.refresh_token)
    if not token_data or token_data.token_type != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Create new tokens
    tokens = create_tokens(
        token_data.user_id,
        token_data.email,
        token_data.username
    )
    
    return {
        "access_token": tokens.access_token,
        "refresh_token": tokens.refresh_token,
        "token_type": tokens.token_type,
        "expires_in": tokens.expires_in
    }


@router.post("/logout")
async def logout():
    """Logout user (client should delete tokens)"""
    return {"message": "Logged out successfully"}
