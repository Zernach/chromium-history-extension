# Product Requirements Document: Chromium History Chat Extension

## Overview

A lightweight Chromium browser extension that enables users to chat with OpenAI's LLM about their browsing history. The extension requests permission to access browsing history and provides an interface for users to query and discuss their past web activity. Users must provide their own OpenAI API key to use the extension.

## Goals

1. Enable users to search and discuss their browsing history through natural language conversations
2. Provide a simple, intuitive interface for interacting with browsing history data
3. Maintain user privacy and data security
4. Minimize performance impact on browser operation

## User Stories

- As a user, I want to ask "What websites did I visit yesterday?" and get a natural language response
- As a user, I want to search my history by topic or content, not just by URL
- As a user, I want to understand patterns in my browsing behavior
- As a user, I want to find a specific page I visited but can't remember the exact URL
- As a user, I want to export or summarize my browsing history for personal records

## Core Features

### 1. History Permission Request
- Request `history` permission on installation
- Clear explanation of why the permission is needed
- Option to grant/deny permission with user-friendly messaging

### 2. Chat Interface
- Simple chat UI accessible via extension popup or dedicated page
- Text input for user queries
- Display LLM responses in a conversational format
- Support for follow-up questions and context-aware responses

### 3. History Data Access
- Read browsing history using Chrome History API
- Filter and process history data based on user queries
- Handle large history datasets efficiently

### 4. OpenAI Integration
- Connect to OpenAI API (Chat Completions endpoint)
- Require users to provide their own OpenAI API key
- Send relevant history context with user queries
- Receive and display natural language responses
- Handle API errors gracefully (authentication, rate limits, etc.)

## Technical Requirements

### Programming Languages & Technologies
- **Rust** - Primary language for performance-critical data processing
  - Compiles to WebAssembly (WASM) for browser execution
  - Strong type system and memory safety
  - Excellent performance for processing large history datasets
  - Used for history data filtering, processing, and query matching
- **WebAssembly (WASM)** - Compiled output from Rust
  - Near-native performance in the browser
  - Efficient processing of large history datasets
  - Secure sandboxed execution environment
- **Dart** - For Chrome extension APIs and UI logic
  - Compiles to JavaScript for Chrome extension compatibility
  - Chrome extension APIs (history, storage) accessed via Dart (compiled to JS)
  - Bridge between Rust/WebAssembly and Chrome APIs
  - UI event handling and OpenAI API communication
  - Strong type system and modern language features
- **HTML** - For popup and options page UI structure
- **CSS** - For styling the extension UI
- **JSON** - For manifest.json configuration file

**Architecture Note**: Rust code compiles to WebAssembly modules that are loaded and executed in the browser. Dart code compiles to JavaScript and acts as the bridge layer, calling into WASM modules for data processing while handling Chrome extension APIs directly.

### Permissions
- `history` - Required to access browsing history
- `storage` - Required for securely storing OpenAI API key and user preferences

### APIs Used
- `chrome.history` - Access browsing history
- `chrome.storage.local` - Secure local storage for OpenAI API key and preferences

### Architecture
- **Manifest V3** compliant
- Background service worker (Dart, compiled to JavaScript) for history access via Chrome APIs
- Rust/WebAssembly module for efficient history data processing
- Dart bridge layer (compiled to JavaScript) between Chrome APIs and WASM modules
- Popup or options page for chat interface (HTML/CSS/Dart compiled to JavaScript)
- OpenAI API integration layer (Chat Completions API) - Dart
- Secure API key storage using `chrome.storage.local`
- WASM module handles:
  - History data filtering and search
  - Query matching and relevance scoring
  - Data transformation before sending to OpenAI
  - Efficient processing of large history datasets

### Data Handling
- Process history data client-side using Rust/WebAssembly before sending to LLM
- Implement data filtering/privacy controls in WASM for performance
- Limit amount of history data sent per request
- Efficient memory management via Rust's ownership system
- No persistent storage of history data (unless user explicitly requests)
- WASM module optimizes data processing for large history datasets

## User Interface

### Extension Popup
- Chat input field
- Send button
- Message history display
- Loading states for API calls
- Error messages for failed requests

### Options Page (Required)
- OpenAI API key input field (masked for security)
- API key validation on save
- Clear indication when API key is set/not set
- Privacy controls
- History date range filters

## Security & Privacy

### Privacy Considerations
- All history data processing should be transparent to the user
- Option to clear chat history
- History data is sent to OpenAI API (user's own API key)
- Clear privacy policy regarding data usage
- User's OpenAI API key is stored locally and never transmitted except to OpenAI

### Security Requirements
- Secure storage of OpenAI API keys using `chrome.storage.local` (encrypted at rest)
- HTTPS-only communication with OpenAI API
- Input sanitization for user queries
- Handle OpenAI API rate limits and errors gracefully
- Clear error messages for authentication failures
- No API key transmission to any service other than OpenAI

## Success Metrics

- User adoption rate (installations)
- Permission grant rate
- Average number of queries per user
- User satisfaction with response quality
- Error rate for API calls

## Out of Scope (v1)

- Real-time history updates during chat
- History editing or deletion
- Integration with LLM providers other than OpenAI
- Advanced analytics or visualization
- Export functionality
- History search without LLM (traditional search)
- Default or shared API keys (users must provide their own)

## Future Considerations

- Support for different OpenAI models (GPT-3.5, GPT-4, etc.)
- Local LLM support (e.g., via WebGPU)
- History export/summarization features
- Customizable privacy filters
- History categorization and tagging
- Integration with bookmarks
- API usage tracking and cost estimation

