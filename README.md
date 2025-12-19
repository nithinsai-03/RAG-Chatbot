# 🤖 AI Assistant - Advanced RAG Chatbot

A production-ready AI application with two core capabilities:
1. **General-purpose Chatbot** - Open-domain questions using LLMs
2. **RAG-powered Chatbot** - Answers strictly based on user-provided knowledge sources

## ✨ Features

### Core Capabilities
- 🔄 **Dual Mode Operation**: Switch between General AI and RAG modes
- 🧠 **Auto Mode**: Intelligently routes queries based on context
- 📄 **Multi-format Document Support**: PDF, DOCX, PPTX, XLSX, TXT, MD, CSV
- 🌐 **URL Ingestion**: Extract content from web pages
- 🔍 **Hybrid Search**: Vector + keyword search for maximum accuracy
- 📚 **Source Citations**: Every RAG answer includes references with relevance scores

### Technical Features
- 🚀 Modern React frontend with Tailwind CSS
- 💾 In-memory vector store with FAISS-like similarity search
- 🔗 Intelligent text chunking with overlap
- 💬 Conversation memory for context-aware responses
- 🎨 Beautiful, responsive UI with dark mode

## 🏗️ Project Structure

```
RAG chatbot/
├── backend/
│   ├── server.js              # Express API server
│   ├── package.json           # Backend dependencies
│   ├── .env.example           # Environment variables template
│   └── services/
│       ├── documentProcessor.js  # Multi-format document parsing
│       ├── vectorStore.js        # Embeddings & similarity search
│       ├── llmService.js         # LLM integration (OpenAI, etc.)
│       └── chatRouter.js         # Query routing logic
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main React component
│   │   ├── main.jsx           # React entry point
│   │   └── index.css          # Tailwind styles
│   ├── index.html             # HTML template
│   ├── package.json           # Frontend dependencies
│   ├── vite.config.js         # Vite configuration
│   ├── tailwind.config.js     # Tailwind configuration
│   └── postcss.config.js      # PostCSS configuration
└── README.md
```

## 🚀 Quick Start

### 1. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
# Edit .env and add your OpenAI API key (optional)
```

### 3. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 4. Open the App

Navigate to `http://localhost:5173` in your browser.

## 📖 Usage Guide

### Modes

| Mode | Description |
|------|-------------|
| **Auto** | Automatically detects whether to use RAG or General mode |
| **RAG** | Answers only from uploaded documents (prevents hallucination) |
| **General** | Open-ended AI assistant for any questions |

### Uploading Documents

1. Drag & drop files into the sidebar upload zone
2. Or click to browse and select files
3. Supported formats: PDF, DOCX, XLSX, PPTX, TXT, MD, CSV

### Adding URLs

1. Click "Add from URL" in the sidebar
2. Enter a webpage URL
3. Content will be extracted and indexed

### Chatting

1. Type your question in the input box
2. Press Enter or click Send
3. View source citations by clicking "View sources"

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | `3001` |
| `OPENAI_API_KEY` | OpenAI API key for GPT models | - |
| `CHUNK_SIZE` | Characters per chunk | `500` |
| `CHUNK_OVERLAP` | Overlap between chunks | `100` |

### Without OpenAI API Key

The app works without an API key! It will:
- Use the local embedding model for document search
- Return raw retrieved context instead of LLM-generated answers
- Still provide relevant document excerpts for your queries

## 🛠️ API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/documents/upload` | POST | Upload documents |
| `/api/documents/url` | POST | Ingest URL |
| `/api/documents` | GET | List documents |
| `/api/documents/:id` | DELETE | Delete document |
| `/api/chat` | POST | Send chat message |
| `/api/search` | POST | Search documents |
| `/api/stats` | GET | Get system stats |

## 🎨 Tech Stack

### Backend
- **Express.js** - API server
- **@xenova/transformers** - Local embedding model
- **pdf-parse** - PDF extraction
- **mammoth** - DOCX extraction
- **xlsx** - Excel extraction
- **cheerio** - Web scraping
- **OpenAI SDK** - GPT integration

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **React Markdown** - Markdown rendering
- **React Dropzone** - File uploads
- **Axios** - HTTP client

## 📝 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
