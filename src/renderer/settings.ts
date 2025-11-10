// Make this a module
export {};

// Access the Electron API
declare const electronAPI: any;

// DOM Elements
const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
const modelSelect = document.getElementById('model') as HTMLSelectElement;
const saveBtn = document.getElementById('btn-save') as HTMLButtonElement;
const cancelBtn = document.getElementById('btn-cancel') as HTMLButtonElement;

// Initialize
async function initialize() {
  await loadSettings();
  setupEventListeners();
}

function setupEventListeners() {
  saveBtn.addEventListener('click', saveSettings);
  cancelBtn.addEventListener('click', () => {
    electronAPI.window.close();
  });
}

async function loadSettings() {
  try {
    const settings = await electronAPI.settings.get();
    
    if (settings.apiKey) {
      apiKeyInput.value = settings.apiKey;
    }
    if (settings.model) {
      modelSelect.value = settings.model;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

async function saveSettings() {
  const settings = {
    apiKey: apiKeyInput.value.trim(),
    model: modelSelect.value,
  };
  
  if (!settings.apiKey) {
    alert('Please enter your OpenRouter API key');
    return;
  }
  
  try {
    await electronAPI.settings.set(settings);
    alert('Settings saved successfully!');
    electronAPI.window.close();
  } catch (error) {
    console.error('Failed to save settings:', error);
    alert('Failed to save settings. Please try again.');
  }
}

// Start the app
document.addEventListener('DOMContentLoaded', initialize);
