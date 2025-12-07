// Popup UI logic for Chromium History Chat Extension

// DOM elements
let messagesContainer;
let userInput;
let sendButton;
let loadingIndicator;
let errorContainer;
let chatView;
let settingsView;
let backButton;
let newButton;
let settingsButton;
let headerTitle;

// Settings DOM elements
let historyRangeInput;
let maxResultsInput;
let savePreferencesButton;
let preferencesStatus;
let clearChatButton;
let clearChatStatus;
let modeTitle;
let modeDescription;
let openOptionsButton;
let apiKeyInput;
let apiKeyStatus;
let saveApiKeyButton;
let clearApiKeyButton;
let toggleVisibilityButton;

// State
let chatHistory = [];
let isProcessing = false;
let currentView = 'chat'; // 'chat' or 'settings'

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  // Get DOM elements
  messagesContainer = document.getElementById('messages');
  userInput = document.getElementById('user-input');
  sendButton = document.getElementById('send-button');
  loadingIndicator = document.getElementById('loading-indicator');
  errorContainer = document.getElementById('error-container');
  chatView = document.getElementById('chat-view');
  settingsView = document.getElementById('settings-view');
  backButton = document.getElementById('back-button');
  newButton = document.getElementById('new-button');
  settingsButton = document.getElementById('settings-button');
  headerTitle = document.getElementById('header-title');

  // Settings DOM elements
  historyRangeInput = document.getElementById('history-range');
  maxResultsInput = document.getElementById('max-results');
  savePreferencesButton = document.getElementById('save-preferences-button');
  preferencesStatus = document.getElementById('preferences-status');
  clearChatButton = document.getElementById('clear-chat-button');
  clearChatStatus = document.getElementById('clear-chat-status');
  modeTitle = document.getElementById('mode-title');
  modeDescription = document.getElementById('mode-description');
  openOptionsButton = document.getElementById('open-options-button');
  apiKeyInput = document.getElementById('api-key-input');
  apiKeyStatus = document.getElementById('api-key-status');
  saveApiKeyButton = document.getElementById('save-api-key-button');
  clearApiKeyButton = document.getElementById('clear-api-key-button');
  toggleVisibilityButton = document.getElementById('toggle-visibility-button');

  // Set up event listeners
  sendButton.addEventListener('click', handleSendMessage);
  userInput.addEventListener('keydown', handleKeyPress);
  settingsButton.addEventListener('click', showSettingsView);
  backButton.addEventListener('click', showChatView);
  newButton.addEventListener('click', handleNewChat);
  savePreferencesButton.addEventListener('click', handleSavePreferences);
  if (clearChatButton) {
    clearChatButton.addEventListener('click', handleClearChatFromSettings);
  }
  if (openOptionsButton) {
    openOptionsButton.addEventListener('click', handleOpenOptions);
  }
  if (toggleVisibilityButton) {
    toggleVisibilityButton.addEventListener('click', handleToggleVisibility);
  }

  // Load chat history
  await loadChatHistory();

  // Always enable input (backend can be used if no API key)
  userInput.disabled = false;
  sendButton.disabled = false;
  userInput.focus();
});

// Load chat history from storage
async function loadChatHistory() {
  try {
    const result = await chrome.storage.local.get(['chat_history']);
    chatHistory = result.chat_history || [];

    // Display existing messages
    chatHistory.forEach(message => {
      appendMessage(message.role, message.content, false);
    });

    // Show conversation starters if chat is empty
    if (chatHistory.length === 0) {
      showConversationStarters();
    }

    scrollToBottom();
  } catch (error) {
    console.error('Error loading chat history:', error);
  }
}

// Save chat history to storage
async function saveChatHistory() {
  try {
    await chrome.storage.local.set({ chat_history: chatHistory });
  } catch (error) {
    console.error('Error saving chat history:', error);
  }
}

// Handle send message
async function handleSendMessage() {
  if (isProcessing) return;

  const message = userInput.value.trim();
  if (!message) return;

  // All processing happens on the backend

  // Clear input
  userInput.value = '';
  userInput.disabled = true;
  sendButton.disabled = true;
  isProcessing = true;

  // Hide error
  hideError();

  // Add user message to chat
  appendMessage('user', message);
  chatHistory.push({ role: 'user', content: message });
  await saveChatHistory();

  // Show loading
  showLoading();

  try {
    // Get user preferences for maxResults (defaults to 100,000)
    const preferencesResult = await chrome.storage.local.get(['user_preferences']);
    const userMaxResults = preferencesResult.user_preferences?.maxResults || 100000;
    
    // Prepare conversation messages (chatHistory already includes the new user message)
    const conversationMessages = [...chatHistory];

    // Chat with backend (history processing is done server-side)
    const chatResult = await chrome.runtime.sendMessage({
      type: 'CHAT_WITH_HISTORY',
      params: {
        message: message,
        conversationMessages: conversationMessages,
        maxResults: userMaxResults
      }
    });

    if (chatResult.error) {
      throw new Error(chatResult.error);
    }

    // Add assistant response to chat
    const reply = chatResult.reply;
    appendMessage('assistant', reply);
    chatHistory.push({ role: 'assistant', content: reply });
    await saveChatHistory();

  } catch (error) {
    console.error('Error:', error);
    showError(error.message || 'An error occurred. Please try again.');

    // Add error message to chat
    const errorMessage = `Error: ${error.message}`;
    appendMessage('error', errorMessage);
  } finally {
    // Hide loading
    hideLoading();

    // Re-enable input
    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.focus();
    isProcessing = false;
  }
}

// Handle key press in input
function handleKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSendMessage();
  }
}

// Render markdown content safely
function renderMarkdown(markdown) {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }
  
  // Check if markdown libraries are available
  if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
    // Fallback to plain text if libraries aren't loaded
    return markdown
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
  }
  
  // Parse markdown to HTML
  const html = marked.parse(markdown);
  
  // Sanitize HTML to prevent XSS attacks
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'a', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    ALLOW_DATA_ATTR: false
  });
  
  return sanitized;
}

// Append message to chat
function appendMessage(role, content, shouldSave = true) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  
  // Render markdown for assistant messages, plain text for user messages
  if (role === 'assistant') {
    messageDiv.innerHTML = renderMarkdown(content);
  } else {
    // For user messages and errors, escape HTML and preserve line breaks
    const escaped = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
    messageDiv.innerHTML = escaped;
  }
  
  messagesContainer.appendChild(messageDiv);
  scrollToBottom();
}

// Scroll to bottom of chat
function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Show conversation starter bubbles
function showConversationStarters() {
  // Remove existing starters if any
  const existingStarters = messagesContainer.querySelector('.conversation-starters');
  if (existingStarters) {
    existingStarters.remove();
  }

  // Define conversation starter prompts
  const starters = [
    "Where do I visit most?",
    "Summarize my visits in descending order starting with most visited",
    "What have I been reading about lately?",
    "Show my top 10 most visited sites"
  ];

  // Create container for starters
  const starterContainer = document.createElement('div');
  starterContainer.className = 'conversation-starters';

  // Add title
  const title = document.createElement('div');
  title.className = 'conversation-starters-title';
  title.textContent = 'Try asking:';
  starterContainer.appendChild(title);

  // Create bubbles container
  const bubblesContainer = document.createElement('div');
  bubblesContainer.className = 'starter-bubbles';

  // Create a bubble for each starter
  starters.forEach(text => {
    const bubble = document.createElement('button');
    bubble.className = 'starter-bubble';
    bubble.textContent = text;
    bubble.onclick = () => {
      // Set the input value and remove starters
      userInput.value = text;
      starterContainer.remove();
      // Focus input and trigger send
      userInput.focus();
      handleSendMessage();
    };
    bubblesContainer.appendChild(bubble);
  });

  starterContainer.appendChild(bubblesContainer);
  messagesContainer.appendChild(starterContainer);
  scrollToBottom();
}

// Show loading indicator
function showLoading() {
  loadingIndicator.classList.remove('hidden');
}

// Hide loading indicator
function hideLoading() {
  loadingIndicator.classList.add('hidden');
}

// Show error message
function showError(message) {
  errorContainer.textContent = message;
  errorContainer.classList.remove('hidden');
}

// Hide error message
function hideError() {
  errorContainer.classList.add('hidden');
}

// View switching functions
function showSettingsView() {
  currentView = 'settings';
  chatView.classList.add('hidden');
  settingsView.classList.remove('hidden');
  backButton.classList.remove('hidden');
  newButton.classList.add('hidden');
  settingsButton.classList.add('hidden');
  headerTitle.textContent = 'Settings';
  
  // Load settings when switching to settings view
  loadSettings();
}

function showChatView() {
  currentView = 'chat';
  settingsView.classList.add('hidden');
  chatView.classList.remove('hidden');
  backButton.classList.add('hidden');
  newButton.classList.remove('hidden');
  settingsButton.classList.remove('hidden');
  headerTitle.textContent = 'Chat with History';
  
  // Focus input when returning to chat
  userInput.focus();
}

// Load settings into the settings view
async function loadSettings() {
  try {
    // Check which mode is active
    const apiKeyResult = await chrome.storage.local.get(['openai_api_key']);
    const hasApiKey = !!(apiKeyResult.openai_api_key && apiKeyResult.openai_api_key.length > 0);
    
    // Load API key
    if (apiKeyInput) {
      if (apiKeyResult.openai_api_key) {
        apiKeyInput.dataset.actualValue = apiKeyResult.openai_api_key;
        apiKeyInput.value = maskApiKey(apiKeyResult.openai_api_key);
        apiKeyInput.type = 'password';
      } else {
        apiKeyInput.value = '';
        delete apiKeyInput.dataset.actualValue;
      }
    }
    
    if (modeTitle && modeDescription) {
      if (hasApiKey) {
        modeTitle.textContent = '🔑 Direct OpenAI Mode';
        modeDescription.textContent = 'You are using your own OpenAI API key. Browsing history is sent directly to OpenAI without going through the backend.';
      } else {
        modeTitle.textContent = '☁️ Backend Mode';
        modeDescription.textContent = 'Using the managed backend service. Your browsing history is processed on the backend before OpenAI is called.';
      }
    }
    
    // Load preferences
    const preferencesResult = await chrome.storage.local.get(['user_preferences']);
    if (preferencesResult.user_preferences) {
      const prefs = preferencesResult.user_preferences;
      historyRangeInput.value = prefs.historyRangeDays || 5000;
      maxResultsInput.value = prefs.maxResults || 100000;
    }
    
    // Load extension version from manifest
    const manifest = chrome.runtime.getManifest();
    const versionElement = document.getElementById('extension-version');
    if (versionElement && manifest.version) {
      versionElement.textContent = manifest.version;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
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
    showStatus(preferencesStatus, `Warning: ${maxResults} results may be too few for good context.`, 'info');
    // Still save the preference
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

// Handle clear chat history from settings
async function handleClearChatFromSettings() {
  if (!confirm('Are you sure you want to clear your chat history? This cannot be undone.')) {
    return;
  }

  try {
    await clearChatHistory();
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

// Clear chat history and start new chat
async function clearChatHistory() {
  chatHistory = [];
  messagesContainer.innerHTML = '';
  await chrome.storage.local.remove(['chat_history']);
}

// Handle new chat button click
async function handleNewChat() {
  await clearChatHistory();
  showConversationStarters();
  userInput.focus();
}

// Handle open options button click
function handleOpenOptions() {
  chrome.runtime.openOptionsPage();
}

// Handle toggle visibility
function handleToggleVisibility() {
  if (!apiKeyInput || !toggleVisibilityButton) return;
  
  const eyeIcon = toggleVisibilityButton.querySelector('svg');
  
  if (apiKeyInput.type === 'password') {
    // Show API key
    if (apiKeyInput.dataset.actualValue) {
      apiKeyInput.value = apiKeyInput.dataset.actualValue;
    }
    apiKeyInput.type = 'text';
    // Update icon to eye-off
    if (eyeIcon) {
      eyeIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
    }
  } else {
    // Hide API key
    if (apiKeyInput.dataset.actualValue) {
      apiKeyInput.value = maskApiKey(apiKeyInput.dataset.actualValue);
    }
    apiKeyInput.type = 'password';
    // Update icon to eye
    if (eyeIcon) {
      eyeIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
    }
  }
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

console.log('Popup script loaded');
