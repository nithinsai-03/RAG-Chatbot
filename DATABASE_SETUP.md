# RAG Chatbot - PostgreSQL Database Setup

This guide explains how to set up PostgreSQL for the RAG Chatbot backend.

## 📋 Prerequisites

- PostgreSQL 12+ installed
- Python 3.10+

## 🐘 PostgreSQL Installation

### macOS (using Homebrew)

```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Verify installation
psql --version
```

### Ubuntu/Debian

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql
```

### Windows

Download and run the installer from https://www.postgresql.org/download/windows/

## 🗄️ Database Creation

### Option 1: Using Terminal/Command Prompt

```bash
# Connect to PostgreSQL
psql -U postgres

# In the psql prompt, create the database
CREATE DATABASE rag_chatbot;
CREATE USER rag_user WITH PASSWORD 'rag_password';
ALTER ROLE rag_user SET client_encoding TO 'utf8';
ALTER ROLE rag_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE rag_user SET default_transaction_deferrable TO on;
ALTER ROLE rag_user SET default_transaction_read_uncommitted TO off;
GRANT ALL PRIVILEGES ON DATABASE rag_chatbot TO rag_user;
\q
```

### Option 2: Using pgAdmin (GUI)

1. Open pgAdmin
2. Right-click on "Databases" → "Create" → "Database"
3. Name: `rag_chatbot`
4. Click "Save"

## 🔧 Environment Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Update `.env` with your PostgreSQL credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=rag_user
DB_PASSWORD=rag_password
DB_NAME=rag_chatbot
DATABASE_URL=postgresql+asyncpg://rag_user:rag_password@localhost:5432/rag_chatbot

# Generate a strong SECRET_KEY
SECRET_KEY=your-secret-key-here
```

To generate a secure SECRET_KEY:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## 📦 Install Dependencies

```bash
pip install -r requirements.txt
```

## 🚀 Running the Server

```bash
# From backend-python directory
python main_new.py

# Or with uvicorn
uvicorn main_new:app --reload --host 0.0.0.0 --port 8000
```

The server will automatically create all database tables on startup.

## ✅ Verify Setup

Check if the database is working:

```bash
# In another terminal
curl http://localhost:8000/api/health

# You should see JSON response with database status
```

## 📊 Database Tables

The application will automatically create these tables:

- `users` - User accounts and profiles
- `conversations` - Chat sessions
- `messages` - Chat history
- `documents` - Uploaded documents metadata
- `api_keys` - API keys for integrations

## 🧹 Cleanup (if needed)

To reset the database:

```bash
# Connect to PostgreSQL
psql -U postgres -d rag_chatbot

# Drop all tables (careful!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

# Exit
\q
```

## 🔍 Troubleshooting

### Connection refused
- Check PostgreSQL is running: `brew services list` (macOS) or `sudo systemctl status postgresql` (Linux)
- Verify credentials in `.env`

### Database already exists
- Use different database name in `.env`

### Async driver issue
- Install asyncpg: `pip install asyncpg`

## 📚 References

- [PostgreSQL Official Docs](https://www.postgresql.org/docs/)
- [SQLAlchemy AsyncIO](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [Alembic Migrations](https://alembic.sqlalchemy.org/)

---

For more help, check the main README.md file.
