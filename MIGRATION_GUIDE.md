# 🔄 Migration Guide: Old main.py → main_new.py

## Overview

This guide explains how to migrate from the old in-memory backend to the new PostgreSQL backend.

---

## Key Differences

### Architecture

| Aspect | Old (main.py) | New (main_new.py) |
|--------|-------|---|
| **Conversations** | In-memory dict | PostgreSQL table |
| **User Data** | None | Full user profiles |
| **Authentication** | None | JWT + Registration |
| **Documents** | FAISS only | FAISS + PostgreSQL metadata |
| **Persistence** | Lost on restart | Permanent |
| **Scalability** | Single server only | Multi-server ready |

### Files Structure

```
Old:
backend-python/
  main.py              # Everything here

New:
backend-python/
  main_new.py          # Orchestration
  database/
    db.py              # Connection
    models.py          # ORM models
  services/
    db_service.py      # CRUD operations
  routes/
    auth_routes.py     # Authentication
    conversation_routes.py  # Conversations
```

---

## Migration Steps

### Step 1: Backup Old Data

```bash
# Before making changes, backup current data
cp main.py main_backup.py
cp -r uploads/ uploads_backup/
```

### Step 2: Set Up PostgreSQL

```bash
# See DATABASE_SETUP.md for detailed instructions
brew install postgresql@15
brew services start postgresql@15
createdb rag_chatbot
createuser rag_user -P
```

### Step 3: Install New Dependencies

```bash
# Update requirements.txt
pip install -r requirements.txt

# Key new packages:
pip install sqlalchemy psycopg2-binary asyncpg python-jose passlib bcrypt
```

### Step 4: Configure Environment

```bash
cp .env.example .env

# Edit .env with your PostgreSQL credentials:
DB_HOST=localhost
DB_PORT=5432
DB_USER=rag_user
DB_PASSWORD=your_password
SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
```

### Step 5: Replace main.py

```bash
# Backup old main.py
mv main.py main_old.py

# Use new main.py
mv main_new.py main.py
```

### Step 6: Update Frontend

```bash
cd frontend/src/components

# Backup old Auth
cp Auth.jsx Auth_old.jsx

# Use new Auth with real API
cp Auth_new.jsx Auth.jsx
```

### Step 7: Test Connection

```bash
# Start backend
python main.py

# In another terminal, test health check
curl http://localhost:8000/api/health

# Should see:
# {"status": "ok", "version": "4.0.0-python", ...}
```

---

## API Changes

### Old Endpoints (No longer work as before)

```
POST /api/chat
  Old: Creates in-memory conversation
  New: Creates persistent database conversation
  
GET /api/conversations/{id}
  Old: Not available
  New: Returns from database
  
DELETE /api/documents/{doc_id}
  Old: Removes from FAISS only
  New: Marks as deleted in database + FAISS
```

### New Endpoints (Must use)

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh

GET    /api/conversations
POST   /api/conversations
GET    /api/conversations/{id}
GET    /api/conversations/{id}/messages
PATCH  /api/conversations/{id}
DELETE /api/conversations/{id}
POST   /api/conversations/{id}/archive
```

---

## Data Migration (If You Have Old Data)

### Migrating Conversations

Old format (in-memory):
```python
conversations = {
  "conv-id-1": {
    "id": "conv-id-1",
    "messages": [...],
    "created_at": "2024-01-01..."
  }
}
```

New format (database):
```sql
INSERT INTO conversations (id, user_id, title, created_at, updated_at)
VALUES ('conv-id-1', 'user-id', 'Old Conversation', now(), now());

INSERT INTO messages (id, conversation_id, role, content, created_at)
VALUES ('msg-id', 'conv-id-1', 'user', '...', now());
```

### Migration Script (Optional)

If you need to preserve old conversations, create a migration script:

```python
# scripts/migrate_conversations.py
import json
from sqlalchemy import create_engine
from database.models import User, Conversation, Message

# Read old in-memory data
# Create user account
# Create conversation
# Create messages

# Then run: python scripts/migrate_conversations.py
```

---

## Backward Compatibility

### Can I keep using old main.py?

**Not recommended**, but you can:

```bash
# Keep old system for reference
python main_old.py --port 8001

# Use new system
python main.py --port 8000
```

### Migrating Gradually

Phase 1: Run both in parallel
```bash
# Terminal 1
python main.py  # New system (port 8000)

# Terminal 2
python main_old.py --port 8001  # Old system for reference
```

Phase 2: Migrate users
- Register users in new system
- Test thoroughly

Phase 3: Switch over
- Stop old system
- Use only new system

---

## Feature Comparison

### Authentication

| Feature | Old | New |
|---------|-----|-----|
| User accounts | ❌ | ✅ |
| Registration | ❌ | ✅ |
| Login | ❌ | ✅ |
| JWT tokens | ❌ | ✅ |
| Password security | ❌ | ✅ |
| Session management | ❌ | ✅ |

### Data Persistence

| Feature | Old | New |
|---------|-----|-----|
| Conversations persist | ❌ | ✅ |
| Message history | ❌ | ✅ |
| User settings | ❌ | ✅ |
| Document metadata | ❌ | ✅ |
| User isolation | ❌ | ✅ |

### Scalability

| Feature | Old | New |
|---------|-----|-----|
| Single server only | ✅ | ❌ |
| Multi-server support | ❌ | ✅ |
| Load balancing ready | ❌ | ✅ |
| Database-driven | ❌ | ✅ |
| Horizontal scaling | ❌ | ✅ |

---

## Common Migration Issues

### ❌ "Tables don't exist"

**Solution:** Tables created automatically on startup
```bash
python main.py
# Check logs for "Database initialized"
```

### ❌ "Authentication fails"

**Solution:** 
1. Make sure database is running
2. Check `.env` credentials
3. Test with demo account first

### ❌ "Old conversations lost"

**Solution:** They're lost because old system didn't persist
- New system persists everything
- All future data is safe

### ❌ "Port already in use"

**Solution:**
```bash
# Use different port
python main.py --port 8001

# Or kill existing process
lsof -i :8000
kill -9 <PID>
```

---

## Rollback Plan

If you need to go back to old system:

```bash
# Restore old main.py
cp main_old.py main.py

# Remove new files (or keep them)
# Restart
python main.py
```

**Note:** You'll lose any data created with new system.

---

## Testing After Migration

### 1. Test Health Check

```bash
curl http://localhost:8000/api/health
```

### 2. Register User

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "username":"testuser",
    "password":"TestPass123"
  }'
```

### 3. Create Conversation

```bash
# Get token from login
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}' \
  | jq -r '.access_token')

# Create conversation
curl -X POST http://localhost:8000/api/conversations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Chat","mode":"auto"}'
```

### 4. Send Message

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message":"Hello, how are you?",
    "conversation_id":"CONV_ID",
    "mode":"auto"
  }'
```

### 5. Verify Persistence

```bash
# Close and restart backend
# Get conversations - should still be there
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/conversations
```

---

## Documentation

- **IMPLEMENTATION_GUIDE.md** - How everything works
- **DATABASE_SETUP.md** - Database setup details
- **TROUBLESHOOTING.md** - Common issues
- **API endpoints** - Full docs at http://localhost:8000/docs

---

## Performance Comparison

| Metric | Old | New |
|--------|-----|-----|
| Startup time | Fast | Slightly slower (DB init) |
| Query response | Fast (in-memory) | Fast (indexed DB) |
| Persistence | No | Yes |
| Scalability | Limited | Unlimited |
| Data loss | On restart | Never |

---

## Support

If you encounter issues:

1. Check **TROUBLESHOOTING.md**
2. Check error messages in terminal
3. Enable debug mode in `db.py` (set `echo=True`)
4. Check PostgreSQL is running
5. Verify `.env` configuration

---

**Migration Time Estimate:** 30 minutes
**Difficulty Level:** Easy
**Risk Level:** Low (old system not deleted)

**Ready to migrate? Start with DATABASE_SETUP.md!**
