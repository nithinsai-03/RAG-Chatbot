export class ChatRouter {
  constructor(vectorStore, llmService) {
    this.vectorStore = vectorStore;
    this.llmService = llmService;
    this.relevanceThreshold = 0.15;  // Lower threshold to catch more matches
  }

  async route(query, requestedMode, conversationHistory = []) {
    const hasDocuments = this.vectorStore.hasDocuments();
    
    // Determine actual mode to use
    let mode = requestedMode;
    
    if (mode === 'auto') {
      mode = await this.autoDetectMode(query, hasDocuments);
    } else if (mode === 'rag' && !hasDocuments) {
      // Can't use RAG without documents
      return {
        answer: "No documents have been uploaded yet. Please upload documents first to use RAG mode, or switch to General mode for open-ended questions.",
        mode: 'error',
        sources: []
      };
    }

    // Route to appropriate handler
    if (mode === 'rag') {
      return this.handleRAGQuery(query, conversationHistory);
    } else {
      return this.handleGeneralQuery(query, conversationHistory);
    }
  }

  async autoDetectMode(query, hasDocuments) {
    if (!hasDocuments) {
      return 'general';
    }

    // Check if query seems document-related
    const documentKeywords = [
      'document', 'file', 'uploaded', 'says', 'mentioned', 'according to',
      'in the', 'from the', 'based on', 'what does', 'find', 'search',
      'look for', 'locate', 'extract', 'summarize', 'summary'
    ];

    const queryLower = query.toLowerCase();
    const isDocumentQuery = documentKeywords.some(kw => queryLower.includes(kw));

    if (isDocumentQuery) {
      return 'rag';
    }

    // Do a quick relevance check
    const results = await this.vectorStore.hybridSearch(query, 1);
    
    if (results.length > 0 && results[0].score > this.relevanceThreshold) {
      return 'rag';
    }

    return 'general';
  }

  async handleRAGQuery(query, conversationHistory) {
    console.log('Handling RAG query...');
    
    // Retrieve more chunks for better context (increased from 5 to 8)
    const retrievedChunks = await this.vectorStore.hybridSearch(query, 8);
    
    // Filter by relevance threshold
    const relevantChunks = retrievedChunks.filter(
      chunk => chunk.score >= this.relevanceThreshold
    );

    if (relevantChunks.length === 0) {
      // Try with even lower threshold as fallback
      const fallbackChunks = retrievedChunks.filter(chunk => chunk.score >= 0.1);
      if (fallbackChunks.length > 0) {
        const response = await this.llmService.generateRAGResponse(
          query,
          fallbackChunks.slice(0, 5),
          conversationHistory
        );
        return {
          ...response,
          mode: 'rag',
          retrievedCount: fallbackChunks.length
        };
      }
      
      return {
        answer: "I searched through the uploaded documents but couldn't find information directly relevant to your question. Try rephrasing your question or ask something more specific about the document content.",
        mode: 'rag',
        sources: [],
        noRelevantResults: true
      };
    }

    // Generate response using LLM
    const response = await this.llmService.generateRAGResponse(
      query,
      relevantChunks,
      conversationHistory
    );

    return {
      ...response,
      mode: 'rag',
      retrievedCount: relevantChunks.length
    };
  }

  async handleGeneralQuery(query, conversationHistory) {
    console.log('Handling general query...');
    
    const response = await this.llmService.generateGeneralResponse(
      query,
      conversationHistory
    );

    return {
      ...response,
      mode: 'general'
    };
  }
}
