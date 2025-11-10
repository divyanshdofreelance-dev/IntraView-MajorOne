interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ElectronAPI {
  chat: {
    sendMessage: (message: string, history: Message[]) => Promise<string>;
  };
  settings: {
    get: () => Promise<{ apiKey?: string; model?: string }>;
    set: (settings: { apiKey?: string; model?: string }) => Promise<void>;
  };
  window: {
    openSettings: () => Promise<void>;
    close: () => Promise<void>;
    setIgnoreMouseEvents: (ignore: boolean) => Promise<void>;
  };
  overlay: {
    toggle: () => Promise<void>;
    show: () => Promise<void>;
    hide: () => Promise<void>;
    updateText: (text: string) => Promise<void>;
    isReady: () => Promise<boolean>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
