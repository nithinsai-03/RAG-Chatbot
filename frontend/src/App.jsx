import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { useDropzone } from 'react-dropzone';
import {
  Send,
  Upload,
  FileText,
  Bot,
  User,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  MessageSquare,
  FileUp,
  Globe,
  X,
  Settings,
  Zap,
  Database,
  Brain,
  Link,
  File,
  ToggleLeft,
  ToggleRight,
  Info,
  BookOpen
} from 'lucide-react';

const API_URL = '/api';

// Mode configurations - Metallic Theme
const MODES = {
  auto: {
    id: 'auto',
    name: 'Auto',
    description: 'Automatically choose between RAG and General mode',
    icon: Zap,
    color: 'from-zinc-400 to-zinc-600',
    bgColor: 'bg-zinc-500/10',
    borderColor: 'border-zinc-400/30'
  },
  rag: {
    id: 'rag',
    name: 'RAG Mode',
    description: 'Answer based only on uploaded documents',
    icon: Database,
    color: 'from-neutral-300 to-neutral-500',
    bgColor: 'bg-neutral-500/10',
    borderColor: 'border-neutral-400/30'
  },
  general: {
    id: 'general',
    name: 'General',
    description: 'Open-ended AI assistant',
    icon: Brain,
    color: 'from-stone-300 to-stone-500',
    bgColor: 'bg-stone-500/10',
    borderColor: 'border-stone-400/30'
  }
};

function App() {
  // State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [mode, setMode] = useState('auto');
  const [conversationId, setConversationId] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [expandedSources, setExpandedSources] = useState({});
  const [stats, setStats] = useState({ documents: 0, chunks: 0 });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch initial data
  useEffect(() => {
    fetchDocuments();
    fetchStats();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API_URL}/documents`);
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // File upload handler
  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    
    acceptedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await axios.post(`${API_URL}/documents/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Add system message about upload
      const successCount = response.data.processed;
      const failCount = response.data.failed;
      
      let uploadMessage = `📄 Successfully processed ${successCount} document(s)`;
      if (failCount > 0) {
        uploadMessage += ` (${failCount} failed)`;
      }
      uploadMessage += `. Total chunks: ${response.data.totalChunks}`;

      setMessages(prev => [...prev, {
        type: 'system',
        content: uploadMessage
      }]);

      fetchDocuments();
      fetchStats();

    } catch (error) {
      console.error('Upload error:', error);
      setMessages(prev => [...prev, {
        type: 'error',
        content: `Failed to upload: ${error.response?.data?.error || error.message}`
      }]);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'text/csv': ['.csv']
    },
    multiple: true
  });

  // URL ingestion
  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;

    setIsUploading(true);
    try {
      const response = await axios.post(`${API_URL}/documents/url`, {
        url: urlInput
      });

      setMessages(prev => [...prev, {
        type: 'system',
        content: `🌐 Successfully ingested URL: ${urlInput} (${response.data.chunks} chunks)`
      }]);

      setUrlInput('');
      setShowUrlInput(false);
      fetchDocuments();
      fetchStats();

    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'error',
        content: `Failed to ingest URL: ${error.response?.data?.error || error.message}`
      }]);
    } finally {
      setIsUploading(false);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { type: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/chat`, {
        message: input,
        conversationId,
        mode
      });

      if (!conversationId) {
        setConversationId(response.data.conversationId);
      }

      const assistantMessage = {
        type: 'assistant',
        content: response.data.answer,
        mode: response.data.mode,
        sources: response.data.sources
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        type: 'error',
        content: error.response?.data?.error || 'Failed to get response'
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // Delete document
  const handleDeleteDocument = async (docId) => {
    try {
      await axios.delete(`${API_URL}/documents/${docId}`);
      fetchDocuments();
      fetchStats();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // Clear all
  const handleClearAll = async () => {
    try {
      await axios.post(`${API_URL}/documents/clear`);
      setMessages([]);
      setConversationId(null);
      fetchDocuments();
      fetchStats();
    } catch (error) {
      console.error('Clear error:', error);
    }
  };

  // Toggle source expansion
  const toggleSources = (index) => {
    setExpandedSources(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentMode = MODES[mode];
  const ModeIcon = currentMode.icon;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`${showSidebar ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden glass-dark flex flex-col`}>
        <div className="p-4 border-b border-zinc-800/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-600 to-zinc-800 flex items-center justify-center glow-primary border border-zinc-500/30">
              <Bot className="w-5 h-5 text-zinc-200" />
            </div>
            <div>
              <h1 className="font-semibold text-zinc-100">AI Assistant</h1>
              <p className="text-xs text-zinc-500">RAG-powered chatbot</p>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(MODES).map((m) => {
                const Icon = m.icon;
                const isActive = mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-all border ${
                      isActive
                        ? `bg-gradient-to-b from-zinc-700 to-zinc-800 text-zinc-100 shadow-lg border-zinc-500/50`
                        : 'bg-zinc-900/50 text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300 border-zinc-700/30'
                    }`}
                    title={m.description}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-medium">{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents ({documents.length})
            </h3>
            {documents.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>

          {/* Upload Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all mb-4 ${
              isDragActive
                ? 'border-zinc-400 bg-zinc-700/20'
                : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/30'
            }`}
          >
            <input {...getInputProps()} />
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
                <p className="text-sm text-zinc-500">Processing...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <FileUp className="w-8 h-8 text-zinc-600" />
                <p className="text-sm text-zinc-500">
                  {isDragActive ? 'Drop files here' : 'Drag & drop or click'}
                </p>
                <p className="text-xs text-zinc-600">PDF, DOCX, XLSX, TXT, MD</p>
              </div>
            )}
          </div>

          {/* URL Input */}
          <button
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="w-full mb-3 flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span>Add from URL</span>
            <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${showUrlInput ? 'rotate-90' : ''}`} />
          </button>

          {showUrlInput && (
            <div className="flex gap-2 mb-4">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://..."
                className="flex-1 bg-zinc-900/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
              />
              <button
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim() || isUploading}
                className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg disabled:opacity-50 transition-colors border border-zinc-600"
              >
                <Link className="w-4 h-4 text-zinc-300" />
              </button>
            </div>
          )}

          {/* Document List */}
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="group flex items-center gap-3 p-3 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-lg transition-colors border border-zinc-800/50"
              >
                <File className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{doc.name}</p>
                  <p className="text-xs text-zinc-600">{doc.chunkCount} chunks</p>
                </div>
                <button
                  onClick={() => handleDeleteDocument(doc.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-zinc-300 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {documents.length === 0 && (
            <div className="text-center py-8 text-zinc-600">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No documents yet</p>
              <p className="text-xs mt-1">Upload files to enable RAG</p>
            </div>
          )}
        </div>

        {/* Stats Footer */}
        <div className="p-4 border-t border-zinc-800/50 bg-zinc-900/50">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-2 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
              <p className="text-lg font-semibold text-white">{stats.documents}</p>
              <p className="text-xs text-zinc-500">Documents</p>
            </div>
            <div className="p-2 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
              <p className="text-lg font-semibold text-white">{stats.chunks}</p>
              <p className="text-xs text-zinc-500">Chunks</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="glass-dark border-b border-zinc-800/50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              {showSidebar ? <ChevronRight className="w-5 h-5 rotate-180" /> : <ChevronRight className="w-5 h-5" />}
            </button>
            
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1.5 rounded-full ${currentMode.bgColor} ${currentMode.borderColor} border flex items-center gap-2`}>
                <ModeIcon className="w-4 h-4" />
                <span className="text-sm font-medium">{currentMode.name}</span>
              </div>
              <p className="text-sm text-zinc-500 hidden sm:block">{currentMode.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={() => {
                  setMessages([]);
                  setConversationId(null);
                }}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                title="New conversation"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            )}
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <WelcomeScreen mode={mode} hasDocuments={documents.length > 0} />
          ) : (
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
              {messages.map((message, index) => (
                <MessageBubble
                  key={index}
                  message={message}
                  index={index}
                  expandedSources={expandedSources}
                  toggleSources={toggleSources}
                />
              ))}

              {isLoading && (
                <div className="flex gap-4 animate-message">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-500 to-zinc-700 flex items-center justify-center flex-shrink-0 ring-2 ring-zinc-600/50">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="glass rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <span className="animate-typing">●</span>
                      <span className="animate-typing" style={{ animationDelay: '0.2s' }}>●</span>
                      <span className="animate-typing" style={{ animationDelay: '0.4s' }}>●</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="glass-dark border-t border-zinc-800/50 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={
                    mode === 'rag' && documents.length === 0
                      ? 'Upload documents first to use RAG mode...'
                      : 'Ask anything...'
                  }
                  disabled={isLoading}
                  rows={1}
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500/50 focus:ring-1 focus:ring-zinc-500/50 resize-none transition-all"
                  style={{ minHeight: '48px', maxHeight: '150px' }}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="px-4 py-3 bg-gradient-to-r from-zinc-600 to-zinc-800 hover:from-zinc-500 hover:to-zinc-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-zinc-900/50 border border-zinc-600/30"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-center text-xs text-zinc-500 mt-2">
              Press Enter to send • Shift+Enter for new line
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

// Welcome Screen Component
function WelcomeScreen({ mode, hasDocuments }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-4 py-12">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-zinc-600/20 to-zinc-800/20 border border-zinc-500/30 flex items-center justify-center mb-6 shadow-lg shadow-zinc-900/50">
        <Sparkles className="w-10 h-10 text-zinc-300" />
      </div>
      
      <h2 className="text-3xl font-bold text-white mb-2">Welcome to AI Assistant</h2>
      <p className="text-zinc-400 max-w-lg mb-8">
        {mode === 'rag'
          ? hasDocuments
            ? 'Ask questions about your uploaded documents. Responses are grounded in your content.'
            : 'Upload documents in the sidebar to enable RAG mode. Your questions will be answered based on the content.'
          : mode === 'general'
          ? 'Ask any question and get intelligent responses from the AI model.'
          : 'Auto mode intelligently routes your questions to RAG or General mode based on context.'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
        <FeatureCard
          icon={Upload}
          title="Multi-Format Upload"
          description="PDF, DOCX, XLSX, TXT, MD, and URLs"
        />
        <FeatureCard
          icon={Database}
          title="Hybrid Search"
          description="Vector + keyword search for accuracy"
        />
        <FeatureCard
          icon={BookOpen}
          title="Source Citations"
          description="Every answer includes references"
        />
      </div>
    </div>
  );
}

// Feature Card Component
function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="p-5 glass rounded-xl hover:bg-zinc-700/30 transition-colors border border-zinc-700/30">
      <Icon className="w-8 h-8 text-zinc-300 mb-3" />
      <h3 className="font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-zinc-400">{description}</p>
    </div>
  );
}

// Message Bubble Component
function MessageBubble({ message, index, expandedSources, toggleSources }) {
  if (message.type === 'system') {
    return (
      <div className="flex justify-center animate-message">
        <div className="glass rounded-full px-4 py-2 text-sm text-zinc-300 flex items-center gap-2 border border-zinc-700/30">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          {message.content}
        </div>
      </div>
    );
  }

  if (message.type === 'error') {
    return (
      <div className="flex justify-center animate-message">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          {message.content}
        </div>
      </div>
    );
  }

  if (message.type === 'user') {
    return (
      <div className="flex justify-end gap-3 animate-message">
        <div className="bg-gradient-to-br from-zinc-600 to-zinc-700 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] text-white shadow-lg border border-zinc-500/30">
          {message.content}
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-500 to-zinc-700 flex items-center justify-center flex-shrink-0 ring-2 ring-zinc-600/50">
          <User className="w-5 h-5 text-white" />
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex gap-4 animate-message">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-500 to-zinc-700 flex items-center justify-center flex-shrink-0 ring-2 ring-zinc-600/50">
        <Bot className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0 space-y-3">
        {/* Mode indicator */}
        {message.mode && (
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${
            message.mode === 'rag'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
          }`}>
            {message.mode === 'rag' ? <Database className="w-3 h-3" /> : <Brain className="w-3 h-3" />}
            {message.mode === 'rag' ? 'RAG Response' : 'General Response'}
          </div>
        )}

        {/* Message content */}
        <div className="glass rounded-2xl rounded-tl-sm px-4 py-3 text-zinc-200 border border-zinc-700/30">
          <div className="markdown-content">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="glass rounded-xl overflow-hidden border border-zinc-700/30">
            <button
              onClick={() => toggleSources(index)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700/30 transition-colors"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                View {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${expandedSources[index] ? 'rotate-180' : ''}`} />
            </button>

            {expandedSources[index] && (
              <div className="border-t border-zinc-700/50 divide-y divide-zinc-700/50">
                {message.sources.map((source, i) => (
                  <div key={i} className="p-4 hover:bg-zinc-700/30 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-zinc-600/30 text-zinc-300 text-xs font-medium rounded border border-zinc-600/50">
                        Source {source.id}
                      </span>
                      <span className="text-xs text-zinc-500">{source.source}</span>
                      <span className="text-xs text-emerald-400 ml-auto">{source.score} match</span>
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed">{source.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
