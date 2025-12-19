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
  Menu,
  Settings,
  HelpCircle,
  Crown,
  Sliders,
  ChevronRight,
  Mic,
  MicOff,
  Volume2,
  VolumeX
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

  // Voice Assistant state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    const saved = localStorage.getItem('voiceEnabled');
    return saved ? JSON.parse(saved) : true;
  });
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);

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
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState('chat'); // 'chat', 'settings', 'personalization', 'help'

  // Settings state with localStorage persistence
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('appSettings');
    return saved ? JSON.parse(saved) : {
      language: 'English',
      saveChatHistory: true,
      responseStyle: 'Balanced',
      defaultMode: 'auto',
      accentColor: '#8B5CF6',
      compactMode: false,
      customInstructions: '',
      notifications: true,
      soundEffects: false
    };
  });

  // Update settings function
  const updateSettings = (key, value) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('appSettings', JSON.stringify(updated));
      return updated;
    });
  };

  // Clear all user data
  const clearAllData = () => {
    if (confirm('Are you sure you want to delete all data? This cannot be undone.')) {
      localStorage.removeItem('chatHistory');
      localStorage.removeItem('appSettings');
      setChatHistory([]);
      setMessages([]);
      setSettings({
        language: 'English',
        saveChatHistory: true,
        responseStyle: 'Balanced',
        defaultMode: 'auto',
        accentColor: '#8B5CF6',
        compactMode: false,
        customInstructions: '',
        notifications: true,
        soundEffects: false
      });
    }
  };

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const profileMenuRef = useRef(null);

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

  // Initialize Speech Recognition and Synthesis
  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        
        setInput(transcript);
        
        // If it's a final result, auto-submit
        if (event.results[0].isFinal) {
          setTimeout(() => {
            setIsListening(false);
          }, 500);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      synthesisRef.current = window.speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, []);

  // Voice Assistant Functions
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const speakText = (text) => {
    if (synthesisRef.current && voiceEnabled) {
      // Cancel any ongoing speech
      synthesisRef.current.cancel();
      
      // Clean the text (remove markdown, code blocks, etc.)
      const cleanText = text
        .replace(/```[\s\S]*?```/g, 'Code block omitted.')
        .replace(/`[^`]+`/g, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/#{1,6}\s/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\n+/g, '. ')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Try to use a good voice
      const voices = synthesisRef.current.getVoices();
      const preferredVoice = voices.find(v => 
        v.name.includes('Samantha') || 
        v.name.includes('Google') || 
        v.name.includes('Microsoft') ||
        v.lang.startsWith('en')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synthesisRef.current.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleVoiceEnabled = () => {
    const newValue = !voiceEnabled;
    setVoiceEnabled(newValue);
    localStorage.setItem('voiceEnabled', JSON.stringify(newValue));
    if (!newValue && synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

      // Speak the response if voice is enabled
      if (voiceEnabled && response.data.answer) {
        speakText(response.data.answer);
      }
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

  // Settings Page Component
  const SettingsPage = () => {
    const [emailEdit, setEmailEdit] = useState(false);
    const [newEmail, setNewEmail] = useState(user?.email || '');
    const [showSuccess, setShowSuccess] = useState('');

    const handleEmailSave = () => {
      if (newEmail && newEmail !== user?.email) {
        const updatedUser = { ...user, email: newEmail };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setShowSuccess('Email updated successfully!');
        setTimeout(() => setShowSuccess(''), 3000);
      }
      setEmailEdit(false);
    };

    return (
    <div className={`flex-1 overflow-y-auto p-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setCurrentPage('chat')}
          className={`mb-6 flex items-center gap-2 ${isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
        >
          ← Back to Chat
        </button>
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        
        {showSuccess && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-500 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {showSuccess}
          </div>
        )}
        
        <div className="space-y-6">
          {/* General Settings */}
          <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/50 border border-zinc-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <h2 className="font-semibold mb-4">General</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Theme</p>
                  <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Choose light or dark mode</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${isDark ? 'bg-zinc-700 text-white hover:bg-zinc-600' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                >
                  {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  {isDark ? 'Dark' : 'Light'}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Language</p>
                  <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Select your preferred language</p>
                </div>
                <select 
                  value={settings.language}
                  onChange={(e) => updateSettings('language', e.target.value)}
                  className={`px-4 py-2 rounded-lg cursor-pointer ${isDark ? 'bg-zinc-700 text-white border-zinc-600' : 'bg-gray-100 text-gray-900 border-gray-200'} border`}
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Hindi">Hindi</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Notifications</p>
                  <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Receive system notifications</p>
                </div>
                <button
                  onClick={() => updateSettings('notifications', !settings.notifications)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${settings.notifications ? (isDark ? 'bg-purple-600' : 'bg-blue-500') : (isDark ? 'bg-zinc-600' : 'bg-gray-300')}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.notifications ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sound Effects</p>
                  <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Play sounds for actions</p>
                </div>
                <button
                  onClick={() => updateSettings('soundEffects', !settings.soundEffects)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${settings.soundEffects ? (isDark ? 'bg-purple-600' : 'bg-blue-500') : (isDark ? 'bg-zinc-600' : 'bg-gray-300')}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.soundEffects ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/50 border border-zinc-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <h2 className="font-semibold mb-4">Privacy</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Save Chat History</p>
                  <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Store conversations locally</p>
                </div>
                <button
                  onClick={() => updateSettings('saveChatHistory', !settings.saveChatHistory)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${settings.saveChatHistory ? (isDark ? 'bg-purple-600' : 'bg-blue-500') : (isDark ? 'bg-zinc-600' : 'bg-gray-300')}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.saveChatHistory ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Clear All Data</p>
                  <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Delete all local data and history</p>
                </div>
                <button 
                  onClick={clearAllData}
                  className="px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                >
                  Clear Data
                </button>
              </div>
            </div>
          </div>

          {/* Account Settings */}
          <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/50 border border-zinc-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <h2 className="font-semibold mb-4">Account</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">Email</p>
                  {emailEdit ? (
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className={`mt-1 w-full px-3 py-2 rounded-lg ${isDark ? 'bg-zinc-700 text-white border-zinc-600' : 'bg-gray-100 text-gray-900 border-gray-200'} border`}
                    />
                  ) : (
                    <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>{user?.email || 'user@example.com'}</p>
                  )}
                </div>
                {emailEdit ? (
                  <div className="flex gap-2 ml-4">
                    <button onClick={handleEmailSave} className={`px-3 py-1 rounded-lg bg-green-500 text-white hover:bg-green-600`}>Save</button>
                    <button onClick={() => setEmailEdit(false)} className={`px-3 py-1 rounded-lg ${isDark ? 'bg-zinc-700' : 'bg-gray-100'}`}>Cancel</button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setEmailEdit(true)}
                    className={`px-4 py-2 rounded-lg ${isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-gray-100 hover:bg-gray-200'} ml-4`}
                  >
                    Change
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Account Type</p>
                  <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                    {user?.provider === 'google' ? '🔗 Connected with Google' : '📧 Email & Password'}
                  </p>
                </div>
                {user?.provider === 'google' && user?.picture && (
                  <img src={user.picture} alt="Profile" className="w-10 h-10 rounded-full" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sign Out</p>
                  <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Log out from your account</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )};

  // Personalization Page Component
  const PersonalizationPage = () => {
    const [customText, setCustomText] = useState(settings.customInstructions);
    const [showSaved, setShowSaved] = useState(false);

    const handleSaveInstructions = () => {
      updateSettings('customInstructions', customText);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    };

    return (
    <div className={`flex-1 overflow-y-auto p-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setCurrentPage('chat')}
          className={`mb-6 flex items-center gap-2 ${isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
        >
          ← Back to Chat
        </button>
        <h1 className="text-2xl font-bold mb-6">Personalization</h1>
        
        {showSaved && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-500 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Settings saved successfully!
          </div>
        )}
        
        <div className="space-y-6">
          {/* AI Behavior */}
          <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/50 border border-zinc-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <h2 className="font-semibold mb-4">AI Behavior</h2>
            <div className="space-y-4">
              <div>
                <p className="font-medium mb-2">Response Style</p>
                <div className="flex gap-2">
                  {['Concise', 'Balanced', 'Detailed'].map((style) => (
                    <button
                      key={style}
                      onClick={() => updateSettings('responseStyle', style)}
                      className={`px-4 py-2 rounded-lg transition-all ${settings.responseStyle === style 
                        ? isDark ? 'bg-purple-600 text-white' : 'bg-blue-500 text-white'
                        : isDark ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-medium mb-2">Default Mode</p>
                <select 
                  value={settings.defaultMode}
                  onChange={(e) => {
                    updateSettings('defaultMode', e.target.value);
                    setMode(e.target.value);
                  }}
                  className={`w-full px-4 py-2 rounded-lg cursor-pointer ${isDark ? 'bg-zinc-700 text-white border-zinc-600' : 'bg-gray-100 text-gray-900 border-gray-200'} border`}
                >
                  <option value="auto">Auto - Intelligently switches</option>
                  <option value="rag">Documents - Search uploaded files</option>
                  <option value="general">General - AI assistant</option>
                </select>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/50 border border-zinc-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <h2 className="font-semibold mb-4">Appearance</h2>
            <div className="space-y-4">
              <div>
                <p className="font-medium mb-2">Accent Color</p>
                <div className="flex gap-3">
                  {[
                    { color: '#8B5CF6', name: 'Purple' },
                    { color: '#3B82F6', name: 'Blue' },
                    { color: '#10B981', name: 'Green' },
                    { color: '#F59E0B', name: 'Orange' },
                    { color: '#EF4444', name: 'Red' },
                    { color: '#EC4899', name: 'Pink' }
                  ].map(({ color, name }) => (
                    <button
                      key={color}
                      onClick={() => updateSettings('accentColor', color)}
                      className={`w-10 h-10 rounded-full transition-transform hover:scale-110 ${settings.accentColor === color ? 'ring-2 ring-offset-2 ring-offset-zinc-900' : ''}`}
                      style={{ backgroundColor: color, ringColor: color }}
                      title={name}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Compact Mode</p>
                  <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Reduce spacing and padding</p>
                </div>
                <button
                  onClick={() => updateSettings('compactMode', !settings.compactMode)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${settings.compactMode ? (isDark ? 'bg-purple-600' : 'bg-blue-500') : (isDark ? 'bg-zinc-600' : 'bg-gray-300')}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.compactMode ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Custom Instructions */}
          <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/50 border border-zinc-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <h2 className="font-semibold mb-4">Custom Instructions</h2>
            <p className={`text-sm mb-3 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
              Tell the AI about yourself and how you'd like it to respond
            </p>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="e.g., I'm a software developer. Please provide code examples when relevant. Keep explanations technical but clear..."
              className={`w-full h-32 px-4 py-3 rounded-lg resize-none ${
                isDark 
                  ? 'bg-zinc-700 text-white placeholder-zinc-500 border-zinc-600' 
                  : 'bg-gray-100 text-gray-900 placeholder-gray-400 border-gray-200'
              } border focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-purple-500' : 'focus:ring-blue-500'}`}
            />
            <div className="mt-3 flex items-center justify-between">
              <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                {customText.length}/500 characters
              </span>
              <button 
                onClick={handleSaveInstructions}
                className={`px-4 py-2 rounded-lg ${isDark ? 'bg-purple-600 hover:bg-purple-500' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}
              >
                Save Instructions
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )};

  // Help Page Component
  const HelpPage = () => {
    const [expandedFaq, setExpandedFaq] = useState(null);
    const [contactForm, setContactForm] = useState({ subject: '', message: '' });
    const [formSent, setFormSent] = useState(false);

    const faqs = [
      { q: 'How do I upload documents?', a: 'Click the "Upload" button in the header bar. You can drag and drop files or click to browse. Supported formats include PDF, DOCX, TXT, and XLSX. Files are processed locally for privacy.' },
      { q: 'What file types are supported?', a: 'The chatbot supports PDF, DOCX (Word documents), TXT (plain text), and XLSX (Excel spreadsheets). Maximum file size is 10MB per file.' },
      { q: 'How does Documents (RAG) mode work?', a: 'RAG (Retrieval-Augmented Generation) mode searches through your uploaded documents to find relevant information and uses it to provide accurate, contextual answers based on your content.' },
      { q: 'What is Auto mode?', a: 'Auto mode intelligently decides whether to search your documents or use general AI knowledge based on your question. It provides the best of both worlds!' },
      { q: 'Is my data private and secure?', a: 'Yes! All document processing happens locally on your device. Your files and conversations are stored only in your browser\'s local storage and are never sent to external servers (except for AI inference).' },
      { q: 'How can I delete my data?', a: 'Go to Settings > Privacy > Clear All Data. This will permanently delete all your chat history, uploaded documents, and preferences.' },
    ];

    const handleContactSubmit = () => {
      if (contactForm.subject && contactForm.message) {
        setFormSent(true);
        setContactForm({ subject: '', message: '' });
        setTimeout(() => setFormSent(false), 5000);
      }
    };

    return (
    <div className={`flex-1 overflow-y-auto p-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setCurrentPage('chat')}
          className={`mb-6 flex items-center gap-2 ${isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
        >
          ← Back to Chat
        </button>
        <h1 className="text-2xl font-bold mb-6">Help & Support</h1>
        
        <div className="space-y-6">
          {/* Quick Links */}
          <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/50 border border-zinc-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <h2 className="font-semibold mb-4">Quick Links</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Settings, label: 'Settings', page: 'settings' },
                { icon: Sliders, label: 'Personalization', page: 'personalization' },
                { icon: Upload, label: 'Upload Files', action: () => { setCurrentPage('chat'); setShowUploadPanel(true); } },
                { icon: Plus, label: 'New Chat', action: () => { setCurrentPage('chat'); startNewChat(); } },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={item.action || (() => setCurrentPage(item.page))}
                  className={`p-3 rounded-lg flex items-center gap-3 transition-colors ${isDark ? 'bg-zinc-700/50 hover:bg-zinc-700' : 'bg-gray-50 hover:bg-gray-100'}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/50 border border-zinc-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <h2 className="font-semibold mb-4">Frequently Asked Questions</h2>
            <div className="space-y-2">
              {faqs.map((faq, i) => (
                <div 
                  key={i} 
                  className={`rounded-lg overflow-hidden ${isDark ? 'bg-zinc-700/50' : 'bg-gray-50'}`}
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    className="w-full p-3 flex items-center justify-between text-left"
                  >
                    <span className="font-medium">{faq.q}</span>
                    <ChevronRight className={`w-5 h-5 transition-transform ${expandedFaq === i ? 'rotate-90' : ''}`} />
                  </button>
                  {expandedFaq === i && (
                    <div className={`px-3 pb-3 text-sm ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/50 border border-zinc-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <h2 className="font-semibold mb-4">Keyboard Shortcuts</h2>
            <div className="space-y-2">
              {[
                { key: 'Enter', action: 'Send message' },
                { key: 'Shift + Enter', action: 'New line in message' },
                { key: 'Ctrl/⌘ + N', action: 'New chat' },
                { key: 'Ctrl/⌘ + /', action: 'Toggle sidebar' },
                { key: 'Ctrl/⌘ + U', action: 'Upload files' },
                { key: 'Esc', action: 'Close dialogs' },
              ].map((shortcut, i) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <span className={isDark ? 'text-zinc-300' : 'text-gray-700'}>{shortcut.action}</span>
                  <kbd className={`px-2 py-1 rounded text-sm font-mono ${isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-gray-200 text-gray-700'}`}>
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Support */}
          <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/50 border border-zinc-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <h2 className="font-semibold mb-4">Contact Support</h2>
            {formSent ? (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-500 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Thank you! Your message has been sent. We'll get back to you soon.
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Subject"
                  value={contactForm.subject}
                  onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg ${isDark ? 'bg-zinc-700 text-white border-zinc-600 placeholder-zinc-500' : 'bg-gray-100 text-gray-900 border-gray-200 placeholder-gray-400'} border`}
                />
                <textarea
                  placeholder="Describe your issue or question..."
                  value={contactForm.message}
                  onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                  className={`w-full h-24 px-4 py-3 rounded-lg resize-none ${isDark ? 'bg-zinc-700 text-white border-zinc-600 placeholder-zinc-500' : 'bg-gray-100 text-gray-900 border-gray-200 placeholder-gray-400'} border`}
                />
                <button 
                  onClick={handleContactSubmit}
                  disabled={!contactForm.subject || !contactForm.message}
                  className={`px-4 py-2 rounded-lg ${isDark ? 'bg-purple-600 hover:bg-purple-500' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Send Message
                </button>
              </div>
            )}
          </div>

          {/* Version Info */}
          <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-zinc-800/50 border border-zinc-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <div className={`w-12 h-12 mx-auto mb-3 rounded-xl ${isDark ? 'bg-gradient-to-br from-purple-600 to-pink-600' : 'bg-gradient-to-br from-blue-500 to-cyan-500'} flex items-center justify-center`}>
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>RAG Chatbot</p>
            <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Version 2.0.0</p>
            <p className={`text-xs mt-2 ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>
              Built with ❤️ using React, Vite & Ollama
            </p>
          </div>
        </div>
      </div>
    </div>
  )};

  // Profile Page Component
  const ProfilePage = () => {
    const [editName, setEditName] = useState(false);
    const [newName, setNewName] = useState(user?.name || '');
    const [showSaved, setShowSaved] = useState(false);

    const handleSaveName = () => {
      if (newName && newName !== user?.name) {
        const updatedUser = { ...user, name: newName };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 3000);
      }
      setEditName(false);
    };

    return (
      <div className={`flex-1 overflow-y-auto p-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setCurrentPage('chat')}
            className={`mb-6 flex items-center gap-2 ${isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
          >
            ← Back to Chat
          </button>
          <h1 className="text-2xl font-bold mb-6">My Profile</h1>
          
          {showSaved && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-500 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Profile updated successfully!
            </div>
          )}
          
          <div className="space-y-6">
            {/* Profile Card */}
            <div className={`p-6 rounded-xl ${isDark ? 'bg-zinc-800/50 border border-zinc-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
              <div className="flex flex-col items-center text-center mb-6">
                {user?.picture ? (
                  <img 
                    src={user.picture} 
                    alt="Profile" 
                    className="w-24 h-24 rounded-full mb-4 border-4 border-purple-500/20"
                  />
                ) : (
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold mb-4 ${
                    isDark ? 'bg-gradient-to-br from-purple-600 to-pink-600' : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                  } text-white`}>
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                {editName ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className={`px-3 py-2 rounded-lg text-center ${isDark ? 'bg-zinc-700 text-white border-zinc-600' : 'bg-gray-100 text-gray-900 border-gray-200'} border`}
                    />
                    <button onClick={handleSaveName} className="px-3 py-2 rounded-lg bg-green-500 text-white">Save</button>
                    <button onClick={() => setEditName(false)} className={`px-3 py-2 rounded-lg ${isDark ? 'bg-zinc-700' : 'bg-gray-100'}`}>Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">{user?.name || 'User'}</h2>
                    <button 
                      onClick={() => setEditName(true)}
                      className={`p-1 rounded ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-gray-100'}`}
                    >
                      ✏️
                    </button>
                  </div>
                )}
                <p className={`${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>{user?.email}</p>
                {user?.provider === 'google' && (
                  <span className={`mt-2 px-3 py-1 rounded-full text-xs ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                    Connected with Google
                  </span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/50 border border-zinc-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
              <h2 className="font-semibold mb-4">Activity Stats</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg text-center ${isDark ? 'bg-zinc-700/50' : 'bg-gray-50'}`}>
                  <p className="text-2xl font-bold">{chatHistory.length}</p>
                  <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Chats</p>
                </div>
                <div className={`p-4 rounded-lg text-center ${isDark ? 'bg-zinc-700/50' : 'bg-gray-50'}`}>
                  <p className="text-2xl font-bold">{documents.length}</p>
                  <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Documents</p>
                </div>
                <div className={`p-4 rounded-lg text-center ${isDark ? 'bg-zinc-700/50' : 'bg-gray-50'}`}>
                  <p className="text-2xl font-bold">{messages.length}</p>
                  <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Messages</p>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/50 border border-zinc-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
              <h2 className="font-semibold mb-4">Account Information</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className={isDark ? 'text-zinc-400' : 'text-gray-500'}>Account Type</span>
                  <span className="font-medium">{user?.provider === 'google' ? 'Google Account' : 'Email Account'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={isDark ? 'text-zinc-400' : 'text-gray-500'}>Plan</span>
                  <span className="font-medium flex items-center gap-2">
                    Free
                    <button className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-purple-600 hover:bg-purple-500' : 'bg-blue-500 hover:bg-blue-600'} text-white`}>
                      Upgrade
                    </button>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={isDark ? 'text-zinc-400' : 'text-gray-500'}>Member Since</span>
                  <span className="font-medium">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/50 border border-zinc-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
              <h2 className="font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCurrentPage('settings')}
                  className={`p-3 rounded-lg flex items-center gap-3 transition-colors ${isDark ? 'bg-zinc-700/50 hover:bg-zinc-700' : 'bg-gray-50 hover:bg-gray-100'}`}
                >
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </button>
                <button
                  onClick={() => setCurrentPage('personalization')}
                  className={`p-3 rounded-lg flex items-center gap-3 transition-colors ${isDark ? 'bg-zinc-700/50 hover:bg-zinc-700' : 'bg-gray-50 hover:bg-gray-100'}`}
                >
                  <Sliders className="w-5 h-5" />
                  <span>Personalization</span>
                </button>
                <button
                  onClick={() => setCurrentPage('help')}
                  className={`p-3 rounded-lg flex items-center gap-3 transition-colors ${isDark ? 'bg-zinc-700/50 hover:bg-zinc-700' : 'bg-gray-50 hover:bg-gray-100'}`}
                >
                  <HelpCircle className="w-5 h-5" />
                  <span>Help</span>
                </button>
                <button
                  onClick={handleLogout}
                  className={`p-3 rounded-lg flex items-center gap-3 transition-colors bg-red-500/10 text-red-500 hover:bg-red-500/20`}
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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

                {/* Profile button with dropdown */}
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className={`flex items-center gap-2 p-1 rounded-xl transition-all ${
                      isDark ? 'hover:bg-zinc-700/50' : 'hover:bg-gray-200'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm ${
                      isDark ? 'bg-purple-600' : 'bg-blue-500'
                    }`}>
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  </button>

                  {/* Profile Dropdown Menu */}
                  {showProfileMenu && (
                    <div className={`absolute right-0 top-12 w-64 rounded-xl shadow-xl border z-50 overflow-hidden ${
                      isDark 
                        ? 'bg-zinc-800 border-zinc-700' 
                        : 'bg-white border-gray-200'
                    }`}>
                      {/* User Info */}
                      <div className={`p-4 border-b ${isDark ? 'border-zinc-700' : 'border-gray-200'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                            isDark ? 'bg-purple-600' : 'bg-blue-500'
                          }`}>
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {user?.name || 'User'}
                            </p>
                            <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                              @{user?.email?.split('@')[0] || 'user'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="p-2">
                        <button
                          onClick={() => { setShowProfileMenu(false); setCurrentPage('profile'); }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                            isDark ? 'hover:bg-zinc-700 text-zinc-300' : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <User className="w-5 h-5" />
                          <span>My Profile</span>
                        </button>
                        <button
                          onClick={() => { setShowProfileMenu(false); /* Upgrade logic */ }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                            isDark ? 'hover:bg-zinc-700 text-zinc-300' : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <Crown className="w-5 h-5" />
                          <span>Upgrade plan</span>
                        </button>
                        <button
                          onClick={() => { setShowProfileMenu(false); setCurrentPage('personalization'); }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                            isDark ? 'hover:bg-zinc-700 text-zinc-300' : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <Sliders className="w-5 h-5" />
                          <span>Personalization</span>
                        </button>
                        <button
                          onClick={() => { setShowProfileMenu(false); setCurrentPage('settings'); }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                            isDark ? 'hover:bg-zinc-700 text-zinc-300' : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <Settings className="w-5 h-5" />
                          <span>Settings</span>
                        </button>
                        <button
                          onClick={() => { setShowProfileMenu(false); setCurrentPage('help'); }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                            isDark ? 'hover:bg-zinc-700 text-zinc-300' : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <HelpCircle className="w-5 h-5" />
                            <span>Help</span>
                          </div>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Logout */}
                      <div className={`p-2 border-t ${isDark ? 'border-zinc-700' : 'border-gray-200'}`}>
                        <button
                          onClick={() => { setShowProfileMenu(false); handleLogout(); }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                            isDark ? 'hover:bg-zinc-700 text-zinc-300' : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <LogOut className="w-5 h-5" />
                          <span>Log out</span>
                        </button>
                      </div>

                      {/* Active Session */}
                      <div className={`p-3 border-t ${isDark ? 'border-zinc-700 bg-zinc-800/50' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                            isDark ? 'bg-purple-600' : 'bg-blue-500'
                          }`}>
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {user?.name || 'User'}
                            </p>
                            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                              Active now
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Render different pages based on currentPage */}
          {currentPage === 'settings' && <SettingsPage />}
          {currentPage === 'personalization' && <PersonalizationPage />}
          {currentPage === 'help' && <HelpPage />}
          {currentPage === 'profile' && <ProfilePage />}
          
          {/* Main Chat Area - only show when on chat page */}
          {currentPage === 'chat' && (
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
                  
                  {/* Read Aloud Button for assistant messages */}
                  {message.role === 'assistant' && !message.isError && (
                    <div className={`mt-2 pt-2 border-t ${isDark ? 'border-zinc-700/50' : 'border-gray-100'}`}>
                      <button
                        onClick={() => speakText(message.content)}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
                          isDark 
                            ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50' 
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                        title="Read aloud"
                      >
                        <Volume2 className="w-3 h-3" />
                        Read aloud
                      </button>
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
              {/* Voice Input Button */}
              {speechSupported && (
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`p-3 rounded-xl transition-all ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : isDark
                        ? 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                  }`}
                  title={isListening ? 'Stop listening' : 'Voice input'}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}
              
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={isListening ? "Listening..." : "Type your message..."}
                className={`flex-1 px-4 py-3 bg-transparent outline-none ${
                  isDark 
                    ? 'text-white placeholder-zinc-500' 
                    : 'text-gray-900 placeholder-gray-400'
                } ${isListening ? 'animate-pulse' : ''}`}
              />

              {/* Voice Output Toggle */}
              <button
                onClick={isSpeaking ? stopSpeaking : toggleVoiceEnabled}
                className={`p-3 rounded-xl transition-all ${
                  isSpeaking
                    ? 'bg-green-500 text-white animate-pulse'
                    : voiceEnabled
                      ? isDark
                        ? 'bg-zinc-700/50 text-emerald-400 hover:bg-zinc-700'
                        : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                      : isDark
                        ? 'bg-zinc-700/50 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-400'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
                title={isSpeaking ? 'Stop speaking' : voiceEnabled ? 'Voice responses ON' : 'Voice responses OFF'}
              >
                {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>

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
            
            {/* Voice Status Indicator */}
            {(isListening || isSpeaking) && (
              <div className={`mt-2 text-center text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                {isListening && (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    Listening... Speak now
                  </span>
                )}
                {isSpeaking && (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Speaking... Click speaker to stop
                  </span>
                )}
              </div>
            )}
          </div>
        </main>
          )}

        {/* Upload Panel */}
        {showUploadPanel && currentPage === 'chat' && (
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
