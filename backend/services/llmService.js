import OpenAI from 'openai';

export class LLMService {
  constructor() {
    this.currentModel = process.env.DEFAULT_MODEL || 'ollama-llama3.2';
    this.openai = null;
    this.deepseek = null;
    this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    
    // Initialize OpenAI if API key is available
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 10) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }

    // Initialize DeepSeek if API key is available
    if (process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.length > 10) {
      this.deepseek = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com'
      });
    }

    this.models = {
      // Ollama models (free, local)
      'ollama-llama3.2': { provider: 'ollama', modelName: 'llama3.2:1b', name: 'Llama 3.2 1B (Local)', available: true },
      'ollama-llama3.2-3b': { provider: 'ollama', modelName: 'llama3.2:3b', name: 'Llama 3.2 3B (Local)', available: true },
      // DeepSeek models
      'deepseek-chat': { provider: 'deepseek', name: 'DeepSeek Chat', available: !!this.deepseek },
      'deepseek-coder': { provider: 'deepseek', name: 'DeepSeek Coder', available: !!this.deepseek },
      // OpenAI models
      'gpt-3.5-turbo': { provider: 'openai', name: 'GPT-3.5 Turbo', available: !!this.openai },
      'gpt-4': { provider: 'openai', name: 'GPT-4', available: !!this.openai },
      'gpt-4-turbo': { provider: 'openai', name: 'GPT-4 Turbo', available: !!this.openai },
      // Local fallback
      'local-simple': { provider: 'local', name: 'Local (No LLM)', available: true }
    };

    // Set default model - prefer Ollama (free local)
    this.currentModel = 'ollama-llama3.2';
    console.log('✅ Using Ollama with Llama 3.2 (local, free)');
  }

  getAvailableModels() {
    return Object.entries(this.models)
      .filter(([_, config]) => config.available)
      .map(([id, config]) => ({
        id,
        name: config.name,
        provider: config.provider
      }));
  }

  getCurrentModel() {
    return this.currentModel;
  }

  setModel(modelId) {
    if (!this.models[modelId]) {
      throw new Error(`Unknown model: ${modelId}`);
    }
    if (!this.models[modelId].available) {
      throw new Error(`Model not available: ${modelId}`);
    }
    this.currentModel = modelId;
  }

  async generateResponse(prompt, context = null, conversationHistory = []) {
    const model = this.models[this.currentModel];

    if (model.provider === 'ollama') {
      return this.generateOllama(prompt, context, conversationHistory);
    }

    if (model.provider === 'deepseek' && this.deepseek) {
      return this.generateDeepSeek(prompt, context, conversationHistory);
    }

    if (model.provider === 'openai' && this.openai) {
      return this.generateOpenAI(prompt, context, conversationHistory);
    }

    // Fallback to local simple response
    return this.generateLocalResponse(prompt, context);
  }

  async generateOllama(prompt, context, conversationHistory) {
    const systemPrompt = context
      ? `You are a helpful AI assistant that answers questions based on the provided context. 
         Always cite your sources and indicate which part of the context your answer comes from.
         If the context doesn't contain relevant information, say so clearly.
         Do not make up information that isn't in the context.
         Be concise but thorough in your responses.
         
         Context:
         ${context}`
      : `You are a helpful AI assistant. Provide accurate, helpful, and well-structured responses to user questions.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: prompt }
    ];

    try {
      const modelConfig = this.models[this.currentModel];
      const response = await fetch(`${this.ollamaBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelConfig.modelName,
          messages,
          stream: false,
          options: {
            temperature: context ? 0.3 : 0.7,
            num_predict: 2000
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.message.content;
    } catch (error) {
      console.error('Ollama API error:', error);
      throw new Error(`Ollama error: ${error.message}`);
    }
  }

  async generateDeepSeek(prompt, context, conversationHistory) {
    const systemPrompt = context
      ? `You are a helpful AI assistant that answers questions based on the provided context. 
         Always cite your sources and indicate which part of the context your answer comes from.
         If the context doesn't contain relevant information, say so clearly.
         Do not make up information that isn't in the context.
         Be concise but thorough in your responses.
         
         Context:
         ${context}`
      : `You are a helpful AI assistant. Provide accurate, helpful, and well-structured responses to user questions.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: prompt }
    ];

    try {
      const completion = await this.deepseek.chat.completions.create({
        model: this.currentModel,
        messages,
        temperature: context ? 0.3 : 0.7,
        max_tokens: 2000,
        stream: false
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('DeepSeek API error:', error);
      throw new Error(`DeepSeek error: ${error.message}`);
    }
  }

  async generateOpenAI(prompt, context, conversationHistory) {
    const systemPrompt = context
      ? `You are a helpful AI assistant that answers questions based on the provided context. 
         Always cite your sources and indicate which part of the context your answer comes from.
         If the context doesn't contain relevant information, say so clearly.
         Do not make up information that isn't in the context.
         
         Context:
         ${context}`
      : `You are a helpful AI assistant. Provide accurate, helpful responses to user questions.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: prompt }
    ];

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.currentModel,
        messages,
        temperature: context ? 0.3 : 0.7,
        max_tokens: 1000
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`LLM error: ${error.message}`);
    }
  }

  generateLocalResponse(prompt, context) {
    if (context) {
      return `Based on the provided documents, here is the relevant information:\n\n${context}\n\n---\n*Note: This response shows the raw retrieved context. Connect an LLM (like DeepSeek or OpenAI) for intelligent answers.*`;
    }
    
    return `I'm running in local mode without an LLM connection. To get intelligent responses:\n\n1. Add your DeepSeek or OpenAI API key to the .env file\n2. Or upload documents to use RAG mode\n\nYour question was: "${prompt}"`;
  }

  async generateRAGResponse(query, retrievedChunks, conversationHistory = []) {
    if (retrievedChunks.length === 0) {
      return {
        answer: "I couldn't find any relevant information in the uploaded documents to answer your question.",
        sources: []
      };
    }

    // Build context from retrieved chunks
    const context = retrievedChunks
      .map((chunk, i) => `[Source ${i + 1} - ${chunk.metadata.filename || chunk.metadata.url}]\n${chunk.content}`)
      .join('\n\n---\n\n');

    const answer = await this.generateResponse(query, context, conversationHistory);

    // Format sources for citation
    const sources = retrievedChunks.map((chunk, i) => ({
      id: i + 1,
      content: chunk.content,
      source: chunk.metadata.filename || chunk.metadata.url || 'Unknown',
      score: (chunk.score * 100).toFixed(1) + '%',
      chunkIndex: chunk.metadata.chunkIndex
    }));

    return { answer, sources };
  }

  async generateGeneralResponse(query, conversationHistory = []) {
    const answer = await this.generateResponse(query, null, conversationHistory);
    return { answer, sources: [] };
  }
}
