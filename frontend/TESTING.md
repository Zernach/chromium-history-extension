# Testing Guide: Chromium History Chat Extension

## Prerequisites

Before testing, ensure you have:
- Google Chrome or Chromium-based browser (version 88+)
- An OpenAI API key (get one from https://platform.openai.com/api-keys)
- Some browsing history (the extension needs history data to work with)

## Loading the Extension

### Step 1: Build the Extension

First, build the WASM module if you haven't already:

```bash
# Option 1: Using the build script
./build.sh

# Option 2: Using make
make build

# Option 3: Manual build
wasm-pack build --target web --out-dir extension/wasm --no-typescript rust
```

### Step 2: Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`

2. Enable **Developer mode** (toggle in the top right corner)

3. Click **Load unpacked**

4. Select the `extension` directory from this project
   ```
   /path/to/chromium-history-extension/extension
   ```

5. The extension should now appear in your extensions list with a blue "H" icon

6. Pin the extension to your toolbar for easy access (click the puzzle icon, then pin)

### Step 3: Verify Installation

Check that:
- ✅ The extension appears in `chrome://extensions/`
- ✅ No errors are shown in the extension card
- ✅ The extension icon appears in your toolbar
- ✅ Clicking the icon opens a popup

## Initial Configuration

### Set Up Your OpenAI API Key

1. Click the extension icon in your toolbar
2. You should see a warning: "⚠️ OpenAI API key not set"
3. Click "Set up API key" or right-click the extension icon → Options
4. In the options page:
   - Paste your OpenAI API key (starts with `sk-`)
   - Click "Save API Key"
   - You should see "API key saved successfully!"

### Configure Privacy Settings (Optional)

In the options page, you can adjust:
- **History Date Range**: How many days of history to include (default: 30 days)
- **Maximum Results**: Maximum number of history entries to process (default: 100)

Click "Save Preferences" after making changes.

## Testing the Extension

### Test 1: Basic Query

1. Click the extension icon to open the popup
2. The warning about API key should be gone
3. The input field should be enabled
4. Try a simple query: "What websites did I visit today?"
5. Click "Send" or press Enter
6. You should see:
   - Your message appears in the chat
   - A loading indicator appears
   - The AI responds with information about your browsing history

### Test 2: Specific Search

Try more specific queries:
- "Show me all the YouTube videos I watched"
- "What did I search for on Google?"
- "What news articles did I read?"
- "When did I last visit GitHub?"

### Test 3: Pattern Recognition

Try queries that require understanding patterns:
- "What topics am I interested in?"
- "What websites do I visit most often?"
- "Summarize my browsing activity this week"

### Test 4: Empty Results

Try a query that shouldn't match your history:
- "Did I visit any cooking websites about French cuisine?"
  (assuming you didn't visit such sites)

The AI should respond that it couldn't find relevant information.

## Debugging

### Viewing Console Logs

1. **Service Worker Console**:
   - Go to `chrome://extensions/`
   - Find the extension
   - Click "Inspect views: service worker"
   - Check the console for logs

2. **Popup Console**:
   - Open the extension popup
   - Right-click anywhere in the popup → Inspect
   - Check the console for logs

3. **Options Page Console**:
   - Open the options page
   - Right-click → Inspect
   - Check the console for logs

### Common Issues and Solutions

#### Issue: "Extension could not be loaded"

**Possible causes:**
- manifest.json has syntax errors
- Required files are missing

**Solution:**
```bash
# Verify all files exist
find extension -type f

# Check manifest.json syntax
cat extension/manifest.json | json_pp  # or use a JSON validator
```

#### Issue: "API key not working"

**Symptoms:**
- Error message: "Invalid API key"
- HTTP 401 errors in service worker console

**Solution:**
1. Verify your API key is correct
2. Check it starts with `sk-`
3. Ensure you have credits in your OpenAI account
4. Try the key in OpenAI's playground first

#### Issue: "No history showing"

**Possible causes:**
- History permission not granted
- No history for the queried time period
- WASM module not loading

**Solution:**
1. Check permissions: `chrome://extensions/` → Extension details → Permissions
2. Grant history permission if not already granted
3. Check service worker console for WASM loading errors
4. Try a broader query: "What did I visit this month?"

#### Issue: "WASM module not loading"

**Symptoms:**
- Service worker console shows: "WASM module not initialized"
- Errors about import failures

**Solution:**
1. Verify WASM files exist:
   ```bash
   ls -l extension/wasm/
   ```
2. Rebuild the WASM module:
   ```bash
   make build-rust
   ```
3. Check CSP in manifest.json includes `'wasm-unsafe-eval'`
4. Reload the extension

#### Issue: "Service worker crashed"

**Solution:**
1. Go to `chrome://extensions/`
2. Click "Reload" on the extension card
3. Check service worker console for errors
4. Verify service_worker.js has no syntax errors

## Performance Testing

### Test with Large History

1. Set max results to 1000 in options
2. Try a broad query: "What did I visit this year?"
3. Monitor:
   - Response time (should be under 5 seconds)
   - Browser doesn't freeze
   - Extension remains responsive

### Test WASM Performance

Open service worker console and run:
```javascript
// Send test message
chrome.runtime.sendMessage({
  type: 'TEST_WASM'
}, (response) => {
  console.log('WASM test result:', response);
});
```

Expected output: `{ success: true, result: [...] }`

## Privacy Verification

### Verify Data Stays Local

1. Open service worker console
2. Open Network tab
3. Send a query
4. Verify only ONE external request is made: to `api.openai.com`
5. Check that history data is NOT sent anywhere else

### Verify API Key Security

1. Open options page
2. Save an API key
3. Reload the page
4. Verify the key is masked: `sk-abc***xyz`
5. Check storage:
   ```javascript
   chrome.storage.local.get(['openai_api_key'], (result) => {
     console.log('Stored (encrypted at rest):', result.openai_api_key);
   });
   ```

## Testing Settings Integration (December 2025 Update)

### Test 4.1: Settings View Navigation

1. Click the extension icon to open the popup
2. Click the gear icon in the header (top-right)
3. Verify:
   - Chat view disappears
   - Settings view appears
   - Back button appears (top-left, replacing New Chat button)
   - Header title changes to "Settings"
   - Settings button (gear) is hidden

### Test 4.2: Settings View Content

In the settings view, verify all sections are present:
1. **AI Access section**: Shows "Backend in use" message
2. **Privacy & History Settings**: 
   - History Date Range input (default: 5000 days)
   - Maximum Results input (default: 100000)
   - "Save Preferences" button
3. **Chat History section**: "Clear Chat History" button
4. **About section**: Shows extension version

### Test 4.3: Return to Chat View

1. From settings view, click the back button (top-left)
2. Verify:
   - Settings view disappears
   - Chat view reappears
   - Back button disappears
   - New Chat button reappears
   - Settings button (gear) reappears
   - Header title changes back to "Chat with History"
   - Previous chat messages are still visible

### Test 4.4: Settings Functionality

1. Navigate to settings view
2. Change "History Date Range" to 1000
3. Change "Maximum Results" to 50000
4. Click "Save Preferences"
5. Verify success message appears
6. Go back to chat and trigger a new query
7. Verify new preferences are applied

### Test 4.5: Clear Chat from Settings

1. Have some chat history in the chat view
2. Navigate to settings view
3. Click "Clear Chat History"
4. Confirm the dialog
5. Verify success message appears
6. Go back to chat view
7. Verify all previous messages are cleared

### Test 4.6: Settings Persistence

1. Configure preferences in settings
2. Close the popup completely
3. Reopen the popup
4. Navigate to settings
5. Verify saved preferences are still loaded

## Feature Testing Checklist

- [ ] Extension loads without errors
- [ ] Icons display correctly
- [ ] Popup opens and displays UI
- [ ] Settings view accessible via gear icon
- [ ] Back button returns to chat view
- [ ] Header title changes appropriately
- [ ] Settings form elements display correctly
- [ ] Settings scrollable if content is tall
- [ ] Chat messages display correctly
- [ ] User messages are stored
- [ ] AI responses appear
- [ ] Loading indicator shows during processing
- [ ] Error messages display for failures
- [ ] History permission is requested
- [ ] History can be fetched
- [ ] WASM module loads
- [ ] WASM filtering works
- [ ] Backend API integration works
- [ ] Chat history persists across popup opens
- [ ] Chat history persists across view switches
- [ ] Chat history can be cleared from settings
- [ ] Preferences can be saved from settings
- [ ] Extension version displays in settings
- [ ] Extension works after browser restart

## Edge Cases to Test

1. **Empty history**: Clear your browser history and try a query
2. **Very long query**: Send a 500+ character message
3. **Rapid queries**: Send multiple queries quickly
4. **Network offline**: Disable network and try a query
5. **Invalid API key**: Enter a fake key and test
6. **Rate limiting**: Send many requests to trigger OpenAI rate limit
7. **Special characters**: Query with emojis, unicode, special chars

## Automated Testing (Future)

For automated tests, consider:
- Rust unit tests: `cargo test` in the `rust/` directory
- Integration tests for Chrome APIs (using Puppeteer or similar)
- End-to-end tests for full user workflows

## Reporting Issues

When reporting issues, include:
1. Chrome version: `chrome://version/`
2. Extension version: Check manifest.json
3. Console logs from service worker, popup, or options
4. Steps to reproduce
5. Expected vs actual behavior
6. Screenshots if applicable

## Next Steps

After successful testing:
1. Review code in `extension/` directory
2. Add more advanced features (see `docs/tasks.md`)
3. Improve error handling
4. Enhance WASM module with more processing features
5. Consider publishing to Chrome Web Store

## Success Criteria

The extension is working correctly if:
- ✅ You can ask questions about your browsing history
- ✅ The AI provides relevant, accurate responses
- ✅ The extension is fast and responsive
- ✅ No errors appear in the console
- ✅ Your API key is kept secure
- ✅ The extension doesn't slow down your browser

Happy testing! 🚀
