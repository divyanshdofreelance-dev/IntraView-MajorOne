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

interface DocumentSummary {
  id: string;
  name: string;
  uploadedAt: string;
  chunkCount: number;
  fileType: string;
}

interface ElectronAPI {
  chat: {
    sendMessage: (message: string | MessageContent[], history: Message[]) => Promise<string>;
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
  documents: {
    upload: () => Promise<DocumentSummary | null>;
    ingest: (filePath: string) => Promise<DocumentSummary>;
    list: () => Promise<DocumentSummary[]>;
    delete: (documentId: string) => Promise<boolean>;
    clear: () => Promise<boolean>;
  };
  screenshot: {
    onCaptured: (callback: () => void) => void;
    onImageReady: (callback: (data: { imageDataUrl: string }) => void) => void;
    onTextExtracted: (callback: (data: { text: string; confidence?: number }) => void) => void;
    onError: (callback: (error: string) => void) => void;
    onProcessing: (callback: (isProcessing: boolean) => void) => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
