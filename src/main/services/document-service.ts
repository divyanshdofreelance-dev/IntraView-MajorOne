import * as fs from 'fs';
import * as path from 'path';

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  pageNumber?: number;
  chunkIndex: number;
}

export interface Document {
  id: string;
  name: string;
  filePath: string;
  fileType: string;
  uploadedAt: number;
  chunks: DocumentChunk[];
  text: string;
}

export class DocumentService {
  private documents: Map<string, Document> = new Map();
  private readonly chunkSize: number = 1000; // characters per chunk
  private readonly chunkOverlap: number = 200; // overlap between chunks

  /**
   * Process and store a document
   */
  async addDocument(filePath: string): Promise<Document> {
    const fileStats = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    const fileExt = path.extname(fileName).toLowerCase();
    
    const documentId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    let text: string;
    
    try {
      // Extract text based on file type
      if (fileExt === '.pdf') {
        // Use pdfjs-dist which works better in Electron
        try {
          const pdfjsLib = eval('require')('pdfjs-dist/legacy/build/pdf.js');
          const dataBuffer = fs.readFileSync(filePath);
          const dataArray = new Uint8Array(dataBuffer);
          const loadingTask = pdfjsLib.getDocument({ data: dataArray });
          const pdfDocument = await loadingTask.promise;
          
          let fullText = '';
          for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
            const page = await pdfDocument.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            fullText += pageText + '\n';
          }
          text = fullText.trim();
        } catch (pdfError: any) {
          throw new Error(`PDF parsing failed: ${pdfError.message}`);
        }
      } else if (fileExt === '.docx' || fileExt === '.doc') {
        // Dynamic require for mammoth
        try {
          const mammoth = eval('require')('mammoth');
          const result = await mammoth.extractRawText({ path: filePath });
          text = result.value;
        } catch (mammothError: any) {
          throw new Error(`Word document parsing failed: ${mammothError.message}`);
        }
      } else if (fileExt === '.txt' || fileExt === '.md') {
        text = fs.readFileSync(filePath, 'utf-8');
      } else {
        throw new Error(`Unsupported file type: ${fileExt}`);
      }

      // Chunk the document
      const chunks = this.chunkText(text, documentId);

      const document: Document = {
        id: documentId,
        name: fileName,
        filePath: filePath,
        fileType: fileExt,
        uploadedAt: Date.now(),
        chunks: chunks,
        text: text,
      };

      this.documents.set(documentId, document);
      return document;
    } catch (error: any) {
      throw new Error(`Failed to process document: ${error.message}`);
    }
  }

  /**
   * Split text into chunks with overlap
   */
  private chunkText(text: string, documentId: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + this.chunkSize, text.length);
      let chunkText = text.substring(start, end);

      // Try to break at sentence boundaries
      if (end < text.length) {
        const lastPeriod = chunkText.lastIndexOf('.');
        const lastNewline = chunkText.lastIndexOf('\n');
        const breakPoint = Math.max(lastPeriod, lastNewline);
        
        if (breakPoint > this.chunkSize * 0.5) {
          chunkText = chunkText.substring(0, breakPoint + 1);
          start += breakPoint + 1;
        } else {
          start = end - this.chunkOverlap;
        }
      } else {
        start = end;
      }

      chunks.push({
        id: `${documentId}-chunk-${chunkIndex}`,
        documentId: documentId,
        content: chunkText.trim(),
        chunkIndex: chunkIndex++,
      });
    }

    return chunks;
  }

  /**
   * Find relevant chunks based on query
   */
  findRelevantChunks(query: string, maxChunks: number = 5): DocumentChunk[] {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

    const scoredChunks: Array<{ chunk: DocumentChunk; score: number }> = [];

    for (const doc of this.documents.values()) {
      for (const chunk of doc.chunks) {
        const contentLower = chunk.content.toLowerCase();
        let score = 0;

        // Simple keyword matching - count occurrences
        for (const word of queryWords) {
          const regex = new RegExp(`\\b${word}\\b`, 'gi');
          const matches = contentLower.match(regex);
          if (matches) {
            score += matches.length;
          }
        }

        // Bonus for exact phrase match
        if (contentLower.includes(queryLower)) {
          score += 10;
        }

        if (score > 0) {
          scoredChunks.push({ chunk, score });
        }
      }
    }

    // Sort by score and return top chunks
    scoredChunks.sort((a, b) => b.score - a.score);
    return scoredChunks.slice(0, maxChunks).map(item => item.chunk);
  }

  /**
   * Get all documents
   */
  getAllDocuments(): Document[] {
    return Array.from(this.documents.values());
  }

  /**
   * Get a document by ID
   */
  getDocument(id: string): Document | undefined {
    return this.documents.get(id);
  }

  /**
   * Remove a document
   */
  removeDocument(id: string): boolean {
    return this.documents.delete(id);
  }

  /**
   * Clear all documents
   */
  clearAllDocuments(): void {
    this.documents.clear();
  }

  /**
   * Get document count
   */
  getDocumentCount(): number {
    return this.documents.size;
  }
}
