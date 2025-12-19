import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class DocumentProcessor {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 800;  // Optimal size for context
    this.chunkOverlap = options.chunkOverlap || 200;  // More overlap for better continuity
  }

  async processFile(filePath, originalName) {
    const ext = path.extname(originalName).toLowerCase();
    let text = '';
    let metadata = { filename: originalName, type: ext };

    switch (ext) {
      case '.pdf':
        text = await this.extractPDF(filePath);
        break;
      case '.docx':
        text = await this.extractDocx(filePath);
        break;
      case '.xlsx':
      case '.xls':
        text = await this.extractExcel(filePath);
        break;
      case '.pptx':
        text = await this.extractPptx(filePath);
        break;
      case '.txt':
      case '.md':
      case '.markdown':
        text = fs.readFileSync(filePath, 'utf-8');
        break;
      case '.csv':
        text = await this.extractCSV(filePath);
        break;
      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }

    return this.createChunks(text, metadata);
  }

  async processUrl(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RAGBot/1.0)'
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      
      // Remove script and style elements
      $('script, style, nav, footer, header, aside').remove();
      
      // Extract main content
      let text = '';
      
      // Try to find main content areas
      const mainSelectors = ['main', 'article', '.content', '#content', '.post', '.entry'];
      for (const selector of mainSelectors) {
        if ($(selector).length) {
          text = $(selector).text();
          break;
        }
      }
      
      // Fallback to body
      if (!text) {
        text = $('body').text();
      }

      // Clean up text
      text = text
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();

      const metadata = { url, type: 'webpage', title: $('title').text() || url };
      return this.createChunks(text, metadata);

    } catch (error) {
      throw new Error(`Failed to fetch URL: ${error.message}`);
    }
  }

  async extractPDF(filePath) {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  async extractDocx(filePath) {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  async extractExcel(filePath) {
    const workbook = XLSX.readFile(filePath);
    let text = '';
    
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_csv(sheet);
      text += `\n=== Sheet: ${sheetName} ===\n${data}\n`;
    }
    
    return text;
  }

  async extractPptx(filePath) {
    // For PPTX, we'll use mammoth as a fallback (limited support)
    // In production, you'd want a dedicated PPTX parser
    try {
      const buffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer });
      return result.value || 'Unable to extract text from PowerPoint';
    } catch {
      return 'PowerPoint extraction not fully supported';
    }
  }

  async extractCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content;
  }

  createChunks(text, metadata) {
    const chunks = [];
    const sentences = this.splitIntoSentences(text);
    
    let currentChunk = '';
    let currentLength = 0;
    let chunkIndex = 0;

    for (const sentence of sentences) {
      if (currentLength + sentence.length > this.chunkSize && currentChunk) {
        chunks.push({
          id: `${metadata.filename || metadata.url}-chunk-${chunkIndex}`,
          content: currentChunk.trim(),
          metadata: {
            ...metadata,
            chunkIndex,
            charStart: chunkIndex * (this.chunkSize - this.chunkOverlap),
            charEnd: chunkIndex * (this.chunkSize - this.chunkOverlap) + currentChunk.length
          }
        });
        
        // Keep overlap
        const words = currentChunk.split(' ');
        const overlapWords = Math.ceil(words.length * (this.chunkOverlap / this.chunkSize));
        currentChunk = words.slice(-overlapWords).join(' ') + ' ';
        currentLength = currentChunk.length;
        chunkIndex++;
      }
      
      currentChunk += sentence + ' ';
      currentLength += sentence.length + 1;
    }

    // Add remaining chunk
    if (currentChunk.trim()) {
      chunks.push({
        id: `${metadata.filename || metadata.url}-chunk-${chunkIndex}`,
        content: currentChunk.trim(),
        metadata: {
          ...metadata,
          chunkIndex,
          charStart: chunkIndex * (this.chunkSize - this.chunkOverlap),
          charEnd: chunkIndex * (this.chunkSize - this.chunkOverlap) + currentChunk.length
        }
      });
    }

    return chunks;
  }

  splitIntoSentences(text) {
    // Improved sentence splitting that preserves structure
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')  // Normalize multiple newlines
      .split(/(?<=[.!?])\s+|\n{2,}/)  // Split on sentence endings or double newlines
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
}
