// Make this a module to avoid global scope pollution
export {};

// Access the Electron API exposed by preload
declare const electronAPI: any;
declare const marked: any;

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

let conversationHistory: Message[] = [];

// DOM Elements - will be initialized after DOM loads
let messagesContainer: HTMLDivElement;
let messageInput: HTMLTextAreaElement;
let sendBtn: HTMLButtonElement;
let voiceBtn: HTMLButtonElement;
let voiceIcon: HTMLSpanElement;

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
  
  console.log('[Chat] DOM elements found:', {
    messagesContainer: !!messagesContainer,
    messageInput: !!messageInput,
    sendBtn: !!sendBtn,
    voiceBtn: !!voiceBtn,
  });
  
  // Initialize speech recognition
  initializeSpeechRecognition();
  
  setupEventListeners();
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
  
  // Auto-resize textarea
  messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = messageInput.scrollHeight + 'px';
  });
  
  console.log('[Chat] Event listeners set up successfully');
}

async function handleSendMessage() {
  console.log('[Chat] handleSendMessage called');
  const message = messageInput.value.trim();
  console.log('[Chat] Message:', message);
  
  if (!message) {
    console.log('[Chat] Empty message, returning');
    return;
  }
  
  // Disable input while processing
  messageInput.disabled = true;
  sendBtn.disabled = true;
  
  // Add user message to UI
  addMessage('user', message);
  
  // Clear input
  messageInput.value = '';
  messageInput.style.height = 'auto';
  
  // Add user message to history
  conversationHistory.push({ role: 'user', content: message });
  
  // Show typing indicator
  const typingId = showTypingIndicator();
  
  try {
    // Send to AI
    const response = await electronAPI.chat.sendMessage(message, conversationHistory);
    
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

document.addEventListener('DOMContentLoaded', initialize);
