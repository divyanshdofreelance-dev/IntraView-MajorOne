import { createWorker, Worker } from 'tesseract.js';
import * as fs from 'fs';

export interface OCRResult {
  text: string;
  confidence: number;
  words?: Array<{
    text: string;
    bbox: { x0: number; y0: number; x1: number; y1: number };
    confidence: number;
  }>;
}

export class OCRService {
  private worker: Worker | null = null;
  private isInitialized: boolean = false;

  /**
   * Initialize the Tesseract worker
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.worker) {
      return;
    }

    try {
      console.log('[OCR] Initializing Tesseract worker...');
      this.worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      this.isInitialized = true;
      console.log('[OCR] Tesseract worker initialized successfully');
    } catch (error: any) {
      console.error('[OCR] Failed to initialize worker:', error);
      throw new Error(`Failed to initialize OCR: ${error.message}`);
    }
  }

  /**
   * Extract text from an image file using OCR
   */
  async extractText(imagePath: string): Promise<OCRResult> {
    if (!this.isInitialized || !this.worker) {
      await this.initialize();
    }

    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    try {
      console.log(`[OCR] Extracting text from: ${imagePath}`);
      
      if (!this.worker) {
        throw new Error('OCR worker not initialized');
      }

      // Read image file
      const imageBuffer = fs.readFileSync(imagePath);
      
      // Perform OCR
      const { data } = await this.worker.recognize(imageBuffer);
      
      const result: OCRResult = {
        text: data.text.trim(),
        confidence: data.confidence || 0,
        words: data.words?.map(word => ({
          text: word.text,
          bbox: word.bbox,
          confidence: word.confidence || 0
        }))
      };

      console.log(`[OCR] Extracted ${result.text.length} characters with ${Math.round(result.confidence)}% confidence`);
      
      return result;
    } catch (error: any) {
      console.error('[OCR] Error extracting text:', error);
      throw new Error(`OCR extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract text from image buffer
   */
  async extractTextFromBuffer(imageBuffer: Buffer): Promise<OCRResult> {
    if (!this.isInitialized || !this.worker) {
      await this.initialize();
    }

    try {
      console.log('[OCR] Extracting text from image buffer...');
      
      if (!this.worker) {
        throw new Error('OCR worker not initialized');
      }

      // Perform OCR
      const { data } = await this.worker.recognize(imageBuffer);
      
      const result: OCRResult = {
        text: data.text.trim(),
        confidence: data.confidence || 0,
        words: data.words?.map(word => ({
          text: word.text,
          bbox: word.bbox,
          confidence: word.confidence || 0
        }))
      };

      console.log(`[OCR] Extracted ${result.text.length} characters with ${Math.round(result.confidence)}% confidence`);
      
      return result;
    } catch (error: any) {
      console.error('[OCR] Error extracting text:', error);
      throw new Error(`OCR extraction failed: ${error.message}`);
    }
  }

  /**
   * Terminate the worker and cleanup
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.terminate();
        this.worker = null;
        this.isInitialized = false;
        console.log('[OCR] Worker terminated');
      } catch (error: any) {
        console.error('[OCR] Error terminating worker:', error);
      }
    }
  }
}

