"""
Authentication and Security Utilities
JWT tokens, password hashing, and user authentication
"""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
import os

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production-12345")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenData(BaseModel):
    """Token payload data"""
    user_id: str
    email: str
    username: str
    exp: Optional[datetime] = None
    token_type: str = "access"


class TokenResponse(BaseModel):
    """Token response"""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int


def hash_password(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    user_id: str,
    email: str,
    username: str,
    expires_delta: Optional[timedelta] = None
) -> tuple[str, datetime]:
    """Create JWT access token"""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "user_id": user_id,
        "email": email,
        "username": username,
        "exp": expire,
        "token_type": "access"
    }

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt, expire


def create_refresh_token(
    user_id: str,
    expires_delta: Optional[timedelta] = None
) -> tuple[str, datetime]:
    """Create JWT refresh token"""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode = {
        "user_id": user_id,
        "exp": expire,
        "token_type": "refresh"
    }

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt, expire


def create_tokens(
    user_id: str,
    email: str,
    username: str
) -> TokenResponse:
    """Create both access and refresh tokens"""
    access_token, access_exp = create_access_token(user_id, email, username)
    refresh_token, _ = create_refresh_token(user_id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=int((access_exp - datetime.utcnow()).total_seconds())
    )


def verify_token(token: str) -> Optional[TokenData]:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        email: str = payload.get("email")
        username: str = payload.get("username")

        if user_id is None or email is None:
            return None

        return TokenData(user_id=user_id, email=email, username=username)
    except JWTError:
        return None


def extract_token_from_header(auth_header: str) -> Optional[str]:
    """Extract token from Authorization header"""
    try:
        scheme, credentials = auth_header.split()
        if scheme.lower() != "bearer":
            return None
        return credentials
    except (ValueError, AttributeError):
        return None
