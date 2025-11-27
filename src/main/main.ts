import { app, BrowserWindow, ipcMain, globalShortcut, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import Store from 'electron-store';
import { OverlayManager } from './overlay-manager';
import { excludeWindowFromCapture, hideWindowFromTaskManager } from './window-capture-exclusion';
import { DocumentService, Document } from './services/document-service';
import { ScreenshotService } from './services/screenshot-service';
import { OCRService } from './services/ocr-service';
import { ScreenAreaSelector, SelectedArea } from './services/screen-area-selector';

interface AppSettings {
  apiKey?: string;
  model?: string;
}

interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string | MessageContent[];
}

const store = new Store<AppSettings>();

class ChatApp {
  private mainWindow: BrowserWindow | null = null;
  private settingsWindow: BrowserWindow | null = null;
  private overlayManager: OverlayManager;
  private documentService: DocumentService;
  private screenshotService: ScreenshotService;
  private ocrService: OCRService;
  private areaSelector: ScreenAreaSelector;
  private isAppHidden: boolean = false;
  private isCapturing: boolean = false;

  constructor() {
    this.overlayManager = new OverlayManager();
    this.documentService = new DocumentService();
    this.screenshotService = new ScreenshotService();
    this.ocrService = new OCRService();
    this.areaSelector = new ScreenAreaSelector();
  }

  async initialize() {
    // Start the overlay first
    console.log('[App] Starting overlay...');
    const overlayStarted = await this.overlayManager.start();
    
    if (overlayStarted) {
      console.log('[App] Overlay started successfully!');
    } else {
      console.warn('[App] Overlay failed to start, continuing anyway...');
    }

    this.createMainWindow();
    this.setupIPC();
    this.setupGlobalHotkeys();
  }

  private createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 900,
      height: 700,
      transparent: true,
      frame: false,
      alwaysOnTop: false,
      skipTaskbar: true,
      focusable: true,
      show: false, // Don't show immediately - we'll show after setting styles
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
      title: 'AI Chat',
    });

    this.mainWindow.loadFile(path.join(__dirname, '../renderer/chat.html'));
    
    // Hide from Alt+Tab on Windows
    this.mainWindow.setSkipTaskbar(true);
    
    // Set always on top with screen-saver level
    this.mainWindow.setAlwaysOnTop(true, 'screen-saver');
    
    // Move to Background processes - call on multiple events to ensure it works
    if (process.platform === 'win32') {
      // Call immediately after window creation
      setTimeout(() => {
        if (this.mainWindow) {
          hideWindowFromTaskManager(this.mainWindow);
        }
      }, 200);
      
      // Call when window is ready to show (before it's actually shown)
      this.mainWindow.once('ready-to-show', () => {
        if (this.mainWindow) {
          hideWindowFromTaskManager(this.mainWindow);
        }
      });
    }
    
    // Show the window after content loads
    this.mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        if (this.mainWindow && !this.mainWindow.isVisible()) {
          this.mainWindow.show();
        }
        this.setWindowCaptureExclusion();
        // Try moving to Background processes again after window is shown
        if (process.platform === 'win32') {
          setTimeout(() => {
            if (this.mainWindow) {
              hideWindowFromTaskManager(this.mainWindow);
            }
          }, 300);
        }
      }, 100);
    });
  }

  private setWindowCaptureExclusion() {
    if (process.platform !== 'win32' || !this.mainWindow) {
      return;
    }

    console.log('[Window] Attempting to exclude window from screen capture...');
    
    // Small delay to ensure window is fully created
    setTimeout(() => {
      if (this.mainWindow) {
        excludeWindowFromCapture(this.mainWindow);
      }
    }, 1000);
  }

  private hideFromTaskManager() {
    if (process.platform !== 'win32' || !this.mainWindow) {
      return;
    }

    console.log('[Window] Attempting to hide window from Task Manager...');
    
    // Small delay to ensure window is fully created
    setTimeout(() => {
      if (this.mainWindow) {
        hideWindowFromTaskManager(this.mainWindow);
      }
    }, 1000);
  }

  private setupGlobalHotkeys() {
    // Register Ctrl+Shift+O to toggle overlay
    const toggleRegistered = globalShortcut.register('CommandOrControl+Shift+O', () => {
      console.log('[Hotkey] Toggle overlay');
      this.overlayManager.toggle();
    });

    if (toggleRegistered) {
      console.log('[Hotkey] Ctrl+Shift+O registered successfully');
    } else {
      console.warn('[Hotkey] Failed to register Ctrl+Shift+O');
    }

    // Register Ctrl+Shift+H to hide/show entire app
    const hideRegistered = globalShortcut.register('CommandOrControl+Shift+H', () => {
      console.log('[Hotkey] Toggle app visibility');
      this.toggleAppVisibility();
    });

    if (hideRegistered) {
      console.log('[Hotkey] Ctrl+Shift+H registered successfully');
    } else {
      console.warn('[Hotkey] Failed to register Ctrl+Shift+H');
    }

    // Register Ctrl+Shift+Q to quit app
    const quitRegistered = globalShortcut.register('CommandOrControl+Shift+Q', () => {
      console.log('[Hotkey] Quit app');
      this.quitApp();
    });

    if (quitRegistered) {
      console.log('[Hotkey] Ctrl+Shift+Q registered successfully');
    } else {
      console.warn('[Hotkey] Failed to register Ctrl+Shift+Q');
    }

    // Register Ctrl+Shift+S for screenshot + OCR
    const screenshotRegistered = globalShortcut.register('CommandOrControl+Shift+S', () => {
      console.log('[Hotkey] Screenshot + OCR');
      this.captureAndOCR();
    });

    if (screenshotRegistered) {
      console.log('[Hotkey] Ctrl+Shift+S registered successfully');
    } else {
      console.warn('[Hotkey] Failed to register Ctrl+Shift+S');
    }
  }

  private async captureAndOCR() {
    if (this.isCapturing) {
      console.log('[Screenshot] Already capturing, ignoring...');
      return;
    }

    this.isCapturing = true;

    try {
      // Show main window if hidden
      if (this.mainWindow && !this.mainWindow.isVisible()) {
        this.mainWindow.show();
        this.mainWindow.focus();
      }

      // Immediately show "Screenshot captured" notification (like document upload)
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('screenshot:captured');
      }

      // Notify renderer that we're processing
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('screenshot:processing', true);
      }

      // Capture full screen screenshot automatically
      console.log('[Screenshot] Capturing full screen screenshot...');
      const screenshotPath = await this.screenshotService.captureScreen({
        fullScreen: true
      });

      // Read image and convert to base64
      console.log('[Screenshot] Converting image to base64...');
      const imageBuffer = fs.readFileSync(screenshotPath);
      const base64Image = imageBuffer.toString('base64');
      const imageDataUrl = `data:image/png;base64,${base64Image}`;

      // Clean up screenshot file
      this.screenshotService.cleanup(screenshotPath);

      // Focus the input for user to write text
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.focus();
      }

      // Send image to renderer so user can add text and send
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('screenshot:image-ready', {
          imageDataUrl: imageDataUrl
        });
      }

      // Notify renderer that processing is complete
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('screenshot:processing', false);
      }

    } catch (error: any) {
      console.error('[Screenshot] Error during capture:', error);
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('screenshot:error', error.message || 'Failed to capture screenshot');
      }
    } finally {
      this.isCapturing = false;
    }
  }

  private toggleAppVisibility() {
    if (this.isAppHidden) {
      // Show the app
      this.showApp();
    } else {
      // Hide the app
      this.hideApp();
    }
  }

  private hideApp() {
    console.log('[App] Hiding entire app from screen');
    this.isAppHidden = true;

    // Hide main window
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.hide();
    }

    // Hide overlay
    if (this.overlayManager.isReady()) {
      this.overlayManager.hide();
    }

    // Hide settings window if open
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      this.settingsWindow.hide();
    }
  }

  private showApp() {
    console.log('[App] Showing app on screen');
    this.isAppHidden = false;

    // Show main window
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.show();
      this.mainWindow.focus();
    }

    // Note: Overlay is controlled separately via Ctrl+Shift+O
    // We don't automatically show it when showing the app
  }

  private quitApp() {
    console.log('[App] Quitting application');
    
    // Stop overlay process
    this.overlayManager.stop();

    // Close all windows
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.close();
    }

    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      this.settingsWindow.close();
    }

    // Quit the app
    app.quit();
  }

  private openSettings() {
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      this.settingsWindow.focus();
      return;
    }

    this.settingsWindow = new BrowserWindow({
      width: 600,
      height: 500,
      parent: this.mainWindow!,
      modal: true,
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
      title: 'Settings',
    });

    this.settingsWindow.loadFile(path.join(__dirname, '../renderer/settings.html'));

    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
    });
  }

  private async sendChatMessage(message: string | MessageContent[], history: Message[]): Promise<string> {
    const apiKey = store.get('apiKey');
    // Default to a free vision-capable model that works for both text and images
    // Using gpt-4o-mini as it's reliable and supports vision
    let model = store.get('model') || 'openai/gpt-4o-mini'; 

    if (!apiKey) {
      throw new Error('API key not configured. Please go to Settings and add your OpenRouter API key.');
    }

    // Determine if message contains images
    const hasImages = Array.isArray(message) && message.some(m => m.type === 'image_url');
    
    // If message contains images, ALWAYS force a known working vision-capable model
    // This is the most reliable approach - we don't trust user selection for images
    if (hasImages) {
      // Always use a guaranteed vision-capable model when images are present
      // Priority: gpt-4o-mini (reliable, affordable, confirmed to work)
      const originalModel = model;
      model = 'openai/gpt-4o-mini';
      
      if (originalModel !== model) {
        console.log(`[Chat] 📸 Image detected - forcing vision model switch:`);
        console.log(`[Chat]    Original: ${originalModel}`);
        console.log(`[Chat]    New: ${model}`);
      } else {
        console.log(`[Chat] 📸 Image detected - using vision model: ${model}`);
      }
    }
    
    // Extract text from message for document search
    let messageText = '';
    if (typeof message === 'string') {
      messageText = message;
    } else {
      // Extract text parts from message array
      messageText = message.filter(m => m.type === 'text').map(m => m.text || '').join(' ');
    }

    // Search for relevant document chunks (only if we have text)
    const relevantChunks = messageText ? this.documentService.findRelevantChunks(messageText, 5) : [];
    let userContent: string | MessageContent[] = message;

    // If we have relevant document context and no images, include it
    if (relevantChunks.length > 0 && !hasImages) {
      const contextText = relevantChunks
        .map((chunk, idx) => {
          const doc = this.documentService.getDocument(chunk.documentId);
          const docName = doc ? doc.name : 'Unknown';
          return `[Document ${idx + 1}: ${docName}]\n${chunk.content}`;
        })
        .join('\n\n---\n\n');
      
      userContent = `Context from uploaded documents:\n\n${contextText}\n\n---\n\nUser question: ${messageText}\n\nPlease answer the user's question based on the provided document context. If the context doesn't contain relevant information, answer based on your general knowledge.`;
    } else if (hasImages && messageText) {
      // If we have images and text, combine them
      userContent = [
        { type: 'text', text: messageText },
        ...(Array.isArray(message) ? message.filter(m => m.type === 'image_url') : [])
      ];
    } else if (hasImages && !messageText) {
      // If we only have images, add a default prompt
      userContent = Array.isArray(message) ? [
        { type: 'text', text: 'Please analyze this image and describe what you see.' },
        ...message.filter(m => m.type === 'image_url')
      ] : message;
    }

    // Log the model being used for debugging
    console.log(`[Chat] Using model: ${model}, hasImages: ${hasImages}`);
    if (hasImages) {
      console.log(`[Chat] Message content type: ${Array.isArray(userContent) ? 'array with images' : typeof userContent}`);
      if (Array.isArray(userContent)) {
        console.log(`[Chat] Content parts: ${userContent.map(c => c.type).join(', ')}`);
      }
    }

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: model,
          messages: [...history, { role: 'user', content: userContent }],
          max_tokens: 4096, // Limit tokens to stay within free tier
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/intraview',
            'X-Title': 'IntraView',
          },
          timeout: 120000, // 120 second timeout (images can take longer)
        }
      );

      if (!response.data || !response.data.choices || !response.data.choices[0]) {
        throw new Error('Invalid response format from AI service');
      }

      return response.data.choices[0].message.content;
    } catch (error: any) {
      console.error('OpenRouter API error:', error.response?.data || error.message);
      
      // Provide more detailed error messages
      if (error.response) {
        // API returned an error response
        const errorData = error.response.data;
        const errorMessage = errorData?.error?.message || '';
        
        // Check for vision/image-related errors
        if (hasImages && (errorMessage.toLowerCase().includes('image') || 
                          errorMessage.toLowerCase().includes('vision') || 
                          errorMessage.toLowerCase().includes('endpoint') ||
                          errorMessage.toLowerCase().includes('no endpoints'))) {
          // If we still get this error, it means our model detection failed
          // Force retry with a guaranteed vision model
          console.error(`[Chat] ❌ Vision error detected even after model switch. Error: ${errorMessage}`);
          console.log(`[Chat] 🔄 This should not happen - model was: ${model}`);
          throw new Error(`Vision model error: The model "${model}" doesn't support images. The app should have automatically switched to a vision-capable model. Please report this issue.`);
        }
        
        if (errorData?.error?.message) {
          throw new Error(errorData.error.message);
        }
        if (error.response.status === 401) {
          throw new Error('Invalid API key. Please check your OpenRouter API key in Settings.');
        }
        if (error.response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (error.response.status >= 500) {
          throw new Error('AI service is temporarily unavailable. Please try again later.');
        }
        throw new Error(`API error (${error.response.status}): ${errorData?.error?.type || 'Unknown error'}`);
      } else if (error.request) {
        // Request was made but no response received
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          throw new Error('Request timed out. The AI service may be slow or your internet connection is unstable. Please try again.');
        }
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          throw new Error('Cannot connect to AI service. Please check your internet connection.');
        }
        throw new Error('No response from AI service. Please check your internet connection and try again. If the problem persists, the service may be temporarily unavailable.');
      } else {
        // Error setting up the request
        throw new Error(`Failed to send request: ${error.message}`);
      }
    }
  }

  private setupIPC() {
    // Set ignore mouse events handler
    ipcMain.handle('set-ignore-mouse-events', (_event, ignore: boolean) => {
      if (this.mainWindow) {
        this.mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
      }
    });

    // Overlay control handlers
    ipcMain.handle('overlay:toggle', () => {
      return this.overlayManager.toggle();
    });

    ipcMain.handle('overlay:show', () => {
      return this.overlayManager.show();
    });

    ipcMain.handle('overlay:hide', () => {
      return this.overlayManager.hide();
    });

    ipcMain.handle('overlay:update-text', (_event, text: string) => {
      return this.overlayManager.updateText(text);
    });

    ipcMain.handle('overlay:is-ready', () => {
      return this.overlayManager.isReady();
    });

    // Chat message handler
    ipcMain.handle('chat:send-message', async (_event, message: string | MessageContent[], history: Message[]) => {
      return await this.sendChatMessage(message, history);
    });

    // Settings handlers
    ipcMain.handle('settings:get', () => {
      return {
        apiKey: store.get('apiKey'),
        model: store.get('model') || 'openai/gpt-oss-20b:free',
      };
    });

    ipcMain.handle('settings:set', (_event, settings: AppSettings) => {
      if (settings.apiKey) {
        store.set('apiKey', settings.apiKey);
      }
      if (settings.model) {
        store.set('model', settings.model);
      }
    });

    // Window handlers
    ipcMain.handle('window:open-settings', () => {
      this.openSettings();
    });

    ipcMain.handle('window:close', () => {
      if (this.settingsWindow) {
        this.settingsWindow.close();
      }
    });

    // Document handlers
    ipcMain.handle('document:upload', async (_event) => {
      if (!this.mainWindow) {
        throw new Error('Main window not available');
      }

      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openFile'],
        filters: [
          { name: 'Documents', extensions: ['pdf', 'docx', 'doc', 'txt', 'md'] },
          { name: 'PDF', extensions: ['pdf'] },
          { name: 'Word', extensions: ['docx', 'doc'] },
          { name: 'Text', extensions: ['txt', 'md'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      const filePath = result.filePaths[0];

      try {
        return await this.processDocumentUpload(filePath);
      } catch (error: any) {
        throw new Error(`Failed to upload document: ${error.message}`);
      }
    });

    ipcMain.handle('document:ingest', async (_event, filePath: string) => {
      try {
        if (!filePath || typeof filePath !== 'string') {
          throw new Error('Invalid file path received');
        }

        if (!fs.existsSync(filePath)) {
          throw new Error('File not found');
        }

        const stats = fs.statSync(filePath);
        if (!stats.isFile()) {
          throw new Error('Only files can be uploaded');
        }

        return await this.processDocumentUpload(filePath);
      } catch (error: any) {
        throw new Error(`Failed to ingest document: ${error.message}`);
      }
    });

    ipcMain.handle('document:list', () => {
      const documents = this.documentService.getAllDocuments();
      return documents.map(doc => ({
        id: doc.id,
        name: doc.name,
        uploadedAt: new Date(doc.uploadedAt).toISOString(),
        chunkCount: doc.chunks.length,
        fileType: doc.fileType,
      }));
    });

    ipcMain.handle('document:delete', (_event, documentId: string) => {
      return this.documentService.removeDocument(documentId);
    });

    ipcMain.handle('document:clear', () => {
      this.documentService.clearAllDocuments();
      return true;
    });
  }

  private async processDocumentUpload(filePath: string) {
    const document = await this.documentService.addDocument(filePath);
    return this.formatDocumentResponse(document);
  }

  private formatDocumentResponse(document: Document) {
    return {
      id: document.id,
      name: document.name,
      uploadedAt: new Date(document.uploadedAt).toISOString(),
      chunkCount: document.chunks.length,
      fileType: document.fileType,
    };
  }
}

// Create app instance
const chatApp = new ChatApp();

// App lifecycle
app.on('ready', () => {
  chatApp.initialize();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // Unregister all global shortcuts before quitting
  globalShortcut.unregisterAll();
  console.log('[App] Unregistered all global shortcuts');
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    chatApp.initialize();
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}
