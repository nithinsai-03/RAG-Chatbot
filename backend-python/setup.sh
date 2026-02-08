#!/bin/bash

# RAG Chatbot Quick Setup Script
# This script sets up the PostgreSQL database and installs dependencies

set -e

echo "🚀 RAG Chatbot Quick Setup"
echo "=========================="
echo ""

# Check Python
echo "✓ Checking Python..."
python3 --version

# Check PostgreSQL
echo "✓ Checking PostgreSQL..."
psql --version

echo ""
echo "📦 Installing Python Dependencies..."
cd backend-python
pip install -r requirements.txt

echo ""
echo "🗄️  Setting up PostgreSQL Database..."
echo ""
echo "Please enter your PostgreSQL password when prompted:"
echo ""

# Create database and user
psql -U postgres -c "CREATE DATABASE rag_chatbot;" 2>/dev/null || echo "⚠️  Database already exists"
psql -U postgres -c "CREATE USER rag_user WITH PASSWORD 'rag_password';" 2>/dev/null || echo "⚠️  User already exists"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE rag_chatbot TO rag_user;"

echo ""
echo "✅ Database setup complete!"
echo ""

# Create .env file
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env created. Please edit it with your settings."
else
    echo "✓ .env already exists"
fi

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your settings"
echo "2. Run: python main_new.py"
echo "3. Frontend: cd ../frontend && npm run dev"
echo ""
echo "📚 For more details, see: IMPLEMENTATION_GUIDE.md"
