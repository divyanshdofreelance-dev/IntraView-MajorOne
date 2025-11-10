import { contextBridge, ipcRenderer } from 'electron';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  chat: {
    sendMessage: (message: string, history: Message[]) => 
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
});
