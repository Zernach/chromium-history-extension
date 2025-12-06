// Service Worker for Chromium History Chat Extension
// Handles background tasks, history access, and message passing

// Import WASM module using static import (required for service workers)
import initWasm from '../wasm/chromium_history_wasm.js';

let wasmModule = null;

// Backend URL - update this after deploying your backend
// Can also be stored in chrome.storage.local.get(['backend_url']) for user configuration
const BACKEND_URL = 'https://chromium-history-chat-pv3keymiya-uc.a.run.app'; // Set this to your deployed backend URL, e.g., 'https://your-function-url.run.app'

// Initialize on service worker startup
self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activating...');
  event.waitUntil(clients.claim());

  // Initialize WASM module
  initializeWasm();
});

// Initialize WASM module
async function initializeWasm() {
  try {
    const wasmPath = chrome.runtime.getURL('wasm/chromium_history_wasm_bg.wasm');
    wasmModule = await initWasm(wasmPath);
    console.log('WASM module initialized successfully');
  } catch (error) {
    console.error('Failed to initialize WASM module:', error);
  }
}

// Extension installation handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed');

    // Check if history permission is granted
    chrome.permissions.contains({ permissions: ['history'] }, (result) => {
      if (!result) {
        console.log('History permission not granted yet');
      }
    });
  }
});

// Message handler for communication with popup and options pages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request.type);

  // Handle async operations
  handleMessage(request, sender)
    .then(response => sendResponse(response))
    .catch(error => sendResponse({ error: error.message }));

  // Return true to indicate async response
  return true;
});

// Main message handler
async function handleMessage(request, sender) {
  switch (request.type) {
    case 'FETCH_HISTORY':
      return await fetchHistory(request.params);

    case 'QUERY_HISTORY':
      return await queryHistory(request.params);

    case 'CHAT_WITH_HISTORY':
      return await chatWithHistory(request.params);

    case 'CHECK_API_KEY':
      return await checkApiKey();

    case 'TEST_WASM':
      return await testWasm();

    default:
      throw new Error(`Unknown message type: ${request.type}`);
  }
}

// Fetch browser history
async function fetchHistory(params = {}) {
  const {
    text = '',
    startTime = Date.now() - (30 * 24 * 60 * 60 * 1000), // Default: 30 days ago
    endTime = Date.now(),
    maxResults = 1000
  } = params;

  return new Promise((resolve, reject) => {
    chrome.history.search({
      text,
      startTime,
      endTime,
      maxResults
    }, (historyItems) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve({ historyItems });
      }
    });
  });
}

// Query history with WASM processing
async function queryHistory(params = {}) {
  const {
    query = '',
    startTime,
    endTime,
    maxResults = 100
  } = params;

  // Fetch history
  const { historyItems } = await fetchHistory({ startTime, endTime, maxResults: 1000 });

  // Convert to format expected by WASM
  const entries = historyItems.map(item => ({
    url: item.url || '',
    title: item.title || '',
    visit_count: item.visitCount || 0,
    last_visit_time: item.lastVisitTime || 0
  }));

  if (!wasmModule) {
    console.warn('WASM module not initialized, returning raw results');
    return { entries: entries.slice(0, maxResults) };
  }

  try {
    // Use the advanced find_relevant_history function which combines:
    // - Keyword extraction
    // - Filtering
    // - Relevance scoring
    // - Sorting
    // - Limiting results
    const currentTime = Date.now();
    const relevantEntries = wasmModule.find_relevant_history(
      entries,
      query,
      maxResults,
      currentTime
    );

    return { entries: relevantEntries };
  } catch (error) {
    console.error('WASM processing error:', error);
    // Fallback to simple filtering
    try {
      const keywords = wasmModule.extract_keywords(query);
      if (keywords.length > 0) {
        const filtered = wasmModule.filter_history_by_keywords(entries, keywords);
        const sorted = wasmModule.sort_history_by_relevance(filtered);
        const limited = wasmModule.limit_history_results(sorted, maxResults);
        return { entries: limited };
      }
    } catch (fallbackError) {
      console.error('Fallback processing error:', fallbackError);
    }
    return { entries: entries.slice(0, maxResults) };
  }
}

// Chat with history using OpenAI or backend
async function chatWithHistory(params = {}) {
  const {
    message,
    historyContext,
    apiKey
  } = params;

  if (!message) {
    throw new Error('Message is required');
  }

  // Check if user provided an API key
  const userApiKey = apiKey || await getUserApiKey();
  
  if (userApiKey) {
    // User provided API key - call OpenAI directly
    return await chatWithOpenAI(message, historyContext, userApiKey);
  } else {
    // No API key - use backend
    return await chatWithBackend(message, historyContext);
  }
}

// Get user's API key from storage
async function getUserApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['openai_api_key'], (result) => {
      const key = result.openai_api_key;
      resolve(key && key.length > 0 ? key : null);
    });
  });
}

// Chat with OpenAI directly using user's API key
async function chatWithOpenAI(message, historyContext, apiKey) {
  // Prepare history context
  let contextText = historyContext;
  if (Array.isArray(historyContext)) {
    // Format history entries for LLM
    if (wasmModule) {
      try {
        contextText = wasmModule.format_history_for_llm(historyContext, 4000);
      } catch (error) {
        console.error('WASM formatting error:', error);
        contextText = formatHistoryManually(historyContext);
      }
    } else {
      contextText = formatHistoryManually(historyContext);
    }
  }

  // Call OpenAI API
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant that helps users understand and explore their browser history.

Here is the user's relevant browsing history:

${contextText}

Please answer the user's question based on this browsing history. Be concise and helpful. If the history doesn't contain relevant information, let the user know.`
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || 'No response from AI';

    return { reply };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

// Chat with backend (no API key required)
async function chatWithBackend(message, historyContext) {
  // Get backend URL (from constant or storage)
  let backendUrl = BACKEND_URL;
  if (!backendUrl) {
    // Try to get from storage
    const result = await new Promise((resolve) => {
      chrome.storage.local.get(['backend_url'], resolve);
    });
    backendUrl = result.backend_url;
  }

  if (!backendUrl) {
    throw new Error('Backend URL not configured. Please set your backend URL or provide an OpenAI API key in the options page.');
  }

  // Convert history context to backend format
  let history = [];
  if (Array.isArray(historyContext)) {
    history = historyContext.map(entry => ({
      url: entry.url || '',
      title: entry.title || '',
      visit_count: Math.floor(entry.visit_count || 0),
      last_visit_time: Math.floor(entry.last_visit_time || 0)
    }));
  }

  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        history: history
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (response.status === 400) {
        throw new Error(errorData.error || 'Invalid request. Please check your input.');
      } else {
        throw new Error(errorData.error || `Backend error: ${response.status} - ${response.statusText}`);
      }
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }

    const reply = data.reply || 'No response from backend';
    return { reply };
  } catch (error) {
    console.error('Backend API error:', error);
    throw error;
  }
}

// Format history manually (fallback)
function formatHistoryManually(entries) {
  return entries
    .slice(0, 50)
    .map(entry => `URL: ${entry.url}\nTitle: ${entry.title}\nVisits: ${entry.visit_count}\n`)
    .join('\n');
}

// Check if API key is set
async function checkApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['openai_api_key'], (result) => {
      const hasKey = !!(result.openai_api_key && result.openai_api_key.length > 0);
      resolve({ hasKey });
    });
  });
}

// Test WASM module
async function testWasm() {
  if (!wasmModule) {
    return { success: false, error: 'WASM module not initialized' };
  }

  try {
    const testEntries = [
      { url: 'https://example.com', title: 'Example', visit_count: 5, last_visit_time: Date.now() },
      { url: 'https://test.com', title: 'Test', visit_count: 3, last_visit_time: Date.now() - 10000 }
    ];

    const sorted = wasmModule.sort_history_by_relevance(testEntries);
    return { success: true, result: sorted };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

console.log('Service worker loaded');
