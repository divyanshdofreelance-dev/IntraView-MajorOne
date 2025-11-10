import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import * as path from 'path';
import axios from 'axios';
import Store from 'electron-store';
import { OverlayManager } from './overlay-manager';
import { excludeWindowFromCapture } from './window-capture-exclusion';

interface AppSettings {
  apiKey?: string;
  model?: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const store = new Store<AppSettings>();

class ChatApp {
  private mainWindow: BrowserWindow | null = null;
  private settingsWindow: BrowserWindow | null = null;
  private overlayManager: OverlayManager;

  constructor() {
    this.overlayManager = new OverlayManager();
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
    
    // Set window to be excluded from screen capture on Windows
    this.mainWindow.webContents.on('did-finish-load', () => {
      this.setWindowCaptureExclusion();
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

  private async sendChatMessage(message: string, history: Message[]): Promise<string> {
    const settings = store.get('apiKey');
    const model = 'meta-llama/llama-3.2-3b-instruct:free';

    if (!settings) {
      throw new Error('API key not configured. Please go to Settings and add your OpenRouter API key.');
    }

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: model,
          messages: [...history, { role: 'user', content: message }],
        },
        {
          headers: {
            'Authorization': `Bearer ${settings}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/your-app', // Optional
            'X-Title': 'AI Chat App', // Optional
          },
        }
      );

      return response.data.choices[0].message.content;
    } catch (error: any) {
      console.error('OpenRouter API error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Failed to get response from AI');
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
    ipcMain.handle('chat:send-message', async (_event, message: string, history: Message[]) => {
      return await this.sendChatMessage(message, history);
    });

    // Settings handlers
    ipcMain.handle('settings:get', () => {
      return {
        apiKey: store.get('apiKey'),
        model: 'openai/gpt-oss-20b:free',
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
