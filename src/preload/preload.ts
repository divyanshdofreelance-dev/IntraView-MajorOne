import { contextBridge, ipcRenderer } from 'electron';

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

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  chat: {
    sendMessage: (message: string | MessageContent[], history: Message[]) => 
      ipcRenderer.invoke('chat:send-message', message, history),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (settings: any) => ipcRenderer.invoke('settings:set', settings),
  },
  window: {
    openSettings: () => ipcRenderer.invoke('window:open-settings'),
    close: () => ipcRenderer.invoke('window:close'),
    setIgnoreMouseEvents: (ignore: boolean) => ipcRenderer.invoke('set-ignore-mouse-events', ignore),
  },
  overlay: {
    toggle: () => ipcRenderer.invoke('overlay:toggle'),
    show: () => ipcRenderer.invoke('overlay:show'),
    hide: () => ipcRenderer.invoke('overlay:hide'),
    updateText: (text: string) => ipcRenderer.invoke('overlay:update-text', text),
    isReady: () => ipcRenderer.invoke('overlay:is-ready'),
  },
  documents: {
    upload: () => ipcRenderer.invoke('document:upload'),
    list: () => ipcRenderer.invoke('document:list'),
    delete: (documentId: string) => ipcRenderer.invoke('document:delete', documentId),
    clear: () => ipcRenderer.invoke('document:clear'),
    ingest: (filePath: string) => ipcRenderer.invoke('document:ingest', filePath),
  },
  screenshot: {
    onCaptured: (callback: () => void) => {
      ipcRenderer.on('screenshot:captured', () => callback());
    },
    onImageReady: (callback: (data: { imageDataUrl: string }) => void) => {
      ipcRenderer.on('screenshot:image-ready', (_event, data) => callback(data));
    },
    onTextExtracted: (callback: (data: any) => void) => {
      ipcRenderer.on('screenshot:text-extracted', (_event, data) => callback(data));
    },
    onError: (callback: (error: string) => void) => {
      ipcRenderer.on('screenshot:error', (_event, error) => callback(error));
    },
    onProcessing: (callback: (isProcessing: boolean) => void) => {
      ipcRenderer.on('screenshot:processing', (_event, isProcessing) => callback(isProcessing));
    },
  },
});
