// Options page logic for Chromium History Chat Extension

// DOM elements
let apiKeyInput;
let apiKeyStatus;
let saveApiKeyButton;
let clearApiKeyButton;
let toggleVisibilityButton;
let historyRangeInput;
let maxResultsInput;
let savePreferencesButton;
let preferencesStatus;
let clearChatButton;
let clearChatStatus;

// Initialize options page
document.addEventListener('DOMContentLoaded', async () => {
  // Get DOM elements
  apiKeyInput = document.getElementById('api-key-input');
  apiKeyStatus = document.getElementById('api-key-status');
  saveApiKeyButton = document.getElementById('save-api-key-button');
  clearApiKeyButton = document.getElementById('clear-api-key-button');
  toggleVisibilityButton = document.getElementById('toggle-visibility-button');
  historyRangeInput = document.getElementById('history-range');
  maxResultsInput = document.getElementById('max-results');
  savePreferencesButton = document.getElementById('save-preferences-button');
  preferencesStatus = document.getElementById('preferences-status');
  clearChatButton = document.getElementById('clear-chat-button');
  clearChatStatus = document.getElementById('clear-chat-status');

  // Set up event listeners
  saveApiKeyButton.addEventListener('click', handleSaveApiKey);
  clearApiKeyButton.addEventListener('click', handleClearApiKey);
  toggleVisibilityButton.addEventListener('click', handleToggleVisibility);
  savePreferencesButton.addEventListener('click', handleSavePreferences);
  clearChatButton.addEventListener('click', handleClearChatHistory);

  // Load current settings
  await loadSettings();
  
  // Load extension version from manifest
  await loadExtensionVersion();
});

// Load extension version from manifest
async function loadExtensionVersion() {
  try {
    const manifest = chrome.runtime.getManifest();
    const versionElement = document.getElementById('extension-version');
    if (versionElement && manifest.version) {
      versionElement.textContent = manifest.version;
    }
  } catch (error) {
    console.error('Error loading extension version:', error);
    const versionElement = document.getElementById('extension-version');
    if (versionElement) {
      versionElement.textContent = 'unknown';
    }
  }
}

// Load current settings
async function loadSettings() {
  try {
    // Load API key
    const apiKeyResult = await chrome.storage.local.get(['openai_api_key']);
    if (apiKeyResult.openai_api_key) {
      apiKeyInput.dataset.actualValue = apiKeyResult.openai_api_key;
      apiKeyInput.value = maskApiKey(apiKeyResult.openai_api_key);
      showStatus(apiKeyStatus, 'API key is configured (Direct OpenAI mode)', 'success');
    } else {
      showStatus(apiKeyStatus, 'No API key set (using Backend mode)', 'info');
    }

    // Load preferences
    const preferencesResult = await chrome.storage.local.get(['user_preferences']);
    if (preferencesResult.user_preferences) {
      const prefs = preferencesResult.user_preferences;
      historyRangeInput.value = prefs.historyRangeDays || 5000; // Default to 5000 days
      maxResultsInput.value = prefs.maxResults || 100000; // Default to 100,000 for maximum history
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus(apiKeyStatus, 'Error loading settings', 'error');
  }
}

// Handle save API key
async function handleSaveApiKey() {
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    showStatus(apiKeyStatus, 'Please enter an API key', 'error');
    return;
  }

  // If the input shows a masked value, use the actual value
  if (apiKeyInput.dataset.actualValue && apiKey === maskApiKey(apiKeyInput.dataset.actualValue)) {
    showStatus(apiKeyStatus, 'API key already saved (no changes)', 'info');
    return;
  }

  // Validate API key format
  if (!validateApiKey(apiKey)) {
    showStatus(apiKeyStatus, 'Invalid API key format. OpenAI API keys typically start with "sk-"', 'error');
    return;
  }

  try {
    // Save API key
    await chrome.storage.local.set({ openai_api_key: apiKey });
    apiKeyInput.dataset.actualValue = apiKey;
    apiKeyInput.value = maskApiKey(apiKey);
    showStatus(apiKeyStatus, 'API key saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving API key:', error);
    showStatus(apiKeyStatus, 'Error saving API key', 'error');
  }
}

// Handle clear API key
async function handleClearApiKey() {
  if (!confirm('Are you sure you want to clear your API key?')) {
    return;
  }

  try {
    await chrome.storage.local.remove(['openai_api_key']);
    apiKeyInput.value = '';
    delete apiKeyInput.dataset.actualValue;
    showStatus(apiKeyStatus, 'API key cleared', 'success');
  } catch (error) {
    console.error('Error clearing API key:', error);
    showStatus(apiKeyStatus, 'Error clearing API key', 'error');
  }
}

// Handle toggle visibility
function handleToggleVisibility() {
  const eyeIcon = toggleVisibilityButton.querySelector('svg');
  
  if (apiKeyInput.type === 'password') {
    // Show API key
    if (apiKeyInput.dataset.actualValue) {
      apiKeyInput.value = apiKeyInput.dataset.actualValue;
    }
    apiKeyInput.type = 'text';
    // Update icon to eye-off
    eyeIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
  } else {
    // Hide API key
    if (apiKeyInput.dataset.actualValue) {
      apiKeyInput.value = maskApiKey(apiKeyInput.dataset.actualValue);
    }
    apiKeyInput.type = 'password';
    // Update icon to eye
    eyeIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
  }
}

// Handle save preferences
async function handleSavePreferences() {
  const historyRangeDays = parseInt(historyRangeInput.value, 10);
  const maxResults = parseInt(maxResultsInput.value, 10);

  // Validate inputs
  if (isNaN(historyRangeDays) || historyRangeDays < 1 || historyRangeDays > 10000) {
    showStatus(preferencesStatus, 'History range must be between 1 and 10000 days', 'error');
    return;
  }

  if (isNaN(maxResults) || maxResults < 10 || maxResults > 100000) {
    showStatus(preferencesStatus, 'Max results must be between 10 and 100000', 'error');
    return;
  }

  // Warn user if they set a low maxResults
  if (maxResults < 100) {
    showStatus(preferencesStatus, `Warning: ${maxResults} results may be too few for good context. Consider 1000-10000 for better results.`, 'info');
  }

  try {
    const preferences = {
      historyRangeDays,
      maxResults
    };

    await chrome.storage.local.set({ user_preferences: preferences });
    showStatus(preferencesStatus, 'Preferences saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving preferences:', error);
    showStatus(preferencesStatus, 'Error saving preferences', 'error');
  }
}

// Handle clear chat history
async function handleClearChatHistory() {
  if (!confirm('Are you sure you want to clear your chat history? This cannot be undone.')) {
    return;
  }

  try {
    await chrome.storage.local.remove(['chat_history']);
    showStatus(clearChatStatus, 'Chat history cleared successfully!', 'success');
  } catch (error) {
    console.error('Error clearing chat history:', error);
    showStatus(clearChatStatus, 'Error clearing chat history', 'error');
  }
}

// Show status message
function showStatus(element, message, type) {
  element.textContent = message;
  element.className = `status-message ${type}`;
  element.style.display = 'block';

  // Auto-hide after 5 seconds
  setTimeout(() => {
    element.style.display = 'none';
  }, 5000);
}

// Validate API key format
function validateApiKey(apiKey) {
  if (!apiKey || apiKey.length < 20) {
    return false;
  }

  // OpenAI API keys typically start with 'sk-'
  return apiKey.startsWith('sk-');
}

// Mask API key for display
function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 8) {
    return '***';
  }

  const firstPart = apiKey.substring(0, 7);
  const lastPart = apiKey.substring(apiKey.length - 4);
  return `${firstPart}${'*'.repeat(Math.max(apiKey.length - 11, 3))}${lastPart}`;
}

console.log('Options script loaded');
