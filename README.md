# Chromium History Chat Extension

A lightweight Chromium browser extension that enables users to chat with OpenAI's LLM about their browsing history. The extension uses Rust/WebAssembly for performance-critical data processing and provides a simple interface for users to query their browsing history using natural language.

## Features

- 🤖 Chat with OpenAI about your browsing history
- ⚡ High-performance history processing using Rust/WebAssembly
- 🔒 Secure local storage of API keys
- 🎯 Smart history filtering and relevance scoring
- 💬 Intuitive chat interface
- ⚙️ Customizable privacy and history settings

## Tech Stack

- **Rust** - Compiled to WebAssembly for high-performance data processing
- **WebAssembly (WASM)** - Near-native performance in the browser
- **Dart** - For Chrome extension APIs and UI logic (compiles to JavaScript)
- **Manifest V3** - Modern Chrome extension architecture
- **OpenAI API** - Natural language understanding and generation

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
├── rust/                    # Rust/WASM module
│   ├── src/
│   │   └── lib.rs          # WASM entry point and history processing
│   └── Cargo.toml          # Rust dependencies
├── dart/                    # Dart source code
│   ├── lib/
│   │   ├── background/     # Service worker code
│   │   ├── popup/          # Popup UI code
│   │   ├── options/        # Options page code
│   │   └── shared/         # Shared utilities and services
│   └── pubspec.yaml        # Dart dependencies
├── extension/               # Chrome extension files
│   ├── manifest.json       # Extension manifest (Manifest V3)
│   ├── popup/              # Popup HTML and CSS
│   ├── options/            # Options page HTML and CSS
│   ├── assets/             # Icons and resources
│   ├── lib/                # Compiled JavaScript (from Dart)
│   └── wasm/               # Compiled WebAssembly modules
├── docs/                    # Documentation
│   ├── prd.md              # Product Requirements Document
│   └── tasks.md            # Development task list
├── build.sh                # Build script
├── Makefile                # Make commands
└── README.md               # This file
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

### Getting an OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (it starts with `sk-`)

### Setting up the Extension

1. Click the extension icon in your browser toolbar
2. Click "Set up API key" or navigate to Options
3. Paste your OpenAI API key
4. Save the settings
5. Start chatting about your browsing history!

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
5. Processed history is sent to OpenAI API with the user's query
6. OpenAI response is returned to the popup and displayed

### WebAssembly Module

The Rust/WASM module handles:
- History data filtering by date range
- Keyword matching and search
- Relevance scoring and sorting
- Data transformation for LLM context
- Efficient processing of large datasets

### Security

- API keys are stored in `chrome.storage.local` (encrypted at rest)
- All API calls use HTTPS
- History data is only processed client-side
- No data is sent to third parties (only to OpenAI via your API key)

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
- Verify your API key is correct
- Check your OpenAI account has credits
- Ensure you're not hitting rate limits

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
- Requires your own OpenAI API key
- Processes browsing history locally using WebAssembly
- Only sends data to OpenAI API (using your API key)
- Does not collect or share data with third parties
- Stores API keys securely in Chrome's local storage

## Support

For issues, questions, or feature requests, please refer to:
- `docs/prd.md` - Product requirements
- `docs/tasks.md` - Development tasks
- GitHub Issues (if applicable)

---

Built with Rust 🦀 and WebAssembly 🕸️
