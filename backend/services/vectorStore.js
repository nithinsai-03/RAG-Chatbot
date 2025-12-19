import { pipeline } from '@xenova/transformers';

export class VectorStore {
  constructor() {
    this.documents = new Map(); // docId -> { name, chunks }
    this.chunks = []; // All chunks with embeddings
    this.embedder = null;
    this.initialized = false;
    this.initPromise = null;
    this.batchSize = 20; // Process 20 chunks at a time for faster processing
  }

  async initialize() {
    if (this.initialized) return;
    
    // Prevent multiple simultaneous initializations
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = (async () => {
      console.log('Loading embedding model (this may take a moment on first run)...');
      this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      this.initialized = true;
      console.log('Embedding model loaded successfully!');
    })();
    
    return this.initPromise;
  }

  async generateEmbedding(text) {
    if (!this.embedder) {
      await this.initialize();
    }
    
    // Truncate long texts
    const truncatedText = text.substring(0, 512);
    const output = await this.embedder(truncatedText, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  // Batch generate embeddings for faster processing
  async generateEmbeddingsBatch(texts) {
    if (!this.embedder) {
      await this.initialize();
    }
    
    const embeddings = [];
    // Process in parallel batches
    const truncatedTexts = texts.map(text => text.substring(0, 512));
    
    // Process all texts in parallel using Promise.all
    const promises = truncatedTexts.map(async (text) => {
      const output = await this.embedder(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    });
    
    return Promise.all(promises);
  }

  async addDocument(docId, name, chunks) {
    console.log(`Adding document: ${name} with ${chunks.length} chunks`);
    const startTime = Date.now();
    
    // Pre-initialize embedder to avoid delay during processing
    await this.initialize();
    
    const processedChunks = [];
    
    // Process in batches for speed
    for (let i = 0; i < chunks.length; i += this.batchSize) {
      const batch = chunks.slice(i, i + this.batchSize);
      const batchTexts = batch.map(chunk => chunk.content);
      
      // Generate embeddings in parallel
      const embeddings = await this.generateEmbeddingsBatch(batchTexts);
      
      // Process batch results
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        processedChunks.push({
          ...chunk,
          docId,
          embedding: embeddings[j],
          keywords: this.extractKeywords(chunk.content)
        });
      }
      
      const processed = Math.min(i + this.batchSize, chunks.length);
      console.log(`  Processed ${processed}/${chunks.length} chunks`);
    }

    this.documents.set(docId, {
      id: docId,
      name,
      chunkCount: processedChunks.length,
      addedAt: new Date().toISOString()
    });

    this.chunks.push(...processedChunks);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Document added in ${elapsed}s. Total chunks: ${this.chunks.length}`);
  }

  extractKeywords(text) {
    // Simple keyword extraction
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
      'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
      'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
      'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
      'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
      'very', 'just', 'as', 'if', 'then', 'because', 'while', 'although'
    ]);

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    // Get unique words with frequency
    const wordFreq = {};
    for (const word of words) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }

    // Return top keywords
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  keywordMatch(queryKeywords, chunkKeywords) {
    const matches = queryKeywords.filter(kw => chunkKeywords.includes(kw));
    return matches.length / Math.max(queryKeywords.length, 1);
  }

  async vectorSearch(query, topK = 5) {
    if (this.chunks.length === 0) {
      return [];
    }

    const queryEmbedding = await this.generateEmbedding(query);

    const results = this.chunks.map(chunk => ({
      ...chunk,
      similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding)
    }));

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }

  async hybridSearch(query, topK = 8) {
    if (this.chunks.length === 0) {
      return [];
    }

    const queryEmbedding = await this.generateEmbedding(query);
    const queryKeywords = this.extractKeywords(query);
    const queryLower = query.toLowerCase();

    const results = this.chunks.map(chunk => {
      const vectorScore = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      const keywordScore = this.keywordMatch(queryKeywords, chunk.keywords);
      
      // Boost score if exact phrases are found
      const contentLower = chunk.content.toLowerCase();
      let phraseBoost = 0;
      
      // Check for exact phrase matches (important words from query)
      const importantWords = queryKeywords.slice(0, 5);
      for (const word of importantWords) {
        if (contentLower.includes(word)) {
          phraseBoost += 0.05;
        }
      }
      
      // Check if query words appear close together (phrase proximity)
      if (importantWords.length >= 2) {
        const twoWordPhrase = importantWords.slice(0, 2).join(' ');
        if (contentLower.includes(twoWordPhrase)) {
          phraseBoost += 0.1;
        }
      }
      
      // Combine scores (60% vector, 25% keyword, 15% phrase boost)
      const combinedScore = (vectorScore * 0.6) + (keywordScore * 0.25) + Math.min(phraseBoost, 0.15);

      return {
        id: chunk.id,
        content: chunk.content,
        metadata: chunk.metadata,
        docId: chunk.docId,
        vectorScore,
        keywordScore,
        phraseBoost,
        score: combinedScore
      };
    });

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  removeDocument(docId) {
    if (!this.documents.has(docId)) {
      throw new Error('Document not found');
    }

    this.chunks = this.chunks.filter(chunk => chunk.docId !== docId);
    this.documents.delete(docId);
  }

  clear() {
    this.chunks = [];
    this.documents.clear();
  }

  getDocuments() {
    return Array.from(this.documents.values());
  }

  getDocumentCount() {
    return this.documents.size;
  }

  getChunkCount() {
    return this.chunks.length;
  }

  hasDocuments() {
    return this.chunks.length > 0;
  }
}
