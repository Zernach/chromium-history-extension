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

// Get user preferences from storage
async function getUserPreferences() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['user_preferences'], (result) => {
      const prefs = result.user_preferences || {};
      resolve({
        historyRangeDays: prefs.historyRangeDays || 365, // Default to 365 days (1 year) for maximum history
        maxResults: prefs.maxResults || 1000 // Default to 1000, but user can set up to 1000
      });
    });
  });
}

// Fetch browser history
async function fetchHistory(params = {}) {
  // Get user preferences
  const preferences = await getUserPreferences();
  const historyRangeDays = preferences.historyRangeDays;
  
  const {
    text = '',
    startTime,
    endTime = Date.now(),
    maxResults
  } = params;

  // Use user preference for time range if not specified
  const calculatedStartTime = startTime || (Date.now() - (historyRangeDays * 24 * 60 * 60 * 1000));
  
  // Fetch lots of history from Chrome API (use max allowed or user preference * 10 for safety)
  // Chrome API allows up to 10,000 results, but we want to fetch as much as possible
  const chromeApiMaxResults = maxResults || 10000;

  console.log(`[fetchHistory] Fetching history: text="${text}", startTime=${new Date(calculatedStartTime).toISOString()}, endTime=${new Date(endTime).toISOString()}, range=${historyRangeDays} days, maxResults=${chromeApiMaxResults}`);

  return new Promise((resolve, reject) => {
    chrome.history.search({
      text,
      startTime: calculatedStartTime,
      endTime,
      maxResults: chromeApiMaxResults
    }, (historyItems) => {
      if (chrome.runtime.lastError) {
        console.error(`[fetchHistory] Error: ${chrome.runtime.lastError.message}`);
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        console.log(`[fetchHistory] Chrome API returned ${historyItems.length} items (requested ${chromeApiMaxResults})`);
        resolve({ historyItems });
      }
    });
  });
}

// Query history with WASM processing
async function queryHistory(params = {}) {
  // Get user preferences
  const preferences = await getUserPreferences();
  const userMaxResults = preferences.maxResults;
  
  const {
    query = '',
    startTime,
    endTime,
    maxResults
  } = params;

  // Use user preference for maxResults if not specified, but fetch more from Chrome API
  // We fetch lots from Chrome API, then limit to user preference after processing
  const finalMaxResults = maxResults || userMaxResults;
  
  // Fetch lots of history from Chrome API (10,000 is Chrome's max)
  // We'll filter and limit after WASM processing
  const { historyItems } = await fetchHistory({ startTime, endTime, maxResults: 10000 });
  
  console.log(`[queryHistory] Fetched ${historyItems.length} history items from Chrome API (user maxResults preference: ${userMaxResults})`);

  // Convert to format expected by WASM, filtering out invalid entries
  const entries = historyItems
    .map(item => {
      // Only use lastVisitTime if it's a valid positive number
      const lastVisitTime = (item.lastVisitTime && item.lastVisitTime > 0) 
        ? item.lastVisitTime 
        : null;
      
      // Only include entries with valid timestamps and URLs
      if (!lastVisitTime || !item.url) {
        console.warn(`[queryHistory] Skipping invalid entry: url=${item.url}, lastVisitTime=${item.lastVisitTime}`);
        return null;
      }
      
      return {
        url: item.url,
        title: item.title || '',
        visit_count: item.visitCount || 0,
        last_visit_time: lastVisitTime
      };
    })
    .filter(entry => entry !== null); // Remove null entries

  console.log(`[queryHistory] After filtering invalid entries: ${entries.length} valid entries`);

  if (!wasmModule) {
    console.warn('WASM module not initialized, returning raw results sorted by recency');
    // Sort by recency and return up to user preference
    const sortedByRecency = entries
      .sort((a, b) => b.last_visit_time - a.last_visit_time)
      .slice(0, finalMaxResults);
    console.log(`[queryHistory] Returning ${sortedByRecency.length} most recent entries (user preference: ${finalMaxResults})`);
    return { entries: sortedByRecency };
  }

  try {
    // If query is empty or very short (like "Summarize my history"), 
    // return ALL recent entries up to user preference, sorted by recency
    if (!query || query.trim().length < 3) {
      console.log(`[queryHistory] Query is empty/short ("${query}"), returning all recent entries up to user preference`);
      const sortedByRecency = entries
        .sort((a, b) => b.last_visit_time - a.last_visit_time)
        .slice(0, finalMaxResults);
      console.log(`[queryHistory] Returning ${sortedByRecency.length} most recent entries (user preference: ${finalMaxResults})`);
      return { entries: sortedByRecency };
    }

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
      finalMaxResults, // Use user preference for WASM limit too
      currentTime
    );

    // Limit to user preference (WASM might return more)
    const limitedEntries = relevantEntries.slice(0, finalMaxResults);
    console.log(`[queryHistory] WASM returned ${relevantEntries.length} relevant entries, limited to ${limitedEntries.length} (user preference: ${finalMaxResults})`);
    return { entries: limitedEntries };
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
    // Final fallback: return recent entries sorted by timestamp
    const sortedByRecency = entries
      .sort((a, b) => b.last_visit_time - a.last_visit_time)
      .slice(0, finalMaxResults);
    console.log(`[queryHistory] Using fallback: returning ${sortedByRecency.length} most recent entries (user preference: ${finalMaxResults})`);
    return { entries: sortedByRecency };
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

  // Validate message
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new Error('Message is required and must be a non-empty string');
  }

  // Convert history context to backend format
  let history = [];
  if (Array.isArray(historyContext)) {
    history = historyContext
      .map(entry => {
        // Ensure visit_count is a valid integer
        let visitCount = 0;
        if (entry.visit_count !== undefined && entry.visit_count !== null) {
          const count = Number(entry.visit_count);
          visitCount = isNaN(count) ? 0 : Math.floor(Math.max(0, count));
        } else if (entry.visitCount !== undefined && entry.visitCount !== null) {
          // Handle camelCase from Chrome API
          const count = Number(entry.visitCount);
          visitCount = isNaN(count) ? 0 : Math.floor(Math.max(0, count));
        }

        // Ensure last_visit_time is a valid integer (must be > 0)
        let lastVisitTime = 0;
        if (entry.last_visit_time !== undefined && entry.last_visit_time !== null) {
          const time = Number(entry.last_visit_time);
          lastVisitTime = isNaN(time) || time <= 0 ? 0 : Math.floor(time);
        } else if (entry.lastVisitTime !== undefined && entry.lastVisitTime !== null) {
          // Handle camelCase from Chrome API
          const time = Number(entry.lastVisitTime);
          lastVisitTime = isNaN(time) || time <= 0 ? 0 : Math.floor(time);
        }

        // Skip entries with invalid timestamps or empty URLs
        if (lastVisitTime <= 0 || !entry.url) {
          console.warn(`[chatWithBackend] Skipping invalid entry: url=${entry.url}, lastVisitTime=${lastVisitTime}`);
          return null;
        }

        return {
          url: String(entry.url),
          title: String(entry.title || ''),
          visit_count: visitCount,
          last_visit_time: lastVisitTime
        };
      })
      .filter(entry => entry !== null); // Remove null entries
    
    console.log(`[chatWithBackend] Sending ${history.length} valid history entries to backend`);
  }

  try {
    // Prepare request body
    const requestBody = {
      message: String(message).trim(),
      history: history
    };

    // Validate request body can be serialized
    let requestBodyJson;
    try {
      requestBodyJson = JSON.stringify(requestBody);
    } catch (jsonError) {
      console.error('Failed to serialize request body:', jsonError, requestBody);
      throw new Error('Failed to prepare request data');
    }

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: requestBodyJson
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
