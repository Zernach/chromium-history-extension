// Service Worker for Chromium History Chat Extension
// Handles background tasks, history access, and message passing
// All history processing is now done on the backend (no WASM)

// Backend WebSocket URL
// For local development, use: ws://localhost:3000/api/ws/chromium-history-extension
// For production, use: wss://api.archlife.org/api/ws/chromium-history-extension
// const BACKEND_WS_URL = 'ws://localhost:3000/api/ws/chromium-history-extension';
const BACKEND_WS_URL = 'wss://api.archlife.org/api/ws/chromium-history-extension';
// Old HTTP backend URL (kept for reference, no longer used)
// const BACKEND_URL = 'https://chromium-history-chat-pv3keymiya-uc.a.run.app';

// Initialize on service worker startup
self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activating...');
  event.waitUntil(clients.claim());
});

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
        maxResults: prefs.maxResults || 100000 // Default to 100,000 records
      });
    });
  });
}

// Fetch browser history with support for large datasets (up to 100,000 records)
// Chrome API has a hard limit of 10,000 per call, so we implement smart batching
async function fetchHistory(params = {}) {
  console.log('[fetchHistory] Called with params:', JSON.stringify(params));

  // Check chrome.history API availability
  if (!chrome.history) {
    console.error('[fetchHistory] ERROR: chrome.history API is not available!');
    console.error('[fetchHistory] This could mean the history permission is not granted or the API is unavailable');
    return { historyItems: [] };
  }

  // Get user preferences
  const preferences = await getUserPreferences();
  const historyRangeDays = preferences.historyRangeDays;

  console.log('[fetchHistory] User preferences loaded:', { historyRangeDays });

  const {
    text,
    startTime,
    endTime = Date.now(),
    maxResults
  } = params;

  // CRITICAL: Chrome's history.search API REQUIRES the 'text' property
  // Ensure it's always a valid string (empty string searches all history)
  const searchText = (text !== undefined && text !== null) ? String(text) : '';

  // Chrome's history.search API expects timestamps in MILLISECONDS since epoch
  const now = Date.now();
  
  // If startTime/endTime are explicitly provided, use them (this is the case from chatWithBackend)
  // Otherwise, calculate from preferences
  let calculatedStartTime, calculatedEndTime, shouldUseDateRange;
  
  if (startTime !== undefined && endTime !== undefined) {
    // Explicitly provided - use them directly
    calculatedStartTime = startTime;
    calculatedEndTime = endTime;
    shouldUseDateRange = true;
  } else if (startTime !== undefined) {
    // Only startTime provided
    calculatedStartTime = startTime;
    calculatedEndTime = endTime !== undefined ? endTime : now;
    shouldUseDateRange = true;
  } else if (searchText && searchText.trim().length > 0) {
    // Text query provided - use date range from preferences
    calculatedStartTime = now - (historyRangeDays * 24 * 60 * 60 * 1000);
    calculatedEndTime = endTime !== undefined ? endTime : now;
    shouldUseDateRange = true;
  } else {
    // No explicit dates and no text - don't use date restrictions for better results
    calculatedStartTime = 0;
    calculatedEndTime = now;
    shouldUseDateRange = false;
  }
  
  // Validate time range when using date restrictions
  if (shouldUseDateRange) {
    if (calculatedStartTime >= calculatedEndTime) {
      console.error(`[fetchHistory] ERROR: Invalid time range! startTime (${calculatedStartTime} = ${new Date(calculatedStartTime).toISOString()}) >= endTime (${calculatedEndTime} = ${new Date(calculatedEndTime).toISOString()})`);
      return { historyItems: [] };
    }
    
    if (calculatedStartTime > now) {
      console.error(`[fetchHistory] ERROR: Start time is in the future! startTime=${calculatedStartTime} (${new Date(calculatedStartTime).toISOString()}), now=${now} (${new Date(now).toISOString()})`);
      return { historyItems: [] };
    }
  }

  // Target number of results (can be up to 100,000)
  const targetMaxResults = maxResults || 100000;

  // Chrome API has a HARD limit of 10,000 per call
  const CHROME_API_LIMIT = 10000;

  console.log(`[fetchHistory] Fetching history:`);
  console.log(`[fetchHistory]   - Text query: "${searchText}"`);
  console.log(`[fetchHistory]   - Start time: ${calculatedStartTime} ms = ${new Date(calculatedStartTime).toISOString()}`);
  console.log(`[fetchHistory]   - End time: ${calculatedEndTime} ms = ${new Date(calculatedEndTime).toISOString()}`);
  console.log(`[fetchHistory]   - Range: ${Math.round((calculatedEndTime - calculatedStartTime) / (24 * 60 * 60 * 1000))} days`);
  console.log(`[fetchHistory]   - Target max results: ${targetMaxResults}`);

  // If requesting <= 10,000, make a single call (fast path)
  if (targetMaxResults <= CHROME_API_LIMIT) {
    return new Promise((resolve, reject) => {
      // Build search query - always include date parameters when we have valid times
      const searchQuery = {
        startTime: calculatedStartTime,
        endTime: calculatedEndTime,
        maxResults: targetMaxResults,
        text: searchText // Chrome API requires 'text' property, empty string searches all history
      };

      console.log(`[fetchHistory] Calling chrome.history.search with:`, {
        text: searchQuery.text || '(empty string - getting all history)',
        startTime: new Date(searchQuery.startTime).toISOString(),
        endTime: new Date(searchQuery.endTime).toISOString(),
        maxResults: searchQuery.maxResults
      });
      
      chrome.history.search(searchQuery, (historyItems) => {
        if (chrome.runtime.lastError) {
          console.error(`[fetchHistory] Error: ${chrome.runtime.lastError.message}`);
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          console.log(`[fetchHistory] Chrome API returned ${historyItems.length} items (requested ${targetMaxResults})`);
          
          // If we got 0 results and text was omitted, try with a very broad query as fallback
          if (historyItems.length === 0 && (!searchText || searchText.trim().length === 0)) {
            console.log(`[fetchHistory] Got 0 results with omitted text, trying fallback with single space query...`);
            const fallbackQuery = {
              text: ' ', // Single space as very broad query
              maxResults: targetMaxResults
            };
            
            // Only add date restrictions if we were using them
            if (shouldUseDateRange) {
              fallbackQuery.startTime = calculatedStartTime;
              fallbackQuery.endTime = calculatedEndTime;
            }
            
            chrome.history.search(fallbackQuery, (fallbackItems) => {
              if (chrome.runtime.lastError) {
                console.error(`[fetchHistory] Fallback query also failed: ${chrome.runtime.lastError.message}`);
                resolve({ historyItems: [] }); // Return empty rather than reject
              } else {
                console.log(`[fetchHistory] Fallback query returned ${fallbackItems.length} items`);
                resolve({ historyItems: fallbackItems });
              }
            });
          } else {
            resolve({ historyItems });
          }
        }
      });
    });
  }

  // For larger requests, batch fetch by time windows
  // Strategy: Divide time range into multiple chunks and fetch 10,000 from each
  // If not using date restrictions, fetch in sequential batches without time windows
  const allHistoryItems = [];
  const urlMap = new Map(); // Track unique URLs to avoid duplicates
  
  let numBatches, timeChunkSize, timeRange;
  if (shouldUseDateRange) {
    timeRange = calculatedEndTime - calculatedStartTime;
    numBatches = Math.ceil(targetMaxResults / CHROME_API_LIMIT);
    timeChunkSize = Math.floor(timeRange / numBatches);
    console.log(`[fetchHistory] Large request: fetching in ${numBatches} time-based batches`);
  } else {
    // Without date restrictions, just fetch in sequential batches
    numBatches = Math.ceil(targetMaxResults / CHROME_API_LIMIT);
    console.log(`[fetchHistory] Large request: fetching in ${numBatches} sequential batches (no date restrictions)`);
  }

  for (let i = 0; i < numBatches && allHistoryItems.length < targetMaxResults; i++) {
    const remainingNeeded = targetMaxResults - allHistoryItems.length;
    const batchMaxResults = Math.min(CHROME_API_LIMIT, remainingNeeded);

    let batchStartTime, batchEndTime;
    if (shouldUseDateRange) {
      batchStartTime = calculatedStartTime + (i * timeChunkSize);
      batchEndTime = i === numBatches - 1 ? calculatedEndTime : calculatedStartTime + ((i + 1) * timeChunkSize);
      
      // Validate batch time range
      if (batchStartTime >= batchEndTime) {
        console.error(`[fetchHistory] Batch ${i + 1}: Invalid time range! start=${batchStartTime} (${new Date(batchStartTime).toISOString()}), end=${batchEndTime} (${new Date(batchEndTime).toISOString()})`);
        break;
      }
      
      console.log(`[fetchHistory] Batch ${i + 1}/${numBatches}: ${new Date(batchStartTime).toISOString()} to ${new Date(batchEndTime).toISOString()}, requesting ${batchMaxResults}`);
      console.log(`[fetchHistory] Batch ${i + 1} timestamps: start=${batchStartTime} ms, end=${batchEndTime} ms`);
    } else {
      console.log(`[fetchHistory] Batch ${i + 1}/${numBatches}: requesting ${batchMaxResults} items (no date restrictions)`);
    }

    try {
      const batchItems = await new Promise((resolve, reject) => {
        // Build search query
        const searchQuery = {
          maxResults: batchMaxResults,
          text: searchText // Chrome API requires 'text' property, empty string searches all history
        };

        // Only include date parameters if we're using date restrictions and they're defined
        if (shouldUseDateRange && batchStartTime !== undefined && batchEndTime !== undefined) {
          searchQuery.startTime = batchStartTime;
          searchQuery.endTime = batchEndTime;
        }

        chrome.history.search(searchQuery, (historyItems) => {
          if (chrome.runtime.lastError) {
            console.error(`[fetchHistory] Batch ${i + 1} Chrome API error:`, chrome.runtime.lastError.message);
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            // If we got 0 results and text was omitted, try with a very broad query as fallback
            if (historyItems.length === 0 && (!searchText || searchText.trim().length === 0)) {
              console.log(`[fetchHistory] Batch ${i + 1} got 0 results with omitted text, trying fallback with single space query...`);
              const fallbackQuery = {
                text: ' ', // Single space as very broad query
                maxResults: batchMaxResults
              };
              
              // Only add date restrictions if we were using them
              if (shouldUseDateRange) {
                fallbackQuery.startTime = batchStartTime;
                fallbackQuery.endTime = batchEndTime;
              }
              
              chrome.history.search(fallbackQuery, (fallbackItems) => {
                if (chrome.runtime.lastError) {
                  console.error(`[fetchHistory] Batch ${i + 1} fallback query also failed:`, chrome.runtime.lastError.message);
                  resolve([]); // Return empty rather than reject
                } else {
                  console.log(`[fetchHistory] Batch ${i + 1} fallback query returned ${fallbackItems.length} items`);
                  resolve(fallbackItems);
                }
              });
            } else {
              resolve(historyItems);
            }
          }
        });
      });

      console.log(`[fetchHistory] Batch ${i + 1} returned ${batchItems.length} items`);

      // Log sample item if this is the first batch (for debugging)
      if (i === 0 && batchItems.length > 0) {
        console.log('[fetchHistory] Sample history item from Chrome API:', {
          url: batchItems[0].url?.substring(0, 50),
          title: batchItems[0].title?.substring(0, 50),
          lastVisitTime: batchItems[0].lastVisitTime,
          visitCount: batchItems[0].visitCount
        });
      } else if (i === 0 && batchItems.length === 0) {
        console.warn('[fetchHistory] WARNING: First batch returned 0 items!');
        console.warn('[fetchHistory] This suggests Chrome has no history in this time range, or there may be a permission issue.');
      }

      // Add unique items (keep most recent visit)
      for (const item of batchItems) {
        if (!urlMap.has(item.url) || urlMap.get(item.url).lastVisitTime < item.lastVisitTime) {
          if (!urlMap.has(item.url)) {
            allHistoryItems.push(item);
          } else {
            // Update existing item with more recent visit data
            const existingIndex = allHistoryItems.findIndex(h => h.url === item.url);
            if (existingIndex >= 0) {
              allHistoryItems[existingIndex] = item;
            }
          }
          urlMap.set(item.url, item);
        }
      }

      // If we got fewer items than requested, no point continuing
      if (batchItems.length < batchMaxResults && batchItems.length < 5000) {
        console.log(`[fetchHistory] Batch ${i + 1} returned significantly fewer items (${batchItems.length}), likely exhausted history in this time range`);
        break;
      }
    } catch (error) {
      console.error(`[fetchHistory] Batch ${i + 1} error:`, error);
      // Continue with what we have
      break;
    }
  }

  console.log(`[fetchHistory] Batching complete: ${allHistoryItems.length} unique items collected`);
  return { historyItems: allHistoryItems.slice(0, targetMaxResults) };
}

// Query history - fetches from Chrome API and returns entries
// All filtering/processing is done on the backend
async function queryHistory(params = {}) {
  const preferences = await getUserPreferences();
  const userMaxResults = preferences.maxResults;

  const {
    startTime,
    endTime,
    maxResults
  } = params;

  const finalMaxResults = maxResults || userMaxResults;

  // Fetch history from Chrome API
  const { historyItems } = await fetchHistory({ startTime, endTime, maxResults: finalMaxResults });

  console.log(`[queryHistory] Fetched ${historyItems.length} history items from Chrome API`);

  // Convert to standard format, filtering out invalid entries
  const entries = historyItems
    .map(item => {
      const lastVisitTime = (item.lastVisitTime && item.lastVisitTime > 0)
        ? item.lastVisitTime
        : null;

      if (!lastVisitTime || !item.url) {
        return null;
      }

      return {
        url: item.url,
        title: item.title || '',
        visit_count: item.visitCount || 0,
        last_visit_time: lastVisitTime
      };
    })
    .filter(entry => entry !== null)
    .sort((a, b) => b.last_visit_time - a.last_visit_time);

  console.log(`[queryHistory] Returning ${entries.length} valid entries`);
  return { entries };
}

// Chat with history - uses backend or direct OpenAI based on API key presence
async function chatWithHistory(params = {}) {
  const {
    message,
    conversationMessages = [],
    maxResults
  } = params;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new Error('Message is required');
  }

  // Check if user has provided their own API key
  const apiKeyResult = await chrome.storage.local.get(['openai_api_key']);
  const hasApiKey = !!(apiKeyResult.openai_api_key && apiKeyResult.openai_api_key.length > 0);

  if (hasApiKey) {
    console.log('[chatWithHistory] Using Direct OpenAI mode (user provided API key)');
    return await chatWithOpenAI(message, conversationMessages, apiKeyResult.openai_api_key, maxResults);
  } else {
    console.log('[chatWithHistory] Using Backend mode (no API key provided)');
    return await chatWithBackend(message, conversationMessages, maxResults);
  }
}

// Chat with OpenAI directly using user's API key
async function chatWithOpenAI(message, conversationMessages = [], apiKey, maxResultsOverride) {
  console.log('[chatWithOpenAI] Starting direct OpenAI call with user API key');
  
  // Fetch browsing history
  const preferences = await getUserPreferences();
  const historyRangeDays = preferences.historyRangeDays || 365;
  const preferredMaxResults = preferences.maxResults || 100000;
  const maxResults = Math.min(maxResultsOverride || preferredMaxResults, 100000);

  console.log('[chatWithOpenAI] Fetching history...', { historyRangeDays, maxResults });

  let historyItems;
  try {
    const result = await fetchHistory({ maxResults });
    historyItems = result.historyItems;
    console.log('[chatWithOpenAI] Fetched', historyItems?.length || 0, 'history items');
  } catch (fetchError) {
    console.error('[chatWithOpenAI] Error fetching history:', fetchError);
    historyItems = [];
  }

  // Convert to simplified format
  const history = historyItems
    .map(item => ({
      url: item.url,
      title: item.title || '',
      visit_count: item.visitCount || 0,
      last_visit_time: item.lastVisitTime
    }))
    .filter(entry => entry.url && entry.last_visit_time);

  console.log('[chatWithOpenAI] Processed', history.length, 'valid history entries');

  // Build messages for OpenAI
  const messages = [
    {
      role: 'system',
      content: `You are a helpful assistant that analyzes browsing history and answers questions about it. The user has provided ${history.length} browsing history entries. Use this information to answer their questions accurately and helpfully.`
    }
  ];

  // Add conversation history if available
  if (conversationMessages && conversationMessages.length > 0) {
    messages.push(...conversationMessages);
  } else {
    // Add the current message if no conversation history
    messages.push({
      role: 'user',
      content: message
    });
  }

  // Add history data to the last user message
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role === 'user' && history.length > 0) {
    // Create a condensed history summary to avoid token limits
    const historyText = history.slice(0, 1000).map(entry => 
      `${entry.title || 'Untitled'} - ${entry.url}`
    ).join('\n');
    
    lastMessage.content = `${lastMessage.content}\n\nBrowsing History:\n${historyText}`;
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
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content;

    if (!reply) {
      throw new Error('No response from OpenAI');
    }

    console.log('[chatWithOpenAI] Successfully received response from OpenAI');
    return { reply };

  } catch (error) {
    console.error('[chatWithOpenAI] Error calling OpenAI:', error);
    throw new Error(`Failed to call OpenAI: ${error.message}`);
  }
}

// Chat with backend using WebSocket (no API key required)
async function chatWithBackend(message, conversationMessages = [], maxResultsOverride) {
  // Validate message (deprecated when using conversationMessages, but keep for compatibility)
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    // Only throw error if no conversation messages provided either
    if (!conversationMessages || conversationMessages.length === 0) {
      throw new Error('Message is required and must be a non-empty string');
    }
  }

  // Check if we have history permission
  const hasHistoryPermission = await new Promise((resolve) => {
    chrome.permissions.contains({ permissions: ['history'] }, (result) => {
      console.log('[chatWithBackend] History permission check:', result);
      resolve(result);
    });
  });

  if (!hasHistoryPermission) {
    console.error('[chatWithBackend] ERROR: History permission not granted!');
    console.error('[chatWithBackend] Please enable the history permission in chrome://extensions');
  }

  // Fetch ALL browsing history directly from Chrome API
  // All history records are transmitted to the websocket backend for processing
  console.log('[chatWithBackend] Fetching ALL browsing history from Chrome API...');
  const preferences = await getUserPreferences();
  const historyRangeDays = preferences.historyRangeDays || 365;
  const preferredMaxResults = preferences.maxResults || 100000;
  const maxResults = Math.min(maxResultsOverride || preferredMaxResults, 100000);

  console.log('[chatWithBackend] User preferences:', { historyRangeDays, maxResults: preferences.maxResults });
  console.log('[chatWithBackend] Using maxResults for backend transmission:', maxResults);

  // IMPORTANT: Don't pass date restrictions when fetching all history
  // Chrome's history.search API often returns 0 results when date restrictions are used with empty text
  // We'll fetch all available history and filter by date range later if needed
  console.log('[chatWithBackend] Fetching ALL history without date restrictions (Chrome API workaround)');
  console.log('[chatWithBackend] Note: User preference historyRangeDays will be used for display/filtering, not API query');

  // Fetch all history (up to 100,000 records) directly from Chrome API
  // Intentionally NOT passing startTime/endTime to avoid Chrome API returning 0 results
  let historyItems;
  try {
    const result = await fetchHistory({
      maxResults: maxResults
      // Intentionally omitting startTime/endTime - Chrome API works better without date restrictions
    });
    historyItems = result.historyItems;
    console.log('[chatWithBackend] fetchHistory returned', historyItems?.length || 0, 'items');
  } catch (fetchError) {
    console.error('[chatWithBackend] ERROR in fetchHistory:', fetchError);
    console.error('[chatWithBackend] fetchError details:', {
      message: fetchError.message,
      stack: fetchError.stack,
      name: fetchError.name
    });
    historyItems = [];
  }
  
  console.log(`[chatWithBackend] Fetched ${historyItems.length} history items from Chrome API`);

  // Convert Chrome API format to backend format
  // Chrome's lastVisitTime is in MICROSECONDS since epoch, but we need to keep it as-is
  // (backend expects the raw timestamp value)
  let skippedCount = 0;
  let skippedReasons = { invalidTime: 0, emptyUrl: 0, both: 0 };
  
  let history = historyItems
    .map(item => {
      // Ensure visit_count is a valid integer
      let visitCount = 0;
      if (item.visitCount !== undefined && item.visitCount !== null) {
        const count = Number(item.visitCount);
        visitCount = isNaN(count) ? 0 : Math.floor(Math.max(0, count));
      }

      // Chrome's lastVisitTime is in microseconds since epoch
      // We need to keep it as a number (not convert to milliseconds)
      let lastVisitTime = 0;
      if (item.lastVisitTime !== undefined && item.lastVisitTime !== null) {
        const time = Number(item.lastVisitTime);
        // Chrome timestamps are in microseconds, which are very large numbers
        // Accept any positive finite number
        if (isNaN(time) || !isFinite(time) || time <= 0) {
          skippedCount++;
          skippedReasons.invalidTime++;
          return null;
        }
        lastVisitTime = time; // Keep as-is (microseconds)
      } else {
        skippedCount++;
        skippedReasons.invalidTime++;
        return null;
      }

      // Skip entries with empty URLs
      if (!item.url || typeof item.url !== 'string' || item.url.trim().length === 0) {
        skippedCount++;
        skippedReasons.emptyUrl++;
        return null;
      }

      return {
        url: String(item.url),
        title: String(item.title || ''),
        visit_count: visitCount,
        last_visit_time: lastVisitTime
      };
    })
    .filter(entry => entry !== null); // Remove null entries
  
  console.log(`[chatWithBackend] Processing ${history.length} valid history entries (all browsing history will be transmitted)`);
  console.log(`[chatWithBackend] Skipped ${skippedCount} invalid entries:`, skippedReasons);
  console.log(`[chatWithBackend] Raw history items from Chrome API: ${historyItems.length}`);
  console.log(`[chatWithBackend] Valid entries after filtering: ${history.length}`);
  
  if (history.length === 0) {
    console.warn(`[chatWithBackend] WARNING: No history entries to send! This might be because:`);
    console.warn(`[chatWithBackend] - No browsing history exists in the specified time range (${historyRangeDays} days)`);
    console.warn(`[chatWithBackend] - All history entries were filtered out (invalid timestamps or URLs)`);
    console.warn(`[chatWithBackend] - Chrome history API returned no results`);
    console.warn(`[chatWithBackend] Raw history items from Chrome: ${historyItems.length}`);
    console.warn(`[chatWithBackend] Skipped entries breakdown:`, skippedReasons);
    
    // Log sample of raw items to help debug filtering issues
    if (historyItems.length > 0) {
      console.warn(`[chatWithBackend] Sample raw history item:`, {
        url: historyItems[0].url,
        title: historyItems[0].title,
        lastVisitTime: historyItems[0].lastVisitTime,
        visitCount: historyItems[0].visitCount,
        lastVisitTimeType: typeof historyItems[0].lastVisitTime,
        lastVisitTimeValue: historyItems[0].lastVisitTime
      });
    }
  }

  return new Promise((resolve, reject) => {
    console.log(`[chatWithBackend] Connecting to WebSocket: ${BACKEND_WS_URL}`);
    console.log(`[chatWithBackend] History entries to send: ${history.length}`);
    console.log(`[chatWithBackend] Conversation messages: ${conversationMessages.length}`);
    const ws = new WebSocket(BACKEND_WS_URL);
    let isResolved = false;
    let isConnected = false;
    let batchesToSend = [];
    let currentBatchIndex = 0;
    let totalBatchesAcknowledged = 0;
    let historyUploadCompleteSent = false;
    let historyUploadCompleteAcknowledged = false;
    let chatMessageSent = false;

    // Prepare batches
    const BATCH_SIZE = 500;
    if (history.length > 0) {
      const totalBatches = Math.ceil(history.length / BATCH_SIZE);
      console.log(`[chatWithBackend] Preparing ${totalBatches} batches from ${history.length} history entries (batch size: ${BATCH_SIZE})`);
      for (let i = 0; i < history.length; i += BATCH_SIZE) {
        const batch = history.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        batchesToSend.push({
          type: 'history_batch',
          history: batch,
          batchNumber: batchNumber,
          totalBatches: totalBatches
        });
        console.log(`[chatWithBackend] Prepared batch ${batchNumber}/${totalBatches} with ${batch.length} entries`);
      }
      console.log(`[chatWithBackend] ✓ Successfully prepared ${batchesToSend.length} history batches`);
    } else {
      console.warn(`[chatWithBackend] ⚠️ No history batches prepared (history array is empty)`);
      console.warn(`[chatWithBackend] This means no history will be sent to the backend!`);
    }

    // Set timeout for connection
    // Increased timeout to handle large history datasets (up to 100,000 records)
    // With 500 records per batch, that's up to 200 batches, so we need more time
    const timeout = setTimeout(() => {
      if (!isResolved) {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }
    }, 300000); // 5 minute timeout (increased for large batch processing)

    // Function to send next batch
    function sendNextBatch() {
      if (currentBatchIndex >= batchesToSend.length) {
        // All batches have been sent, but don't send chat message yet
        // Wait for acknowledgments - chat message will be sent when all are acknowledged
        console.log(`[chatWithBackend] All batches sent (${currentBatchIndex}/${batchesToSend.length}), waiting for acknowledgments...`);
        return;
      }

      // Check WebSocket readyState before sending
      if (ws.readyState !== WebSocket.OPEN) {
        console.error(`[chatWithBackend] WebSocket not ready! readyState: ${ws.readyState} (OPEN=1, CONNECTING=0, CLOSING=2, CLOSED=3)`);
        // Retry after a short delay
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            sendNextBatch();
          } else {
            console.error(`[chatWithBackend] WebSocket still not ready after retry, readyState: ${ws.readyState}`);
            reject(new Error('WebSocket connection not ready for sending batches'));
          }
        }, 100);
        return;
      }

      const batch = batchesToSend[currentBatchIndex];
      console.log(`[chatWithBackend] Sending history batch ${batch.batchNumber}/${batch.totalBatches} (${batch.history.length} entries)`);
      try {
        const batchJson = JSON.stringify(batch);
        console.log(`[chatWithBackend] Batch JSON size: ${batchJson.length} bytes`);
        ws.send(batchJson);
        currentBatchIndex++;
        console.log(`[chatWithBackend] Batch ${batch.batchNumber} sent successfully (${currentBatchIndex}/${batchesToSend.length} batches sent)`);
      } catch (error) {
        console.error(`[chatWithBackend] Error sending batch ${batch.batchNumber}:`, error);
        console.error(`[chatWithBackend] WebSocket readyState at error: ${ws.readyState}`);
        reject(error);
      }
    }

    ws.onopen = () => {
      console.log('[chatWithBackend] WebSocket connected, waiting for server welcome message...');
      // Set a timeout to start sending batches if 'connected' message isn't received
      // This handles cases where the message might be lost or delayed
      setTimeout(() => {
        if (!isConnected && batchesToSend.length > 0 && currentBatchIndex === 0) {
          console.warn('[chatWithBackend] WARNING: Did not receive "connected" message, but WebSocket is open. Starting to send batches anyway...');
          isConnected = true;
          sendNextBatch();
        }
      }, 1000); // Wait 1 second for 'connected' message
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`[chatWithBackend] Received message type: ${data.type}`);

        // Handle different message types
        if (data.type === 'connected') {
          console.log('[chatWithBackend] Connection acknowledged:', data.message);
          console.log(`[chatWithBackend] WebSocket readyState: ${ws.readyState}, Batches to send: ${batchesToSend.length}, History entries: ${history.length}`);
          isConnected = true;
          // Now that we're connected, start sending batches
          if (batchesToSend.length > 0) {
            console.log(`[chatWithBackend] Starting to send ${batchesToSend.length} history batches (${history.length} total entries)...`);
            // Verify WebSocket is ready before sending
            if (ws.readyState === WebSocket.OPEN) {
              sendNextBatch();
            } else {
              console.error(`[chatWithBackend] ERROR: WebSocket not OPEN when trying to send batches! readyState: ${ws.readyState}`);
              reject(new Error(`WebSocket not ready (state: ${ws.readyState})`));
            }
          } else {
            // No history to send, send history_upload_complete immediately
            console.warn(`[chatWithBackend] WARNING: No history batches to send! History length: ${history.length}, Batches prepared: ${batchesToSend.length}`);
            console.warn(`[chatWithBackend] This might indicate that history fetching/filtering resulted in 0 entries`);
            if (!historyUploadCompleteSent) {
              historyUploadCompleteSent = true;
              const uploadCompleteMessage = {
                type: 'history_upload_complete'
              };
              console.log(`[chatWithBackend] No history batches, sending history_upload_complete immediately`);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(uploadCompleteMessage));
              } else {
                console.error(`[chatWithBackend] ERROR: WebSocket not OPEN when trying to send history_upload_complete! readyState: ${ws.readyState}`);
                reject(new Error(`WebSocket not ready (state: ${ws.readyState})`));
              }
            }
          }
        } else if (data.type === 'history_batch_ack') {
          totalBatchesAcknowledged++;
          console.log(`[chatWithBackend] ✓ History batch acknowledged:`);
          console.log(`[chatWithBackend]   - Received: ${data.received} entries`);
          console.log(`[chatWithBackend]   - Total accumulated: ${data.total} entries`);
          console.log(`[chatWithBackend]   - Batches acknowledged: ${totalBatchesAcknowledged}/${batchesToSend.length}`);
          if (data.warning) {
            console.warn(`[chatWithBackend]   - Warning: ${data.warning}`);
          }
          
          // Check if all batches have been sent and acknowledged
          const allBatchesSent = currentBatchIndex >= batchesToSend.length;
          const allBatchesAcknowledged = totalBatchesAcknowledged >= batchesToSend.length;
          
          console.log(`[chatWithBackend] Batch status: sent=${allBatchesSent} (${currentBatchIndex}/${batchesToSend.length}), acknowledged=${allBatchesAcknowledged} (${totalBatchesAcknowledged}/${batchesToSend.length})`);
          
          // Send next batch if there are more to send
          if (!allBatchesSent) {
            // Small delay to prevent overwhelming the server
            console.log(`[chatWithBackend] Sending next batch in 10ms...`);
            setTimeout(() => {
              sendNextBatch();
            }, 10);
          } else {
            console.log(`[chatWithBackend] All batches have been sent, waiting for acknowledgments...`);
          }
          
          // Send history_upload_complete only after ALL batches are both sent AND acknowledged
          if (allBatchesSent && allBatchesAcknowledged && !historyUploadCompleteSent) {
            historyUploadCompleteSent = true;
            const uploadCompleteMessage = {
              type: 'history_upload_complete'
            };
            console.log(`[chatWithBackend] ✓ All ${batchesToSend.length} batches sent and acknowledged!`);
            console.log(`[chatWithBackend] Sending history_upload_complete signal...`);
            ws.send(JSON.stringify(uploadCompleteMessage));
          }
        } else if (data.type === 'history_upload_complete_ack') {
          // History upload complete acknowledged, now we can send the chat message
          console.log(`[chatWithBackend] ✓ History upload complete acknowledged:`);
          console.log(`[chatWithBackend]   - Total history entries: ${data.totalHistoryEntries}`);
          console.log(`[chatWithBackend]   - Total history received: ${data.totalHistoryReceived}`);
          historyUploadCompleteAcknowledged = true;
          
          // Now send the chat message
          if (!chatMessageSent) {
            chatMessageSent = true;
            const chatMessage = {
              type: 'chat',
              message: String(message || '').trim(),
              messages: conversationMessages
            };
            console.log(`[chatWithBackend] Sending chat message now...`);
            console.log(`[chatWithBackend] Chat message:`, chatMessage);
            ws.send(JSON.stringify(chatMessage));
          }
        } else if (data.type === 'chat_queued') {
          // Chat request was queued because history upload wasn't complete
          console.log(`[chatWithBackend] Chat request queued: ${data.message}`);
          console.log(`[chatWithBackend] Waiting for history upload to complete...`);
        } else if (data.reply) {
          // Chat response received
          console.log('[chatWithBackend] Received chat reply');
          clearTimeout(timeout);
          ws.close();
          if (!isResolved) {
            isResolved = true;
            resolve({ reply: data.reply });
          }
        } else if (data.error) {
          // Error response
          console.error('[chatWithBackend] Error from backend:', data.error);
          clearTimeout(timeout);
          ws.close();
          if (!isResolved) {
            isResolved = true;
            reject(new Error(data.error));
          }
        }
      } catch (error) {
        console.error('[chatWithBackend] Error parsing message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[chatWithBackend] WebSocket error:', error);
      clearTimeout(timeout);
      if (!isResolved) {
        isResolved = true;
        reject(new Error('WebSocket connection error'));
      }
    };

    ws.onclose = (event) => {
      console.log(`[chatWithBackend] WebSocket closed: ${event.code} - ${event.reason}`);
      clearTimeout(timeout);
      if (!isResolved) {
        isResolved = true;
        reject(new Error('WebSocket closed before receiving response'));
      }
    };
  });
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

console.log('Service worker loaded');
