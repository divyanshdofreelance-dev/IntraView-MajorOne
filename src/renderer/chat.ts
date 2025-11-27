// Make this a module to avoid global scope pollution
export {};

// Access the Electron API exposed by preload
declare const electronAPI: any;
declare const marked: any;

// Type definitions for messages
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

const SUPPORTED_FILE_EXTENSIONS = ['pdf', 'docx', 'doc', 'txt', 'md'];

let conversationHistory: Message[] = [];
let currentScreenshotImage: string | null = null; // Store current screenshot image data URL

// DOM Elements - will be initialized after DOM loads
let messagesContainer: HTMLDivElement;
let messageInput: HTMLTextAreaElement;
let sendBtn: HTMLButtonElement;
let voiceBtn: HTMLButtonElement;
let voiceIcon: HTMLSpanElement;
let uploadBtn: HTMLButtonElement;
let documentsPanel: HTMLDivElement;
let documentsList: HTMLDivElement;
let closeDocsBtn: HTMLButtonElement;
let clearDocsBtn: HTMLButtonElement;
let documentsToggleBtn: HTMLButtonElement;
let dropOverlay: HTMLDivElement;

// Speech recognition
let recognition: any = null;
let isListening = false;

// Initialize
function initialize() {
  console.log('[Chat] Initializing...');
  
  // Get DOM elements after page loads
  messagesContainer = document.getElementById('messages-container') as HTMLDivElement;
  messageInput = document.getElementById('message-input') as HTMLTextAreaElement;
  sendBtn = document.getElementById('btn-send') as HTMLButtonElement;
  voiceBtn = document.getElementById('btn-voice') as HTMLButtonElement;
  voiceIcon = document.getElementById('voice-icon') as HTMLSpanElement;
  uploadBtn = document.getElementById('btn-upload') as HTMLButtonElement;
  documentsToggleBtn = document.getElementById('btn-documents') as HTMLButtonElement;
  documentsPanel = document.getElementById('documents-panel') as HTMLDivElement;
  documentsList = document.getElementById('documents-list') as HTMLDivElement;
  closeDocsBtn = document.getElementById('btn-close-docs') as HTMLButtonElement;
  clearDocsBtn = document.getElementById('btn-clear-docs') as HTMLButtonElement;
  dropOverlay = document.getElementById('drop-overlay') as HTMLDivElement;
  
  console.log('[Chat] DOM elements found:', {
    messagesContainer: !!messagesContainer,
    messageInput: !!messageInput,
    sendBtn: !!sendBtn,
    voiceBtn: !!voiceBtn,
  });
  
  // Initialize speech recognition
  initializeSpeechRecognition();
  
  setupEventListeners();
  loadDocuments();
  messageInput.focus();
  console.log('[Chat] Initialization complete');
}

function setupEventListeners() {
  console.log('[Chat] Setting up event listeners...');
  
  // Track mouse position globally to enable click-through on transparent areas
  document.body.addEventListener('mousemove', (e: any) => {
    const target = e.target as HTMLElement;
    // Check if mouse is over an interactive element (including voice button)
    const isOverInteractive = target.closest('.chat-header, .messages-container, .message, .input-container, .send-btn, .voice-btn, #message-input, .icon-btn, .header-buttons, #btn-voice, #voice-icon');
    
    if (isOverInteractive) {
      window.electronAPI.window.setIgnoreMouseEvents(false);
    } else {
      window.electronAPI.window.setIgnoreMouseEvents(true);
    }
  });

  // Settings button click
  const settingsBtn = document.getElementById('btn-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      console.log('[Chat] Settings button clicked!');
      electronAPI.window.openSettings();
    });
  }
  
  // Send button click
  sendBtn.addEventListener('click', () => {
    console.log('[Chat] Send button clicked!');
    handleSendMessage();
  });
  
  // Voice button click
  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => {
      console.log('[Chat] 🎤 Voice button clicked!');
      toggleVoiceRecognition();
    });
    console.log('[Chat] Voice button listener attached');
  } else {
    console.error('[Chat] ❌ Voice button not found!');
  }
  
  // Enter key to send (Shift+Enter for new line)
  messageInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      console.log('[Chat] Enter key pressed!');
      handleSendMessage();
    }
  });

  // ESC key to close panels/windows
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Close documents panel if open
      if (documentsPanel && documentsPanel.style.display !== 'none') {
        documentsPanel.style.display = 'none';
        e.preventDefault();
      }
    }
  });
  
  // Auto-resize textarea
  messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = messageInput.scrollHeight + 'px';
  });

  // Document upload button
  if (uploadBtn) {
    uploadBtn.addEventListener('click', handleUploadDocument);
  }

  // Documents panel controls
  if (closeDocsBtn) {
    closeDocsBtn.addEventListener('click', () => {
      documentsPanel.style.display = 'none';
    });
  }

  if (documentsToggleBtn) {
    documentsToggleBtn.addEventListener('click', toggleDocumentsPanel);
  }

  if (clearDocsBtn) {
    clearDocsBtn.addEventListener('click', handleClearDocuments);
  }

  setupDragAndDrop();

  // Listen for screenshot events
  if (window.electronAPI?.screenshot) {
    // Handle screenshot captured notification (shown immediately after selection)
    window.electronAPI.screenshot.onCaptured?.(() => {
      console.log('[Chat] Screenshot captured');
      addMessage('system', '📸 Screenshot captured! You can now write text about it.');
      messageInput.focus();
    });

    // Handle image ready from screenshot
    window.electronAPI.screenshot.onImageReady?.((data: { imageDataUrl: string }) => {
      console.log('[Chat] Screenshot image ready');
      currentScreenshotImage = data.imageDataUrl;
      addMessage('system', '🖼️ Image ready! Type your question and press Send to analyze the image.');
      messageInput.focus();
    });

    // Handle extracted text from screenshot OCR (kept for backward compatibility)
    window.electronAPI.screenshot.onTextExtracted?.((data: any) => {
      console.log('[Chat] Screenshot text extracted:', data);
      
      // Pre-fill the input with extracted text (user can edit or write their own)
      if (data.text && data.text.trim().length > 0) {
        const extractedText = data.text.trim();
        // If input is empty, pre-fill it; otherwise append
        if (!messageInput.value.trim()) {
          messageInput.value = extractedText;
        } else {
          // If user already started typing, append on new line
          messageInput.value += '\n\n' + extractedText;
        }
        messageInput.style.height = 'auto';
        messageInput.style.height = messageInput.scrollHeight + 'px';
        
        // Show additional info about extracted text
        if (data.confidence) {
          addMessage('system', `📝 Extracted ${extractedText.length} characters from screenshot (${Math.round(data.confidence)}% confidence). You can edit the text above or write your own.`);
        }
        
        // Focus the input
        messageInput.focus();
      }
    });

    // Handle screenshot errors
    window.electronAPI.screenshot.onError?.((error: string) => {
      console.error('[Chat] Screenshot error:', error);
      addMessage('error', `Screenshot error: ${error}`);
    });

    // Handle processing state (OCR in progress)
    window.electronAPI.screenshot.onProcessing?.((isProcessing: boolean) => {
      // OCR processing happens after "Screenshot captured" message
      // We don't need to show another message here
    });
  }

  console.log('[Chat] Event listeners set up successfully');
}

async function handleSendMessage() {
  console.log('[Chat] handleSendMessage called');
  const message = messageInput.value.trim();
  console.log('[Chat] Message:', message);
  
  // Check if we have both message and image, or at least one
  if (!message && !currentScreenshotImage) {
    console.log('[Chat] Empty message and no image, returning');
    return;
  }
  
  // Disable input while processing
  messageInput.disabled = true;
  sendBtn.disabled = true;
  
  // Prepare message content (text + image if available)
  let messageContent: string | MessageContent[];
  
  if (currentScreenshotImage) {
    // Include image in message
    const contentParts: MessageContent[] = [];
    if (message) {
      contentParts.push({ type: 'text', text: message });
    } else {
      contentParts.push({ type: 'text', text: 'Please analyze this image.' });
    }
    contentParts.push({
      type: 'image_url',
      image_url: { url: currentScreenshotImage }
    });
    messageContent = contentParts;
    
    // Add user message to UI (show image indicator)
    addMessage('user', message || '📸 [Image attached]');
  } else {
    // Text only
    messageContent = message;
    addMessage('user', message);
  }
  
  // Clear input and reset screenshot
  messageInput.value = '';
  messageInput.style.height = 'auto';
  currentScreenshotImage = null;
  
  // Add user message to history
  conversationHistory.push({ role: 'user', content: messageContent });
  
  // Show typing indicator
  const typingId = showTypingIndicator();
  
  try {
    // Send to AI
    const response = await electronAPI.chat.sendMessage(messageContent, conversationHistory);
    
    // Remove typing indicator
    removeTypingIndicator(typingId);
    
    // Add assistant response
    addMessage('assistant', response);
    
    // Add to history
    conversationHistory.push({ role: 'assistant', content: response });
    
    // Send to C++ overlay (invisible to screen capture)
    try {
      await window.electronAPI.overlay.updateText(response);
      console.log('[Chat] Sent response to overlay');
    } catch (err) {
      console.warn('[Chat] Failed to update overlay:', err);
    }
    
  } catch (error: any) {
    // Remove typing indicator
    removeTypingIndicator(typingId);
    
    // Show error
    addMessage('error', `Error: ${error.message || 'Failed to get response from AI'}`);
  } finally {
    // Re-enable input
    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.focus();
  }
}

function addMessage(role: 'user' | 'assistant' | 'system' | 'error', content: string) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  // Render markdown for assistant messages
  if (role === 'assistant') {
    contentDiv.innerHTML = marked.parse(content);
  } else {
    contentDiv.textContent = content;
  }
  
  messageDiv.appendChild(contentDiv);
  
  // Add copy button for assistant messages
  if (role === 'assistant') {
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.innerHTML = '📋';
    copyBtn.title = 'Copy message';
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(content);
      copyBtn.innerHTML = '✓';
      setTimeout(() => {
        copyBtn.innerHTML = '📋';
      }, 2000);
    };
    messageDiv.appendChild(copyBtn);
  }
  
  messagesContainer.appendChild(messageDiv);
  
  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showTypingIndicator(): string {
  const id = `typing-${Date.now()}`;
  const typingDiv = document.createElement('div');
  typingDiv.id = id;
  typingDiv.className = 'message assistant';
  typingDiv.innerHTML = `
    <div class="message-content typing-indicator">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;
  
  messagesContainer.appendChild(typingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
  return id;
}

function removeTypingIndicator(id: string) {
  const element = document.getElementById(id);
  if (element) {
    element.remove();
  }
}

// Speech Recognition Functions
function initializeSpeechRecognition() {
  console.log('[Voice] Initializing speech recognition...');
  
  try {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    console.log('[Voice] SpeechRecognition available:', !!SpeechRecognition);
    
    if (!SpeechRecognition) {
      console.warn('[Voice] Speech recognition not supported in this browser');
      if (voiceBtn) {
        voiceBtn.disabled = true;
        voiceBtn.title = 'Voice input not supported in your browser';
        voiceBtn.style.opacity = '0.5';
      }
      return;
    }
    
    recognition = new SpeechRecognition();
    recognition.continuous = true;  // Keep listening until manually stopped
    recognition.interimResults = true;  // Show interim results as you speak
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      console.log('[Voice] ✅ Recognition started successfully');
      isListening = true;
      voiceBtn.classList.add('listening');
      voiceIcon.textContent = '⏹️';
      voiceBtn.title = 'Stop listening';
    };
    
    recognition.onend = () => {
      console.log('[Voice] ⚠️ Recognition ended, isListening:', isListening);
      
      // If we're still supposed to be listening, restart recognition
      // This handles automatic stops from silence detection
      if (isListening) {
        console.log('[Voice] 🔄 Auto-restarting recognition...');
        try {
          recognition.start();
        } catch (error) {
          console.error('[Voice] ❌ Failed to restart:', error);
          isListening = false;
          voiceBtn.classList.remove('listening');
          voiceIcon.textContent = '🎤';
          voiceBtn.title = 'Voice Input (Click to speak)';
        }
      } else {
        // User manually stopped, update UI
        console.log('[Voice] 🛑 User manually stopped');
        voiceBtn.classList.remove('listening');
        voiceIcon.textContent = '🎤';
        voiceBtn.title = 'Voice Input (Click to speak)';
      }
    };
    
    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      // Process all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      
      console.log('[Voice] Interim:', interimTranscript);
      console.log('[Voice] Final:', finalTranscript);
      
      // Only add final results to input
      if (finalTranscript) {
        // Add to input
        if (messageInput.value) {
          messageInput.value += ' ' + finalTranscript.trim();
        } else {
          messageInput.value = finalTranscript.trim();
        }
        
        // Auto-resize textarea
        messageInput.style.height = 'auto';
        messageInput.style.height = messageInput.scrollHeight + 'px';
        
        // Focus input
        messageInput.focus();
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('[Voice] Recognition error:', event.error);
      isListening = false;
      voiceBtn.classList.remove('listening');
      voiceIcon.textContent = '🎤';
      
      if (event.error === 'no-speech') {
        console.log('[Voice] No speech detected');
      } else if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone access in your browser settings.');
      }
    };
    
    console.log('[Voice] Speech recognition initialized');
  } catch (error) {
    console.error('[Voice] Failed to initialize speech recognition:', error);
    voiceBtn.disabled = true;
  }
}

function toggleVoiceRecognition() {
  console.log('[Voice] Toggle called, recognition exists:', !!recognition, 'isListening:', isListening);
  
  if (!recognition) {
    alert('Voice input not available in your browser');
    return;
  }
  
  if (isListening) {
    console.log('[Voice] User stopping recognition');
    isListening = false;  // Set flag BEFORE stopping so onend knows it was manual
    recognition.stop();
  } else {
    console.log('[Voice] User starting recognition, attempting to start...');
    isListening = true;  // Set flag before starting
    try {
      recognition.start();
      console.log('[Voice] recognition.start() called successfully');
    } catch (error) {
      console.error('[Voice] Failed to start recognition:', error);
      console.error('[Voice] Error details:', JSON.stringify(error, null, 2));
      isListening = false;
      // If already running, just continue
      if ((error as any).message && (error as any).message.includes('already started')) {
        console.log('[Voice] Recognition already running');
        isListening = true;
      }
    }
  }
}

// Document handling functions
function toggleDocumentsPanel() {
  if (!documentsPanel) {
    return;
  }

  const shouldShow = documentsPanel.style.display === 'none' || documentsPanel.style.display === '';
  documentsPanel.style.display = shouldShow ? 'block' : 'none';

  if (shouldShow) {
    loadDocuments();
  }
}

async function handleUploadDocument() {
  try {
    const document = await electronAPI.documents.upload();
    if (document) {
      addMessage('system', `Document "${document.name}" uploaded successfully! (${document.chunkCount} chunks)`);
      if (documentsPanel) {
        documentsPanel.style.display = 'block';
      }
      await loadDocuments();
    }
  } catch (error: any) {
    addMessage('error', `Failed to upload document: ${error.message}`);
  }
}

async function loadDocuments() {
  try {
    const documents = await electronAPI.documents.list();
    if (documentsList) {
      documentsList.innerHTML = '';
      
      if (documents.length === 0) {
        documentsList.innerHTML = '<div class="no-documents">No documents uploaded</div>';
        return;
      }

      documents.forEach((doc: any) => {
        const docItem = document.createElement('div');
        docItem.className = 'document-item';
        docItem.innerHTML = `
          <div class="document-info">
            <span class="document-name">${doc.name}</span>
            <span class="document-meta">${doc.chunkCount} chunks • ${new Date(doc.uploadedAt).toLocaleDateString()}</span>
          </div>
          <button class="delete-doc-btn" data-id="${doc.id}" title="Delete document">🗑️</button>
        `;
        
        const deleteBtn = docItem.querySelector('.delete-doc-btn');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', async () => {
            try {
              await electronAPI.documents.delete(doc.id);
              addMessage('system', `Document "${doc.name}" deleted`);
              await loadDocuments();
            } catch (error: any) {
              addMessage('error', `Failed to delete document: ${error.message}`);
            }
          });
        }
        
        documentsList.appendChild(docItem);
      });
    }
  } catch (error: any) {
    console.error('Failed to load documents:', error);
  }
}

async function handleClearDocuments() {
  if (confirm('Are you sure you want to clear all uploaded documents?')) {
    try {
      await electronAPI.documents.clear();
      addMessage('system', 'All documents cleared');
      await loadDocuments();
    } catch (error: any) {
      addMessage('error', `Failed to clear documents: ${error.message}`);
    }
  }
}

function setupDragAndDrop() {
  if (!dropOverlay) {
    return;
  }

  let dragCounter = 0;

  const showOverlay = () => dropOverlay.classList.add('visible');
  const hideOverlay = () => {
    dragCounter = 0;
    dropOverlay.classList.remove('visible');
  };

  document.addEventListener('dragenter', (event: DragEvent) => {
    if (!event.dataTransfer) {
      return;
    }
    event.preventDefault();
    dragCounter += 1;
    if (shouldAcceptDrag(event.dataTransfer)) {
      showOverlay();
    }
  });

  document.addEventListener('dragover', (event: DragEvent) => {
    if (!event.dataTransfer) {
      return;
    }

    event.preventDefault();

    if (!shouldAcceptDrag(event.dataTransfer)) {
      event.dataTransfer.dropEffect = 'none';
      hideOverlay();
      return;
    }

    event.dataTransfer.dropEffect = 'copy';
    showOverlay();
  });

  document.addEventListener('dragleave', (event: DragEvent) => {
    if (!event.dataTransfer) {
      return;
    }
    event.preventDefault();
    dragCounter = Math.max(dragCounter - 1, 0);
    if (dragCounter === 0) {
      hideOverlay();
    }
  });

  document.addEventListener('drop', async (event: DragEvent) => {
    event.preventDefault();
    hideOverlay();

    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length === 0) {
      return;
    }

    const supportedFiles = files.filter(file => isSupportedDocument(file.name) && fileHasPath(file));
    if (supportedFiles.length === 0) {
      addMessage('error', 'Only PDF, Word, Markdown, or Text files are supported.');
      return;
    }

    let successCount = 0;
    for (const file of supportedFiles) {
      const filePath = (file as any).path as string;
      try {
        const document = await electronAPI.documents.ingest(filePath);
        if (document) {
          successCount += 1;
          addMessage('system', `Document "${document.name}" uploaded successfully! (${document.chunkCount} chunks)`);
        }
      } catch (error: any) {
        addMessage('error', `Failed to upload ${file.name}: ${error.message}`);
      }
    }

    if (successCount > 0 && documentsPanel) {
      documentsPanel.style.display = 'block';
      await loadDocuments();
    }
  });
}

function shouldAcceptDrag(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) {
    return false;
  }

  if (dataTransfer.files && dataTransfer.files.length > 0) {
    return Array.from(dataTransfer.files).some(file => isSupportedDocument(file.name));
  }

  if (dataTransfer.types) {
    return Array.from(dataTransfer.types).includes('Files');
  }

  return false;
}

function fileHasPath(file: File): boolean {
  return Boolean((file as any).path);
}

function isSupportedDocument(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  return SUPPORTED_FILE_EXTENSIONS.includes(ext);
}

function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  if (parts.length <= 1) {
    return '';
  }
  return parts.pop()!.toLowerCase();
}

document.addEventListener('DOMContentLoaded', initialize);
