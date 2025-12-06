# Chromium History Chat Extension

A lightweight Chromium browser extension that enables users to chat with OpenAI's LLM about their browsing history. The extension uses Rust/WebAssembly for performance-critical data processing and provides a simple interface for users to query their browsing history using natural language.

## Features

- 🤖 Chat with OpenAI about your browsing history
- ⚡ High-performance history processing using Rust/WebAssembly
- 🔒 No API key required - backend handles AI requests
- 🎯 Smart history filtering and relevance scoring
- 💬 Intuitive chat interface
- ⚙️ Customizable privacy and history settings
- 🛡️ Built-in rate limiting to prevent abuse

## Tech Stack

### Frontend (Chrome Extension)
- **Rust** - Compiled to WebAssembly for high-performance data processing
- **WebAssembly (WASM)** - Near-native performance in the browser
- **Dart** - For Chrome extension APIs and UI logic (compiles to JavaScript)
- **Manifest V3** - Modern Chrome extension architecture

### Backend (Google Cloud)
- **Go** - Cloud Function for AI request handling
- **Google Cloud Functions** - Serverless backend deployment
- **OpenAI API (GPT-4o-mini)** - Natural language understanding and generation

## Prerequisites

Before building this extension, ensure you have the following installed:

- **Rust** (1.70 or later)
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```

- **wasm-pack** (for building Rust to WebAssembly)
  ```bash
  cargo install wasm-pack
  ```

- **Dart SDK** (3.0 or later)
  ```bash
  # macOS
  brew install dart

  # Windows
  choco install dart-sdk

  # Linux - see https://dart.dev/get-dart
  ```

- **Make** (optional, for using Makefile commands)

## Project Structure

```
chromium-history-extension/
├── backend/                 # Go Cloud Function backend
│   ├── main.go             # HTTP handler
│   ├── openai.go           # OpenAI client
│   ├── types.go            # Type definitions
│   ├── rate_limit.go       # Rate limiting
│   ├── go.mod              # Go dependencies
│   ├── deploy.sh           # Deployment script
│   ├── setup.sh            # Setup script
│   └── README.md           # Backend documentation
├── chromium-extension/      # Chrome extension
│   ├── rust/               # Rust/WASM module
│   │   ├── src/
│   │   │   └── lib.rs      # WASM entry point and history processing
│   │   └── Cargo.toml      # Rust dependencies
│   ├── dart/               # Dart source code
│   │   ├── lib/
│   │   │   ├── background/ # Service worker code
│   │   │   ├── popup/      # Popup UI code
│   │   │   ├── options/    # Options page code
│   │   │   └── shared/     # Shared utilities and services
│   │   └── pubspec.yaml    # Dart dependencies
│   ├── extension/          # Chrome extension files
│   │   ├── manifest.json   # Extension manifest (Manifest V3)
│   │   ├── popup/          # Popup HTML and CSS
│   │   ├── options/        # Options page HTML and CSS
│   │   ├── assets/         # Icons and resources
│   │   ├── lib/            # Compiled JavaScript (from Dart)
│   │   └── wasm/           # Compiled WebAssembly modules
│   ├── docs/               # Documentation
│   │   ├── prd.md          # Product Requirements Document
│   │   ├── tasks.md        # Development task list
│   │   └── backend-integration.md  # Backend integration guide
│   ├── build.sh            # Build script
│   ├── Makefile            # Make commands
│   └── README.md           # This file
```

## Building the Extension

### Quick Start

1. **Install dependencies:**
   ```bash
   make install
   ```

2. **Build the extension:**
   ```bash
   make build
   ```
   Or use the build script:
   ```bash
   ./build.sh
   ```

3. **Build only Rust/WASM:**
   ```bash
   make build-rust
   ```

4. **Build only Dart to JavaScript:**
   ```bash
   make build-dart
   ```

### Manual Build Steps

If you prefer to build manually:

1. **Build Rust to WebAssembly:**
   ```bash
   cd rust
   wasm-pack build --target web --out-dir ../extension/wasm --no-typescript
   cd ..
   ```

2. **Build Dart to JavaScript:**
   ```bash
   cd dart
   dart compile js -o ../extension/lib/popup.js lib/popup/popup.dart
   dart compile js -o ../extension/lib/options.js lib/options/options.dart
   dart compile js -o ../extension/background/service_worker.js lib/background/service_worker.dart
   cd ..
   ```

3. **Create extension icons:**
   - Create icons in sizes: 16x16, 48x48, 128x128 pixels
   - Save as PNG in `extension/assets/`
   - Or use placeholders during development

## Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`

2. Enable **Developer mode** (toggle in top right)

3. Click **Load unpacked**

4. Select the `extension` directory from this project

5. The extension icon should appear in your browser toolbar

## Configuration

### Backend Setup (Required)

Before using the extension, you need to deploy the backend Cloud Function:

1. See [Backend Deployment Guide](../backend/DEPLOYMENT_GUIDE.md) for complete instructions
2. Quick start:
   ```bash
   cd ../backend
   ./setup.sh    # Configure GCP project
   ./deploy.sh   # Deploy Cloud Function
   ```
3. Update the extension with your backend URL (see deployment guide)

### Extension Setup

1. Load the extension in Chrome (see "Loading the Extension" above)
2. Click the extension icon
3. Start chatting about your browsing history - no API key needed!

**Note**: The backend handles all AI requests. No user API key is required.

## Usage

### Basic Queries

- "What websites did I visit yesterday?"
- "Show me all the articles I read about AI"
- "What YouTube videos did I watch this week?"
- "Find that website about cooking I visited last month"

### Privacy Controls

The extension includes several privacy features:

- **Date Range Filter**: Limit history to recent days
- **Result Limits**: Control how much history is processed
- **Clear Chat History**: Remove all conversation history
- **Local Processing**: History is filtered locally using WebAssembly

## Development

### Running Tests

```bash
make test
```

Or run Rust tests directly:

```bash
cd rust && cargo test
```

### Cleaning Build Artifacts

```bash
make clean
```

### Development Tips

1. **Hot Reload**: After making changes, rebuild and click the refresh icon on `chrome://extensions/`

2. **Debugging**:
   - Popup: Right-click the extension icon → Inspect popup
   - Background: Click "Inspect views: service worker" on `chrome://extensions/`
   - Options: Right-click on options page → Inspect

3. **Logging**: Check the browser console for debug messages

## Architecture

### Data Flow

1. User enters a query in the popup
2. Query is sent to the service worker
3. Service worker fetches browser history using Chrome History API
4. History data is passed to WASM module for filtering and processing
5. Processed history and query are sent to the backend Cloud Function
6. Backend calls OpenAI API and returns the response
7. Response is displayed in the popup

### WebAssembly Module

The Rust/WASM module handles:
- History data filtering by date range
- Keyword matching and search
- Relevance scoring and sorting
- Data transformation for LLM context
- Efficient processing of large datasets

### Security

- No user API keys required - backend manages OpenAI credentials
- All API calls use HTTPS
- History data is processed client-side before sending to backend
- Backend includes IP-based rate limiting (10 req/min)
- OpenAI API key stored securely in Google Secret Manager
- No data is stored on backend - requests are stateless

## Troubleshooting

### Build Failures

**Error: wasm-pack not found**
```bash
cargo install wasm-pack
```

**Error: Dart not found**
```bash
# Install Dart SDK - see https://dart.dev/get-dart
```

**Error: Permission denied on build.sh**
```bash
chmod +x build.sh
```

### Extension Issues

**Extension not loading**
- Check that all required files exist in `extension/`
- Verify `manifest.json` is valid JSON
- Check browser console for errors

**API calls failing**
- Verify the backend URL in `extension/background/service_worker.js`
- Check backend is deployed: see [Backend Deployment Guide](../backend/DEPLOYMENT_GUIDE.md)
- Test backend directly with curl (see backend README)
- Check if you're hitting rate limits (10 req/min)

**History not showing**
- Grant history permission when prompted
- Check Chrome history settings
- Verify history data exists for your query period

## Roadmap

See `docs/tasks.md` for the complete development task list.

### Phase 1 ✅
- [x] Project structure setup
- [x] Rust/WASM initialization
- [x] Dart project setup
- [x] Chrome extension manifest
- [x] Build system

### Phase 2 🚧
- [ ] Complete WASM module implementation
- [ ] Implement Dart service layer
- [ ] Create UI components

### Future Features

- Support for multiple LLM providers
- Local LLM support (via WebGPU)
- History visualization and analytics
- Export and summarization features
- Advanced privacy filters

## Contributing

This project follows the specifications in `docs/prd.md` and `docs/tasks.md`.

When contributing:
1. Follow the existing code structure
2. Add tests for new features
3. Update documentation
4. Ensure the build passes

## License

[Add your license here]

## Privacy Policy

This extension:
- No user API keys required - backend manages credentials
- Processes browsing history locally using WebAssembly before sending to backend
- Sends processed history to Google Cloud Function backend
- Backend forwards requests to OpenAI API
- Does not store or log browsing history on the backend
- Backend is stateless - no data persistence
- All communication encrypted via HTTPS
- Rate limiting applied per IP address (10 requests/minute)

## Support

For issues, questions, or feature requests, please refer to:
- `docs/prd.md` - Product requirements
- `docs/tasks.md` - Development tasks
- GitHub Issues (if applicable)

---

Built with Rust 🦀 and WebAssembly 🕸️
