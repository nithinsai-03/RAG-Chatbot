import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { useDropzone } from 'react-dropzone';
import { 
  Send, 
  Upload, 
  FileText, 
  X, 
  Bot, 
  User, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Sparkles,
  Zap,
  FileSearch,
  MessageSquare,
  Sun,
  Moon,
  LogOut,
  Plus,
  MessageCircle,
  Trash2,
  Menu
} from 'lucide-react';
import { LoginPage, SignupPage } from './components/Auth';

const API_BASE = 'http://localhost:3001/api';

// Mode configurations
const getModes = (isDark) => ({
  auto: {
    id: 'auto',
    name: 'Auto',
    description: 'Intelligently switches between modes',
    icon: Sparkles,
    gradient: isDark 
      ? 'from-purple-600 to-pink-600' 
      : 'from-purple-500 to-pink-500',
    bgColor: isDark ? 'bg-purple-500/10' : 'bg-purple-100',
    borderColor: isDark ? 'border-purple-500/30' : 'border-purple-300',
    textColor: isDark ? 'text-purple-400' : 'text-purple-600'
  },
  rag: {
    id: 'rag',
    name: 'Documents',
    description: 'Search uploaded documents',
    icon: FileSearch,
    gradient: isDark 
      ? 'from-emerald-600 to-teal-600' 
      : 'from-emerald-500 to-teal-500',
    bgColor: isDark ? 'bg-emerald-500/10' : 'bg-emerald-100',
    borderColor: isDark ? 'border-emerald-500/30' : 'border-emerald-300',
    textColor: isDark ? 'text-emerald-400' : 'text-emerald-600'
  },
  general: {
    id: 'general',
    name: 'General',
    description: 'General AI assistant',
    icon: MessageSquare,
    gradient: isDark 
      ? 'from-blue-600 to-cyan-600' 
      : 'from-blue-500 to-cyan-500',
    bgColor: isDark ? 'bg-blue-500/10' : 'bg-blue-100',
    borderColor: isDark ? 'border-blue-500/30' : 'border-blue-300',
    textColor: isDark ? 'text-blue-400' : 'text-blue-600'
  }
});

function App() {
  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });
  const isDark = theme === 'dark';

  // Auth state
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authView, setAuthView] = useState('login');

  // Chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('auto');
  const [conversationId, setConversationId] = useState(null);

  // Document state
  const [documents, setDocuments] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [showUploadPanel, setShowUploadPanel] = useState(false);

  // Chat history state
  const [chatHistory, setChatHistory] = useState(() => {
    const saved = localStorage.getItem('chatHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentChatId, setCurrentChatId] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const MODES = getModes(isDark);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // Auth handlers
  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setMessages([]);
    setDocuments([]);
    setConversationId(null);
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Fetch documents
  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API_BASE}/documents`);
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  // Save chat to history
  const saveChatToHistory = (chatMessages, chatId) => {
    if (chatMessages.length === 0) return;
    
    const firstUserMessage = chatMessages.find(m => m.role === 'user');
    const title = firstUserMessage 
      ? firstUserMessage.content.slice(0, 40) + (firstUserMessage.content.length > 40 ? '...' : '')
      : 'New Chat';
    
    const chat = {
      id: chatId || Date.now().toString(),
      title,
      messages: chatMessages,
      timestamp: new Date().toISOString(),
      mode
    };
    
    setChatHistory(prev => {
      const existing = prev.findIndex(c => c.id === chat.id);
      let updated;
      if (existing >= 0) {
        updated = [...prev];
        updated[existing] = chat;
      } else {
        updated = [chat, ...prev];
      }
      localStorage.setItem('chatHistory', JSON.stringify(updated));
      return updated;
    });
    
    return chat.id;
  };

  // Start new chat
  const startNewChat = () => {
    if (messages.length > 0) {
      saveChatToHistory(messages, currentChatId);
    }
    setMessages([]);
    setConversationId(null);
    setCurrentChatId(null);
  };

  // Load chat from history
  const loadChat = (chat) => {
    if (messages.length > 0 && currentChatId !== chat.id) {
      saveChatToHistory(messages, currentChatId);
    }
    setMessages(chat.messages);
    setCurrentChatId(chat.id);
    setMode(chat.mode || 'auto');
  };

  // Delete chat from history
  const deleteChat = (chatId, e) => {
    e.stopPropagation();
    setChatHistory(prev => {
      const updated = prev.filter(c => c.id !== chatId);
      localStorage.setItem('chatHistory', JSON.stringify(updated));
      return updated;
    });
    if (currentChatId === chatId) {
      setMessages([]);
      setCurrentChatId(null);
    }
  };

  // Handle mode change
  const handleModeChange = (newMode) => {
    setMode(newMode);
    setConversationId(null);
  };

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/chat`, {
        message: userMessage.content,
        mode,
        conversationId
      });

      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.data.answer,
        mode: response.data.mode,
        sources: response.data.sources,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => {
        const newMessages = [...prev, assistantMessage];
        // Auto-save chat after each response
        const chatId = currentChatId || Date.now().toString();
        if (!currentChatId) setCurrentChatId(chatId);
        setTimeout(() => saveChatToHistory(newMessages, chatId), 100);
        return newMessages;
      });
      setConversationId(response.data.conversationId);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        isError: true,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file upload
  const onDrop = useCallback(async (acceptedFiles) => {
    for (const file of acceptedFiles) {
      const fileId = Date.now() + Math.random();
      setUploadingFiles(prev => [...prev, { id: fileId, name: file.name, progress: 0 }]);

      const formData = new FormData();
      formData.append('files', file);

      try {
        await axios.post(`${API_BASE}/documents/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadingFiles(prev =>
              prev.map(f => f.id === fileId ? { ...f, progress } : f)
            );
          }
        });

        setUploadingFiles(prev =>
          prev.map(f => f.id === fileId ? { ...f, progress: 100, completed: true } : f)
        );

        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
        }, 2000);

        fetchDocuments();
      } catch (error) {
        console.error('Upload error:', error);
        setUploadingFiles(prev =>
          prev.map(f => f.id === fileId ? { ...f, error: true } : f)
        );
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    }
  });

  // Delete document
  const deleteDocument = async (docId) => {
    try {
      await axios.delete(`${API_BASE}/documents/${docId}`);
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  // Show auth pages if not logged in
  if (!user) {
    if (authView === 'login') {
      return (
        <LoginPage
          onLogin={handleLogin}
          onSwitchToSignup={() => setAuthView('signup')}
          theme={theme}
        />
      );
    } else {
      return (
        <SignupPage
          onSignup={handleLogin}
          onSwitchToLogin={() => setAuthView('login')}
          theme={theme}
        />
      );
    }
  }

  return (
    <div className={`min-h-screen flex ${
      isDark 
        ? 'bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900' 
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
    }`}>
      {/* Chat History Sidebar */}
      <aside className={`${showSidebar ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden flex-shrink-0 ${
        isDark ? 'bg-zinc-900 border-zinc-700/50' : 'bg-gray-50 border-gray-200'
      } border-r flex flex-col`}>
        <div className="p-3 flex-shrink-0">
          <button
            onClick={startNewChat}
            className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-200 shadow-sm'
            }`}
          >
            <Plus className="w-5 h-5" />
            New Chat
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <p className={`text-xs font-medium px-2 py-2 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
            Recent Chats
          </p>
          <div className="space-y-1">
            {chatHistory.map((chat) => (
              <div
                key={chat.id}
                onClick={() => loadChat(chat)}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                  currentChatId === chat.id
                    ? isDark
                      ? 'bg-zinc-700 text-white'
                      : 'bg-blue-100 text-blue-900'
                    : isDark
                      ? 'hover:bg-zinc-800 text-zinc-300'
                      : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <MessageCircle className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate text-sm">{chat.title}</span>
                <button
                  onClick={(e) => deleteChat(chat.id, e)}
                  className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${
                    isDark ? 'hover:bg-zinc-600 text-zinc-400' : 'hover:bg-gray-200 text-gray-500'
                  }`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {chatHistory.length === 0 && (
              <p className={`text-sm text-center py-4 ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>
                No chat history
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className={`${
          isDark 
            ? 'bg-zinc-900/80 border-zinc-700/50' 
            : 'bg-white/80 border-gray-200'
        } backdrop-blur-xl border-b sticky top-0 z-50`}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Sidebar Toggle & Logo */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark 
                      ? 'text-zinc-400 hover:text-white hover:bg-zinc-700/50' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className={`w-10 h-10 rounded-xl ${
                  isDark 
                    ? 'bg-gradient-to-br from-zinc-600 to-zinc-800 border-zinc-500/30' 
                    : 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400/30'
                } border flex items-center justify-center`}>
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    AI Assistant
                  </h1>
                  <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                    Powered by RAG
                  </p>
                </div>
              </div>

              {/* Mode Selector */}
              <div className={`flex items-center gap-1 p-1 rounded-xl ${
                isDark ? 'bg-zinc-800/50' : 'bg-gray-100'
              }`}>
                {Object.values(MODES).map((m) => {
                  const Icon = m.icon;
                  const isActive = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleModeChange(m.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? `bg-gradient-to-r ${m.gradient} text-white shadow-lg`
                          : isDark
                            ? 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{m.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right side buttons */}
              <div className="flex items-center gap-2">
                {/* Theme toggle */}
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark 
                      ? 'text-zinc-400 hover:text-white hover:bg-zinc-700/50' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                {/* Upload button */}
                <button
                  onClick={() => setShowUploadPanel(!showUploadPanel)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                    isDark
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Upload</span>
                  {documents.length > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      isDark 
                        ? 'bg-zinc-700 text-zinc-300' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {documents.length}
                    </span>
                  )}
                </button>

                {/* Logout button */}
                <button
                  onClick={handleLogout}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark 
                      ? 'text-zinc-400 hover:text-red-400 hover:bg-zinc-700/50' 
                      : 'text-gray-600 hover:text-red-500 hover:bg-gray-200'
                  }`}
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Chat Area */}
          <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex-1 flex items-center justify-center h-full min-h-[400px]">
                  <div className="text-center">
                    <div className={`w-20 h-20 mx-auto rounded-2xl ${
                      isDark 
                        ? 'bg-gradient-to-br from-zinc-700 to-zinc-800 border-zinc-600/30' 
                        : 'bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300/30'
                    } border flex items-center justify-center mb-4`}>
                      <Zap className={`w-10 h-10 ${isDark ? 'text-zinc-400' : 'text-blue-500'}`} />
                    </div>
                    <h2 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      How can I help you today?
                    </h2>
                  <p className={`max-w-md ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                    {mode === 'rag' 
                      ? 'Ask questions about your uploaded documents'
                      : mode === 'general'
                        ? 'Ask me anything - I\'m here to help!'
                        : 'I\'ll automatically use your documents when relevant'}
                  </p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
                    isDark 
                      ? 'bg-gradient-to-br from-zinc-600 to-zinc-700' 
                      : 'bg-gradient-to-br from-blue-500 to-blue-600'
                  }`}>
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? isDark
                      ? 'bg-gradient-to-r from-zinc-600 to-zinc-700 text-white'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                    : message.isError
                      ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                      : isDark
                        ? 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-100'
                        : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
                }`}>
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                  
                  {message.sources && message.sources.length > 0 && (
                    <div className={`mt-3 pt-3 border-t ${isDark ? 'border-zinc-700' : 'border-gray-200'}`}>
                      <p className={`text-xs mb-2 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Sources:</p>
                      <div className="flex flex-wrap gap-2">
                        {message.sources.map((source, idx) => (
                          <span
                            key={idx}
                            className={`text-xs px-2 py-1 rounded-lg ${
                              isDark 
                                ? 'bg-zinc-700/50 text-zinc-400' 
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {source.filename}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
                    isDark 
                      ? 'bg-zinc-700' 
                      : 'bg-gray-200'
                  }`}>
                    <User className={`w-4 h-4 ${isDark ? 'text-zinc-300' : 'text-gray-600'}`} />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
                  isDark 
                    ? 'bg-gradient-to-br from-zinc-600 to-zinc-700' 
                    : 'bg-gradient-to-br from-blue-500 to-blue-600'
                }`}>
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className={`rounded-2xl px-4 py-3 ${
                  isDark 
                    ? 'bg-zinc-800/50 border border-zinc-700/50' 
                    : 'bg-white border border-gray-200 shadow-sm'
                }`}>
                  <div className="flex items-center gap-2">
                    <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-zinc-400' : 'text-gray-500'}`} />
                    <span className={isDark ? 'text-zinc-400' : 'text-gray-500'}>Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className={`p-4 border-t ${isDark ? 'border-zinc-800' : 'border-gray-200'}`}>
            <div className={`flex items-center gap-3 p-2 rounded-2xl ${
              isDark 
                ? 'bg-zinc-800/50 border border-zinc-700/50' 
                : 'bg-white border border-gray-200 shadow-sm'
            }`}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Type your message..."
                className={`flex-1 px-4 py-3 bg-transparent outline-none ${
                  isDark 
                    ? 'text-white placeholder-zinc-500' 
                    : 'text-gray-900 placeholder-gray-400'
                }`}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className={`p-3 rounded-xl transition-all ${
                  input.trim() && !isLoading
                    ? isDark
                      ? 'bg-gradient-to-r from-zinc-600 to-zinc-700 text-white hover:from-zinc-500 hover:to-zinc-600'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                    : isDark
                      ? 'bg-zinc-700/50 text-zinc-500'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </main>

        {/* Upload Panel */}
        {showUploadPanel && (
          <aside className={`w-80 border-l p-4 overflow-y-auto ${
            isDark 
              ? 'bg-zinc-900/50 border-zinc-700/50' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Documents</h2>
              <button
                onClick={() => setShowUploadPanel(false)}
                className={isDark ? 'text-zinc-500 hover:text-white' : 'text-gray-400 hover:text-gray-600'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all mb-4 ${
                isDragActive
                  ? isDark
                    ? 'border-zinc-500 bg-zinc-800/50'
                    : 'border-blue-400 bg-blue-50'
                  : isDark
                    ? 'border-zinc-700 hover:border-zinc-600'
                    : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} />
              <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                {isDragActive ? 'Drop files here' : 'Drag & drop or click to upload'}
              </p>
              <p className={`text-xs mt-1 ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>
                PDF, DOCX, TXT, XLSX
              </p>
            </div>

            {/* Uploading Files */}
            {uploadingFiles.map((file) => (
              <div
                key={file.id}
                className={`mb-2 p-3 rounded-lg ${
                  isDark ? 'bg-zinc-800/50' : 'bg-white border border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileText className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`} />
                  <span className={`text-sm truncate flex-1 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                    {file.name}
                  </span>
                  {file.completed && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {file.error && <AlertCircle className="w-4 h-4 text-red-500" />}
                </div>
                {!file.completed && !file.error && (
                  <div className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`}>
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Document List */}
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`p-3 rounded-lg flex items-center gap-2 ${
                    isDark 
                      ? 'bg-zinc-800/50 border border-zinc-700/50' 
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <FileText className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`} />
                  <span className={`text-sm truncate flex-1 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                    {doc.filename}
                  </span>
                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className={`p-1 rounded transition-colors ${
                      isDark 
                        ? 'hover:bg-zinc-700 text-zinc-500 hover:text-red-400' 
                        : 'hover:bg-gray-100 text-gray-400 hover:text-red-500'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {documents.length === 0 && uploadingFiles.length === 0 && (
                <p className={`text-sm text-center py-4 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                  No documents uploaded yet
                </p>
              )}
            </div>
          </aside>
        )}
        </div>
      </div>
    </div>
  );
}

export default App;
