# Task List: Chromium History Chat Extension

## Phase 1: Project Setup & Configuration

### 1.1 Project Structure Setup
- [ ] Create root project directory structure
- [ ] Create `rust/` directory for Rust/WASM module
- [ ] Create `dart/` directory for Dart/JavaScript bridge and UI
- [ ] Create `extension/` directory for Chrome extension files
- [ ] Create `extension/popup/` directory for popup UI
- [ ] Create `extension/options/` directory for options page
- [ ] Create `extension/background/` directory for service worker
- [ ] Create `extension/assets/` directory for icons and resources
- [ ] Create `extension/lib/` directory for compiled JavaScript
- [ ] Create `extension/wasm/` directory for compiled WebAssembly modules
- [ ] Create `docs/` directory (already exists)
- [ ] Create `.gitignore` file
- [ ] Create `README.md` with setup instructions

### 1.2 Rust/WASM Project Setup
- [ ] Initialize Rust project in `rust/` directory using `cargo init`
- [ ] Configure `Cargo.toml` for WebAssembly target
- [ ] Add `wasm-bindgen` dependency to `Cargo.toml`
- [ ] Add `wasm-pack` as build tool dependency
- [ ] Configure `wasm-pack` build settings in `Cargo.toml`
- [ ] Set up Rust target for `wasm32-unknown-unknown`
- [ ] Create `rust/src/lib.rs` as main WASM module entry point
- [ ] Configure `wasm-pack` output directory to `extension/wasm/`
- [ ] Set up build scripts for Rust to WASM compilation
- [ ] Test initial WASM compilation with `wasm-pack build`

### 1.3 Dart Project Setup
- [ ] Initialize Dart project in `dart/` directory
- [ ] Configure `pubspec.yaml` with project metadata
- [ ] Add `js` package dependency for JavaScript interop
- [ ] Add `http` package dependency for OpenAI API calls
- [ ] Configure Dart compilation target to JavaScript
- [ ] Set up build configuration for compiling Dart to JavaScript
- [ ] Configure output directory to `extension/lib/`
- [ ] Create `dart/lib/` directory for Dart source files
- [ ] Create `dart/lib/background/` for service worker code
- [ ] Create `dart/lib/popup/` for popup UI code
- [ ] Create `dart/lib/options/` for options page code
- [ ] Create `dart/lib/shared/` for shared utilities
- [ ] Test initial Dart to JavaScript compilation

### 1.4 Chrome Extension Manifest Setup
- [ ] Create `extension/manifest.json` file
- [ ] Configure manifest version 3
- [ ] Set extension name and description
- [ ] Set extension version number
- [ ] Configure required permissions: `history`, `storage`
- [ ] Declare background service worker script path
- [ ] Configure action popup HTML path
- [ ] Configure options page HTML path
- [ ] Add extension icons (16x16, 48x48, 128x128)
- [ ] Set content security policy for WASM execution
- [ ] Configure web accessible resources for WASM modules
- [ ] Validate manifest.json syntax

### 1.5 Build System Setup
- [ ] Create build script for Rust to WASM compilation
- [ ] Create build script for Dart to JavaScript compilation
- [ ] Create unified build script that runs both compilations
- [ ] Set up watch mode for development (optional)
- [ ] Configure build output directories
- [ ] Test complete build process end-to-end

## Phase 2: Rust/WASM Module Development

### 2.1 WASM Module Foundation
- [ ] Set up `wasm-bindgen` bindings in `rust/src/lib.rs`
- [ ] Create `HistoryEntry` struct in Rust
  - [ ] Define fields: `url`, `title`, `visit_count`, `last_visit_time`
  - [ ] Implement `Serialize` and `Deserialize` traits
  - [ ] Add conversion methods to/from JavaScript objects
- [ ] Create `HistoryQuery` struct for query parameters
  - [ ] Define fields: `text`, `start_time`, `end_time`, `max_results`
  - [ ] Implement validation methods
- [ ] Export Rust structs to JavaScript via `wasm-bindgen`
- [ ] Test basic WASM module loading in browser

### 2.2 History Data Processing
- [ ] Implement `filter_history_by_date_range()` function
  - [ ] Accept history entries and date range
  - [ ] Filter entries within date range
  - [ ] Return filtered results
- [ ] Implement `filter_history_by_keywords()` function
  - [ ] Accept history entries and keyword list
  - [ ] Match keywords against URL and title
  - [ ] Return matching entries
- [ ] Implement `sort_history_by_relevance()` function
  - [ ] Score entries based on visit count and recency
  - [ ] Sort by relevance score
  - [ ] Return sorted results
- [ ] Implement `limit_history_results()` function
  - [ ] Accept history entries and max count
  - [ ] Return limited subset
- [ ] Export all filtering functions to JavaScript

### 2.3 Query Matching & Relevance
- [ ] Implement `extract_keywords_from_query()` function
  - [ ] Parse natural language query
  - [ ] Extract meaningful keywords
  - [ ] Remove stop words
  - [ ] Return keyword list
- [ ] Implement `score_history_entry()` function
  - [ ] Calculate relevance score for entry
  - [ ] Consider keyword matches in URL/title
  - [ ] Consider visit count and recency
  - [ ] Return numerical score
- [ ] Implement `find_relevant_history()` function
  - [ ] Combine keyword extraction and scoring
  - [ ] Filter and sort history entries
  - [ ] Return top N relevant entries
- [ ] Add fuzzy matching for partial keyword matches
- [ ] Export query matching functions to JavaScript

### 2.4 Data Transformation for LLM
- [ ] Implement `format_history_for_llm()` function
  - [ ] Convert history entries to text format
  - [ ] Include URL, title, visit count, last visit time
  - [ ] Format dates in human-readable format
  - [ ] Limit total character count
- [ ] Implement `summarize_history()` function
  - [ ] Group entries by domain
  - [ ] Count visits per domain
  - [ ] Create summary statistics
  - [ ] Return formatted summary
- [ ] Implement `extract_domain_patterns()` function
  - [ ] Identify common domains
  - [ ] Group by domain patterns
  - [ ] Return pattern analysis
- [ ] Add token counting for LLM context limits
- [ ] Export transformation functions to JavaScript

### 2.5 Memory Management & Performance
- [ ] Optimize data structures for large history sets
- [ ] Implement efficient filtering algorithms
- [ ] Add memory cleanup for processed data
- [ ] Profile WASM module performance
- [ ] Optimize hot paths based on profiling
- [ ] Test with large history datasets (10,000+ entries)
- [ ] Ensure WASM module doesn't leak memory

### 2.6 WASM Module Testing
- [ ] Create Rust unit tests for filtering functions
- [ ] Create Rust unit tests for query matching
- [ ] Create Rust unit tests for data transformation
- [ ] Test WASM module in browser environment
- [ ] Test with various history data sizes
- [ ] Verify JavaScript interop works correctly

## Phase 3: Dart/JavaScript Bridge Layer

### 3.1 Chrome Extension API Wrappers
- [ ] Create `dart/lib/shared/chrome_history.dart`
  - [ ] Wrap `chrome.history.search()` API
  - [ ] Wrap `chrome.history.getVisits()` API
  - [ ] Create typed Dart interfaces for history data
  - [ ] Add error handling for API calls
- [ ] Create `dart/lib/shared/chrome_storage.dart`
  - [ ] Wrap `chrome.storage.local.get()` API
  - [ ] Wrap `chrome.storage.local.set()` API
  - [ ] Wrap `chrome.storage.local.remove()` API
  - [ ] Create typed storage interfaces
  - [ ] Add error handling for storage operations
- [ ] Create `dart/lib/shared/chrome_permissions.dart`
  - [ ] Wrap `chrome.permissions.contains()` API
  - [ ] Wrap `chrome.permissions.request()` API
  - [ ] Add permission checking utilities

### 3.2 WASM Module Integration
- [ ] Create `dart/lib/shared/wasm_bridge.dart`
  - [ ] Import WASM module using `js` package
  - [ ] Create Dart wrappers for WASM functions
  - [ ] Convert JavaScript objects to Dart types
  - [ ] Convert Dart types to JavaScript objects
  - [ ] Handle WASM module loading errors
  - [ ] Add WASM module initialization function
- [ ] Test WASM module loading in Dart
- [ ] Test data conversion between Dart and WASM
- [ ] Verify WASM function calls work correctly

### 3.3 History Data Management
- [ ] Create `dart/lib/shared/history_service.dart`
  - [ ] Implement `fetchHistory()` method
    - [ ] Call Chrome history API
    - [ ] Convert to Dart types
    - [ ] Return history entries
  - [ ] Implement `filterHistory()` method
    - [ ] Call WASM filtering functions
    - [ ] Handle filtering parameters
    - [ ] Return filtered results
  - [ ] Implement `searchHistory()` method
    - [ ] Use WASM query matching
    - [ ] Combine with Chrome API calls
    - [ ] Return relevant results
  - [ ] Add caching for frequently accessed history
  - [ ] Add error handling and logging

### 3.4 Storage Management
- [ ] Create `dart/lib/shared/storage_service.dart`
  - [ ] Implement `saveApiKey()` method
    - [ ] Store OpenAI API key securely
    - [ ] Validate key format
    - [ ] Handle storage errors
  - [ ] Implement `getApiKey()` method
    - [ ] Retrieve API key from storage
    - [ ] Return null if not set
    - [ ] Handle retrieval errors
  - ] Implement `clearApiKey()` method
    - [ ] Remove API key from storage
    - [ ] Confirm deletion
  - [ ] Implement `savePreferences()` method
    - [ ] Store user preferences
    - [ ] Handle preference updates
  - [ ] Implement `getPreferences()` method
    - [ ] Retrieve user preferences
    - [ ] Return default preferences if not set
  - [ ] Add storage validation and error handling

### 3.5 OpenAI API Integration
- [ ] Create `dart/lib/shared/openai_service.dart`
  - [ ] Implement `sendChatMessage()` method
    - [ ] Build Chat Completions API request
    - [ ] Include system prompt with history context
    - [ ] Include user message
    - [ ] Send HTTP request to OpenAI API
    - [ ] Handle response parsing
    - [ ] Return LLM response text
  - [ ] Implement `buildSystemPrompt()` method
    - [ ] Format history data for prompt
    - [ ] Include context about browsing history
    - [ ] Set response format expectations
  - [ ] Implement error handling for:
    - [ ] Authentication failures (401)
    - [ ] Rate limit errors (429)
    - [ ] API errors (500+)
    - [ ] Network errors
    - [ ] Timeout errors
  - [ ] Add retry logic for transient failures
  - [ ] Add request timeout configuration
  - [ ] Implement streaming response support (optional)

### 3.6 Shared Utilities
- [ ] Create `dart/lib/shared/date_utils.dart`
  - [ ] Implement date parsing functions
  - [ ] Implement date formatting functions
  - [ ] Implement date range calculations
  - [ ] Convert Chrome timestamp format
- [ ] Create `dart/lib/shared/error_utils.dart`
  - [ ] Define error types and messages
  - [ ] Create user-friendly error messages
  - [ ] Implement error logging
- [ ] Create `dart/lib/shared/validation.dart`
  - [ ] Implement API key validation
  - [ ] Implement query validation
  - [ ] Add input sanitization

## Phase 4: Background Service Worker

### 4.1 Service Worker Foundation
- [ ] Create `dart/lib/background/service_worker.dart`
- [ ] Set up service worker entry point
- [ ] Handle extension installation event
  - [ ] Request history permission
  - [ ] Initialize default settings
  - [ ] Show welcome message
- [ ] Handle extension startup
- [ ] Set up message passing infrastructure
  - [ ] Listen for messages from popup/options
  - [ ] Send responses back
  - [ ] Handle different message types

### 4.2 History Access in Service Worker
- [ ] Implement history fetching in service worker
- [ ] Handle history API calls
- [ ] Process history data using WASM module
- [ ] Cache history data appropriately
- [ ] Handle permission errors gracefully
- [ ] Add logging for debugging

### 4.3 Message Handling
- [ ] Define message types and interfaces
- [ ] Implement `handleHistoryQuery()` message handler
  - [ ] Receive query from UI
  - [ ] Fetch history data
  - [ ] Process with WASM
  - [ ] Return results
- [ ] Implement `handleOpenAICall()` message handler
  - [ ] Receive message and history context
  - [ ] Call OpenAI API
  - [ ] Return response
- [ ] Implement error message responses
- [ ] Add message validation

## Phase 5: Popup UI Development

### 5.1 Popup HTML Structure
- [ ] Create `extension/popup/popup.html`
- [ ] Add chat container div
- [ ] Add message history container
- [ ] Add input field for user queries
- [ ] Add send button
- [ ] Add loading indicator element
- [ ] Add error message container
- [ ] Link to compiled JavaScript file
- [ ] Link to CSS file

### 5.2 Popup Styling
- [ ] Create `extension/popup/popup.css`
- [ ] Style chat container (fixed height, scrollable)
- [ ] Style message bubbles (user vs. assistant)
- [ ] Style input field and send button
- [ ] Add loading spinner styles
- [ ] Add error message styles
- [ ] Ensure responsive design
- [ ] Add dark mode support (optional)
- [ ] Style scrollbar for message container

### 5.3 Popup Dart/JavaScript Logic
- [ ] Create `dart/lib/popup/popup.dart`
- [ ] Initialize popup on load
  - [ ] Check if API key is set
  - [ ] Show appropriate UI state
  - [ ] Load WASM module
  - [ ] Set up event listeners
- [ ] Implement chat message display
  - [ ] Create message bubble elements
  - [ ] Append messages to chat container
  - [ ] Auto-scroll to bottom on new messages
  - [ ] Format message timestamps
- [ ] Implement send message handler
  - [ ] Get user input
  - [ ] Validate input
  - [ ] Show loading state
  - [ ] Send message to background service worker
  - [ ] Display response
  - [ ] Handle errors
- [ ] Implement message history persistence
  - [ ] Save chat history to storage
  - [ ] Load chat history on popup open
  - [ ] Add clear chat history functionality
- [ ] Add keyboard shortcuts (Enter to send)
- [ ] Handle API key missing state
  - [ ] Show message prompting to set API key
  - [ ] Add link to options page

### 5.4 Popup State Management
- [ ] Track chat message history
- [ ] Track loading states
- [ ] Track error states
- [ ] Track API key status
- [ ] Implement state update functions
- [ ] Update UI based on state changes

## Phase 6: Options Page Development

### 6.1 Options Page HTML Structure
- [ ] Create `extension/options/options.html`
- [ ] Add API key input section
  - [ ] Input field (password type)
  - [ ] Save button
  - [ ] Clear button
  - [ ] Status indicator
- [ ] Add privacy controls section
  - [ ] Date range filter options
  - [ ] History limit settings
- [ ] Add chat history section
  - [ ] Clear chat history button
- [ ] Add about/info section
- [ ] Link to compiled JavaScript file
- [ ] Link to CSS file

### 6.2 Options Page Styling
- [ ] Create `extension/options/options.css`
- [ ] Style form sections
- [ ] Style input fields and buttons
- [ ] Style status indicators
- [ ] Add visual feedback for saved settings
- [ ] Ensure responsive design
- [ ] Add dark mode support (optional)

### 6.3 Options Page Dart/JavaScript Logic
- [ ] Create `dart/lib/options/options.dart`
- [ ] Initialize options page on load
  - [ ] Load current API key (masked)
  - [ ] Load current preferences
  - [ ] Populate form fields
  - [ ] Set up event listeners
- [ ] Implement API key management
  - [ ] Handle API key input
  - [ ] Validate API key format
  - [ ] Save API key to storage
  - [ ] Show success/error feedback
  - [ ] Handle API key clearing
  - [ ] Test API key with OpenAI API (optional)
- [ ] Implement preferences management
  - [ ] Save date range preferences
  - [ ] Save history limit preferences
  - [ ] Load and apply preferences
- [ ] Implement chat history clearing
  - [ ] Confirm before clearing
  - [ ] Clear chat history from storage
  - [ ] Show confirmation message
- [ ] Add form validation
- [ ] Add auto-save functionality (optional)

## Phase 7: Integration & Communication

### 7.1 Popup-Background Communication
- [ ] Implement message passing from popup to background
- [ ] Define message protocol for history queries
- [ ] Define message protocol for OpenAI API calls
- [ ] Handle async message responses
- [ ] Add timeout handling for messages
- [ ] Test message passing reliability

### 7.2 Options-Background Communication
- [ ] Implement message passing from options to background
- [ ] Handle API key updates
- [ ] Handle preference updates
- [ ] Sync settings across extension components

### 7.3 WASM Module Loading
- [ ] Ensure WASM module loads in popup
- [ ] Ensure WASM module loads in options page
- [ ] Handle WASM loading errors
- [ ] Add loading state indicators
- [ ] Test WASM module in all contexts

### 7.4 End-to-End Data Flow
- [ ] Test complete flow: User query → History fetch → WASM processing → OpenAI API → Response display
- [ ] Verify data transformations at each step
- [ ] Test error handling throughout flow
- [ ] Verify performance with large history sets
- [ ] Test with various query types

## Phase 8: Error Handling & Edge Cases

### 8.1 API Error Handling
- [ ] Handle OpenAI API authentication errors
- [ ] Handle OpenAI API rate limit errors
- [ ] Handle OpenAI API server errors
- [ ] Handle network connectivity errors
- [ ] Display user-friendly error messages
- [ ] Add retry mechanisms where appropriate
- [ ] Log errors for debugging

### 8.2 Permission Error Handling
- [ ] Handle missing history permission
- [ ] Prompt user to grant permission
- [ ] Handle permission denial gracefully
- [ ] Show clear error messages
- [ ] Provide instructions for granting permission

### 8.3 Data Error Handling
- [ ] Handle empty history data
- [ ] Handle malformed history data
- [ ] Handle WASM processing errors
- [ ] Handle storage read/write errors
- [ ] Add data validation at each step

### 8.4 Edge Cases
- [ ] Test with very large history (10,000+ entries)
- [ ] Test with empty history
- [ ] Test with very long URLs/titles
- [ ] Test with special characters in queries
- [ ] Test with very long user queries
- [ ] Test with rapid successive queries
- [ ] Test with missing API key
- [ ] Test with invalid API key
- [ ] Test with network offline
- [ ] Test with slow network connection

## Phase 9: Security & Privacy

### 9.1 API Key Security
- [ ] Verify API key is stored in `chrome.storage.local` only
- [ ] Verify API key is never logged
- [ ] Verify API key is masked in UI
- [ ] Verify API key is only sent to OpenAI API
- [ ] Add API key validation before saving
- [ ] Test API key security measures

### 9.2 Data Privacy
- [ ] Verify history data is only processed client-side
- [ ] Verify history data is only sent to OpenAI (user's API)
- [ ] Verify no history data is stored persistently (unless user requests)
- [ ] Add option to clear chat history
- [ ] Document privacy implications clearly
- [ ] Test data privacy measures

### 9.3 Input Sanitization
- [ ] Sanitize user queries before processing
- [ ] Sanitize user queries before sending to OpenAI
- [ ] Prevent XSS in message display
- [ ] Validate all user inputs
- [ ] Test input sanitization

### 9.4 Content Security Policy
- [ ] Verify CSP allows WASM execution
- [ ] Verify CSP allows OpenAI API calls
- [ ] Verify CSP prevents inline scripts
- [ ] Test CSP compliance

## Phase 10: User Experience Enhancements

### 10.1 Loading States
- [ ] Add loading spinner for history fetch
- [ ] Add loading indicator for WASM processing
- [ ] Add typing indicator for OpenAI API calls
- [ ] Disable input during processing
- [ ] Show progress for long operations

### 10.2 Error Messages
- [ ] Create user-friendly error messages
- [ ] Add actionable error messages (what user can do)
- [ ] Style error messages consistently
- [ ] Add error message dismissal
- [ ] Test all error message scenarios

### 10.3 Success Feedback
- [ ] Show success indicators for saved settings
- [ ] Show confirmation for cleared data
- [ ] Add visual feedback for actions
- [ ] Test success feedback

### 10.4 Accessibility
- [ ] Add ARIA labels to interactive elements
- [ ] Ensure keyboard navigation works
- [ ] Ensure screen reader compatibility
- [ ] Test with accessibility tools
- [ ] Add focus indicators

### 10.5 Performance Optimization
- [ ] Optimize WASM module loading time
- [ ] Optimize history data processing
- [ ] Add debouncing for rapid inputs
- [ ] Optimize UI rendering
- [ ] Profile and optimize slow operations
- [ ] Test performance with large datasets

## Phase 11: Testing

### 11.1 Unit Testing
- [ ] Write Rust unit tests for WASM functions
- [ ] Write Dart unit tests for service classes
- [ ] Test data transformation functions
- [ ] Test error handling functions
- [ ] Achieve good test coverage

### 11.2 Integration Testing
- [ ] Test Chrome API integration
- [ ] Test WASM module integration
- [ ] Test OpenAI API integration
- [ ] Test storage operations
- [ ] Test message passing

### 11.3 Manual Testing
- [ ] Test extension installation
- [ ] Test permission requests
- [ ] Test popup functionality
- [ ] Test options page functionality
- [ ] Test various query types
- [ ] Test error scenarios
- [ ] Test with different history sizes
- [ ] Test on different Chrome versions
- [ ] Test on Chromium-based browsers

### 11.4 User Acceptance Testing
- [ ] Test all user stories from PRD
- [ ] Verify all core features work
- [ ] Test user workflows end-to-end
- [ ] Gather feedback on usability
- [ ] Fix issues found in testing

## Phase 12: Documentation

### 12.1 Code Documentation
- [ ] Add Rust doc comments to all public functions
- [ ] Add Dart doc comments to all public classes/functions
- [ ] Document WASM module API
- [ ] Document message passing protocol
- [ ] Document data structures

### 12.2 User Documentation
- [ ] Write installation instructions
- [ ] Write usage guide
- [ ] Document how to get OpenAI API key
- [ ] Document privacy policy
- [ ] Create FAQ section
- [ ] Add troubleshooting guide

### 12.3 Developer Documentation
- [ ] Document project structure
- [ ] Document build process
- [ ] Document architecture decisions
- [ ] Document extension APIs used
- [ ] Document dependencies
- [ ] Add contribution guidelines

## Phase 13: Build & Packaging

### 13.1 Build Configuration
- [ ] Finalize build scripts
- [ ] Configure production builds
- [ ] Optimize WASM module size
- [ ] Optimize JavaScript bundle size
- [ ] Minify CSS files
- [ ] Test production build

### 13.2 Extension Packaging
- [ ] Create extension icons (all required sizes)
- [ ] Prepare extension package
- [ ] Validate manifest.json
- [ ] Test packaged extension
- [ ] Verify all files are included
- [ ] Test extension installation from package

### 13.3 Pre-Release Checklist
- [ ] Verify all permissions are necessary
- [ ] Verify privacy policy is clear
- [ ] Verify error handling is comprehensive
- [ ] Verify security measures are in place
- [ ] Verify performance is acceptable
- [ ] Verify documentation is complete
- [ ] Test on multiple Chrome versions
- [ ] Test on Chromium-based browsers

## Phase 14: Release Preparation

### 14.1 Chrome Web Store Preparation
- [ ] Prepare extension description
- [ ] Prepare extension screenshots
- [ ] Prepare promotional images
- [ ] Write privacy policy
- [ ] Prepare store listing content
- [ ] Review Chrome Web Store policies
- [ ] Ensure compliance with policies

### 14.2 Version Management
- [ ] Set initial version number (0.1.0)
- [ ] Set up versioning scheme
- [ ] Create version changelog
- [ ] Tag release in version control

### 14.3 Final Testing
- [ ] Perform complete end-to-end test
- [ ] Test on clean Chrome installation
- [ ] Verify all features work
- [ ] Fix any last-minute issues
- [ ] Prepare for release

## Phase 15: Post-Release

### 15.1 Monitoring Setup
- [ ] Set up error logging (if applicable)
- [ ] Monitor user feedback
- [ ] Track error rates
- [ ] Monitor API usage patterns

### 15.2 Maintenance
- [ ] Plan for bug fixes
- [ ] Plan for feature updates
- [ ] Monitor Chrome API changes
- [ ] Update dependencies as needed
- [ ] Address user feedback

---

## Notes

- Tasks are organized by phase but can be worked on in parallel where dependencies allow
- Some tasks may need to be broken down further during implementation
- Testing should be ongoing throughout development, not just in Phase 11
- Documentation should be updated as code is written, not left until the end
- Security and privacy considerations should be addressed throughout development

