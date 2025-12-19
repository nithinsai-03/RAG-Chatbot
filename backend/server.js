import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Import services
import { DocumentProcessor } from './services/documentProcessor.js';
import { VectorStore } from './services/vectorStore.js';
import { LLMService } from './services/llmService.js';
import { ChatRouter } from './services/chatRouter.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/markdown',
      'text/csv'
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.md')) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'), false);
    }
  }
});

// Initialize services
const documentProcessor = new DocumentProcessor();
const vectorStore = new VectorStore();
const llmService = new LLMService();
const chatRouter = new ChatRouter(vectorStore, llmService);

// Conversation memory store
const conversations = new Map();

// ============== API Routes ==============

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    documentsLoaded: vectorStore.getDocumentCount(),
    totalChunks: vectorStore.getChunkCount(),
    availableModels: llmService.getAvailableModels()
  });
});

// Get available models
app.get('/api/models', (req, res) => {
  res.json({
    models: llmService.getAvailableModels(),
    currentModel: llmService.getCurrentModel()
  });
});

// Set active model
app.post('/api/models/set', (req, res) => {
  const { model } = req.body;
  try {
    llmService.setModel(model);
    res.json({ success: true, currentModel: model });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Upload documents (multiple files)
app.post('/api/documents/upload', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const results = [];
    
    for (const file of req.files) {
      console.log(`Processing: ${file.originalname}`);
      
      try {
        // Process document
        const chunks = await documentProcessor.processFile(file.path, file.originalname);
        
        // Add to vector store
        const docId = uuidv4();
        await vectorStore.addDocument(docId, file.originalname, chunks);
        
        results.push({
          filename: file.originalname,
          docId,
          chunks: chunks.length,
          status: 'success'
        });
        
        // Clean up uploaded file
        fs.unlinkSync(file.path);
        
      } catch (error) {
        console.error(`Error processing ${file.originalname}:`, error);
        results.push({
          filename: file.originalname,
          status: 'error',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      processed: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      results,
      totalDocuments: vectorStore.getDocumentCount(),
      totalChunks: vectorStore.getChunkCount()
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process uploads', details: error.message });
  }
});

// Ingest URL
app.post('/api/documents/url', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`Fetching URL: ${url}`);
    
    const chunks = await documentProcessor.processUrl(url);
    const docId = uuidv4();
    await vectorStore.addDocument(docId, url, chunks);

    res.json({
      success: true,
      url,
      docId,
      chunks: chunks.length,
      totalDocuments: vectorStore.getDocumentCount(),
      totalChunks: vectorStore.getChunkCount()
    });

  } catch (error) {
    console.error('URL ingestion error:', error);
    res.status(500).json({ error: 'Failed to process URL', details: error.message });
  }
});

// List documents
app.get('/api/documents', (req, res) => {
  res.json({
    documents: vectorStore.getDocuments(),
    totalChunks: vectorStore.getChunkCount()
  });
});

// Delete document
app.delete('/api/documents/:docId', (req, res) => {
  const { docId } = req.params;
  try {
    vectorStore.removeDocument(docId);
    res.json({ success: true, message: 'Document removed' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Clear all documents
app.post('/api/documents/clear', (req, res) => {
  vectorStore.clear();
  res.json({ success: true, message: 'All documents cleared' });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { 
      message, 
      conversationId = uuidv4(),
      mode = 'auto', // 'auto', 'general', 'rag'
      streaming = false 
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get or create conversation
    if (!conversations.has(conversationId)) {
      conversations.set(conversationId, {
        id: conversationId,
        messages: [],
        createdAt: new Date().toISOString()
      });
    }
    const conversation = conversations.get(conversationId);

    // Add user message to history
    conversation.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    console.log(`Processing chat [${mode}]: ${message.substring(0, 50)}...`);

    // Route and generate response
    const response = await chatRouter.route(message, mode, conversation.messages);

    // Add assistant message to history
    conversation.messages.push({
      role: 'assistant',
      content: response.answer,
      timestamp: new Date().toISOString(),
      mode: response.mode,
      sources: response.sources
    });

    // Trim conversation history if too long
    if (conversation.messages.length > 20) {
      conversation.messages = conversation.messages.slice(-20);
    }

    res.json({
      conversationId,
      ...response
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message', details: error.message });
  }
});

// Get conversation history
app.get('/api/conversations/:conversationId', (req, res) => {
  const { conversationId } = req.params;
  const conversation = conversations.get(conversationId);
  
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  res.json(conversation);
});

// Clear conversation
app.delete('/api/conversations/:conversationId', (req, res) => {
  const { conversationId } = req.params;
  conversations.delete(conversationId);
  res.json({ success: true, message: 'Conversation cleared' });
});

// Search documents
app.post('/api/search', async (req, res) => {
  try {
    const { query, topK = 5 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await vectorStore.hybridSearch(query, topK);
    res.json({ results });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  res.json({
    documents: vectorStore.getDocumentCount(),
    chunks: vectorStore.getChunkCount(),
    conversations: conversations.size,
    currentModel: llmService.getCurrentModel()
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('📦 Initializing embedding model...');
  await vectorStore.initialize();
  console.log('✅ Ready to accept requests!');
});
