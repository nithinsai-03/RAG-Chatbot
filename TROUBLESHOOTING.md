# 🔧 Troubleshooting Guide

## Common Issues and Solutions

### Database Issues

#### ❌ "connection refused" on startup

**Problem:**
```
ERROR: could not translate host name "localhost" to address: Name or service not known
```

**Solution:**
1. Check PostgreSQL is running:
   ```bash
   # macOS
   brew services list | grep postgres
   
   # Linux
   sudo systemctl status postgresql
   ```

2. Start PostgreSQL:
   ```bash
   # macOS
   brew services start postgresql@15
   
   # Linux
   sudo systemctl start postgresql
   ```

3. Test connection:
   ```bash
   psql -U postgres -d postgres -c "SELECT version();"
   ```

---

#### ❌ "Database 'rag_chatbot' does not exist"

**Solution:**
```bash
# Create database
createdb rag_chatbot

# Create user
createuser rag_user
psql -U postgres -c "ALTER USER rag_user WITH PASSWORD 'rag_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE rag_chatbot TO rag_user;"
```

---

#### ❌ "password authentication failed"

**Problem:** Wrong credentials in `.env`

**Solution:**
1. Check your `.env` file:
   ```bash
   cat .env | grep DB_
   ```

2. If wrong password, reset:
   ```bash
   psql -U postgres -c "ALTER USER rag_user WITH PASSWORD 'newpassword';"
   ```

3. Update `.env`:
   ```env
   DB_PASSWORD=newpassword
   ```

---

### Authentication Issues

#### ❌ "Login failed: Invalid credentials"

**Problem:** User doesn't exist or password is wrong

**Solution:**
1. Check user exists in database:
   ```bash
   psql -U rag_user -d rag_chatbot -c "SELECT * FROM users WHERE email='test@example.com';"
   ```

2. If not exists, register first via API or use demo credentials:
   ```bash
   # Demo
   Email: demo@example.com
   Password: password123
   ```

---

#### ❌ "Invalid token" on API calls

**Problem:** Token expired or malformed

**Solution:**
1. Login again to get fresh token:
   ```bash
   curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"demo@example.com","password":"password123"}'
   ```

2. Or use refresh token:
   ```bash
   curl -X POST http://localhost:8000/api/auth/refresh \
     -H "Content-Type: application/json" \
     -d '{"refresh_token":"YOUR_REFRESH_TOKEN"}'
   ```

3. Add token to requests:
   ```bash
   curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     http://localhost:8000/api/conversations
   ```

---

### Frontend Issues

#### ❌ "Cannot GET /api/..." (404 errors)

**Problem:** Backend not running or wrong URL

**Solution:**
1. Check backend is running:
   ```bash
   curl http://localhost:8000/api/health
   ```

2. If not running:
   ```bash
   cd backend-python
   python main_new.py
   ```

3. Check frontend API URL in `.env`:
   ```bash
   # frontend/.env (if exists)
   VITE_API_URL=http://localhost:8000/api
   ```

---

#### ❌ CORS errors in browser console

**Problem:** Frontend and backend ports don't match

**Solution:**
CORS is already configured to allow all origins in `main_new.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ← Already set
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

If still issues, check:
1. Frontend is on `http://localhost:5173`
2. Backend is on `http://localhost:8000`
3. Browser console for specific errors

---

#### ❌ Auth component not showing

**Problem:** Using old Auth component

**Solution:**
```bash
cd frontend/src/components
cp Auth_new.jsx Auth.jsx
npm run dev
```

---

### Dependency Issues

#### ❌ "No module named 'sqlalchemy'"

**Problem:** Dependencies not installed

**Solution:**
```bash
cd backend-python
pip install -r requirements.txt
```

---

#### ❌ "ImportError: cannot import name 'asyncpg'"

**Solution:**
```bash
pip install asyncpg
```

---

#### ❌ "ImportError: cannot import name 'BaseSettings'"

**Solution:**
```bash
pip install pydantic-settings
```

---

### Environment Issues

#### ❌ ".env file not found"

**Problem:** Missing environment configuration

**Solution:**
```bash
cp .env.example .env
# Edit .env with your settings
```

---

#### ❌ "SECRET_KEY not set"

**Solution:**
1. Generate a key:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

2. Add to `.env`:
   ```env
   SECRET_KEY=your-generated-key-here
   ```

---

### Port Issues

#### ❌ "Address already in use" error

**Problem:** Port 8000 is already in use

**Solution:**
1. Kill the process:
   ```bash
   # macOS/Linux
   lsof -i :8000
   kill -9 <PID>
   ```

2. Or use different port:
   ```bash
   uvicorn main_new:app --port 8001
   ```

---

### Database Performance

#### ❌ Queries are slow

**Solution:**
1. Check if indexes exist:
   ```bash
   psql -U rag_user -d rag_chatbot -c "SELECT * FROM pg_stat_user_indexes;"
   ```

2. Enable SQL logging in `db.py`:
   ```python
   engine = create_async_engine(
       DATABASE_URL,
       echo=True,  # ← Set to True
   )
   ```

---

### Reset Everything (Fresh Start)

If you want to completely reset:

```bash
# Drop database
dropdb rag_chatbot

# Drop user
dropuser rag_user

# Recreate everything
createdb rag_chatbot
createuser rag_user
psql -U postgres -d rag_chatbot -c "GRANT ALL ON DATABASE rag_chatbot TO rag_user;"
```

Then restart the backend - it will create all tables automatically.

---

## ✅ Verification Steps

### 1. Check All Services Are Running

```bash
# Backend
curl http://localhost:8000/api/health
# Expected: {"status": "ok", ...}

# Frontend
curl http://localhost:5173
# Expected: HTML page (not 404)

# PostgreSQL
psql -U rag_user -d rag_chatbot -c "SELECT 1;"
# Expected: 1
```

### 2. Test Authentication Flow

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "username":"testuser",
    "password":"TestPassword123"
  }'
# Expected: {"user": {...}, "access_token": "..."}

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"TestPassword123"
  }'
# Expected: tokens returned
```

### 3. Test Protected Routes

```bash
# Get conversations (requires token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/conversations
# Expected: {"...": []}

# Without token
curl http://localhost:8000/api/conversations
# Expected: 401 Unauthorized
```

---

## Debug Mode

### Enable SQL Logging

In `database/db.py`:
```python
engine = create_async_engine(
    DATABASE_URL,
    echo=True,  # Shows all SQL queries
    # ... rest of config
)
```

### Enable Request Logging

In `main_new.py`:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Check Database

```bash
# Connect to database
psql -U rag_user -d rag_chatbot

# List tables
\dt

# Check users
SELECT id, email, username FROM users;

# Check conversations
SELECT id, user_id, title FROM conversations;
```

---

## Getting Help

1. **Check logs:** Look at terminal output
2. **Check documentation:** See IMPLEMENTATION_GUIDE.md
3. **Check GitHub issues:** If using version control
4. **Enable debug mode:** Use steps above
5. **Test individual components:** Verify each service

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Connection refused` | PostgreSQL not running | Start PostgreSQL service |
| `Database does not exist` | DB not created | `createdb rag_chatbot` |
| `No module named` | Dependency missing | `pip install -r requirements.txt` |
| `Address in use` | Port already taken | Use different port or kill process |
| `Invalid token` | Token expired | Login again or refresh |
| `CORS error` | Frontend/backend mismatch | Check ports and CORS config |
| `Module not found` | Python path issue | `cd backend-python` before running |

---

**For more help, consult:**
- DATABASE_SETUP.md - Database-specific issues
- IMPLEMENTATION_GUIDE.md - Implementation details
- README.md - General project info
