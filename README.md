# Chromium History Extension

A Chrome extension that lets you chat with AI about your browsing history. Features high-performance Rust/WebAssembly processing and a serverless Go backend.

## Project Overview

This project consists of two main components:

1. **Chrome Extension** - Client-side extension with Rust/WASM for data processing
2. **Backend** - Go-based Google Cloud Function for AI request handling

## Architecture

```
┌─────────────────────────────────────────────────┐
│           Chrome Extension                      │
│  ┌────────────┐     ┌──────────────┐          │
│  │   Popup    │────▶│Service Worker│          │
│  │   (UI)     │     │              │          │
│  └────────────┘     └──────┬───────┘          │
│                             │                   │
│                     ┌───────▼────────┐         │
│                     │  Rust/WASM     │         │
│                     │  (History      │         │
│                     │   Processing)  │         │
│                     └────────────────┘         │
└─────────────────────────┬───────────────────────┘
                          │ HTTPS
                          ▼
          ┌───────────────────────────┐
          │  Google Cloud Function    │
          │  (Go Backend)             │
          │  - Rate Limiting          │
          │  - API Key Management     │
          └───────────┬───────────────┘
                      │ HTTPS
                      ▼
          ┌───────────────────────────┐
          │  OpenAI API               │
          │  (GPT-4o-mini)            │
          └───────────────────────────┘
```

## Features

- 🤖 **AI Chat** - Natural language queries about your browsing history
- ⚡ **High Performance** - Rust/WebAssembly for fast data processing
- 🔒 **Secure** - No user API keys needed, backend handles credentials
- 🛡️ **Rate Limiting** - Built-in protection (10 req/min per IP)
- 🎯 **Smart Filtering** - Relevance scoring and keyword matching
- 💬 **Simple UI** - Clean, intuitive chat interface

## Quick Start

### 1. Deploy Backend (Required First)

```bash
cd backend
./setup.sh    # Configure GCP project and API key
./deploy.sh   # Deploy Cloud Function
# Note the function URL from output
```

See [Backend Deployment Guide](backend/DEPLOYMENT_GUIDE.md) for detailed instructions.

### 2. Build Extension

```bash
cd chromium-extension
# Update service_worker.js with your backend URL
make build
```

### 3. Load in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `chromium-extension/extension` directory

## Project Structure

```
chromium-history-extension/
├── backend/                     # Go Cloud Function
│   ├── main.go                 # HTTP handler
│   ├── openai.go               # OpenAI client
│   ├── types.go                # Type definitions
│   ├── rate_limit.go           # Rate limiting
│   ├── deploy.sh               # Deployment script
│   ├── setup.sh                # Setup script
│   ├── README.md               # Backend docs
│   ├── DEPLOYMENT_GUIDE.md     # Step-by-step deployment
│   └── QUICK_REFERENCE.md      # Command reference
│
└── chromium-extension/          # Chrome Extension
    ├── rust/                    # Rust/WASM module
    │   ├── src/lib.rs          # History processing
    │   └── Cargo.toml
    ├── dart/                    # Dart source (compiles to JS)
    │   └── lib/
    │       ├── background/      # Service worker
    │       ├── popup/           # Popup UI
    │       └── shared/          # Utilities
    ├── extension/               # Chrome extension files
    │   ├── manifest.json
    │   ├── popup/
    │   ├── options/
    │   └── wasm/               # Compiled WASM
    ├── docs/
    │   ├── prd.md              # Product requirements
    │   ├── tasks.md            # Development tasks
    │   └── backend-integration.md
    └── README.md               # Extension docs
```

## Tech Stack

### Frontend (Chrome Extension)
- **Rust** → WebAssembly for data processing
- **Dart** → JavaScript for Chrome APIs and UI
- **Manifest V3** for modern Chrome extension

### Backend (Google Cloud)
- **Go** for Cloud Function handler
- **Google Cloud Functions** (Gen 2) for serverless deployment
- **Google Secret Manager** for secure API key storage
- **OpenAI GPT-4o-mini** for AI responses

## Documentation

### Getting Started
- [Backend Deployment Guide](backend/DEPLOYMENT_GUIDE.md) - Complete deployment walkthrough
- [Backend Quick Reference](backend/QUICK_REFERENCE.md) - Essential commands
- [Extension README](chromium-extension/README.md) - Extension details

### Technical Details
- [Backend README](backend/README.md) - Backend architecture and API
- [Backend Integration Guide](chromium-extension/docs/backend-integration.md) - How frontend connects to backend
- [PRD](chromium-extension/docs/prd.md) - Product requirements

## Prerequisites

### For Backend Deployment
- Google Cloud Platform account with billing enabled
- `gcloud` CLI installed and configured
- OpenAI API key

### For Extension Development
- Rust 1.70+ and wasm-pack
- Dart SDK 3.0+
- Make (optional)

## Development Workflow

### Backend Changes

```bash
cd backend
# Make your changes
./deploy.sh  # Redeploys automatically
```

### Extension Changes

```bash
cd chromium-extension
# Make your changes
make build   # Rebuilds extension
# Reload in chrome://extensions/
```

## Key Commands

### Backend
```bash
# Deploy
cd backend && ./deploy.sh

# View logs
gcloud functions logs read chromium-history-chat --gen2 --region=us-central1 --follow

# Test endpoint
curl -X POST $BACKEND_URL -H "Content-Type: application/json" -d '{"message":"test","history":[]}'
```

### Extension
```bash
# Build
cd chromium-extension && make build

# Clean
make clean

# Test WASM
cd rust && cargo test
```

## Rate Limiting

**Current Settings**: 10 requests per minute per IP address, burst of 5

To modify, edit `backend/main.go`:
```go
rateLimiter = NewRateLimiter(10.0/60.0, 5)
```

## Cost Estimates

### Google Cloud Functions
- Free tier: 2M invocations/month
- After: $0.40 per 1M invocations
- Memory/CPU: ~$0.001 per request

### OpenAI API (GPT-4o-mini)
- ~$0.001-0.005 per request (varies with history size)

**Total**: ~$0.002-0.006 per request

For 10,000 requests/month: ~$20-60/month

## Security & Privacy

- ✅ No user API keys required
- ✅ Backend manages OpenAI credentials via Secret Manager
- ✅ IP-based rate limiting
- ✅ No data persistence on backend
- ✅ All communication over HTTPS
- ✅ History processed client-side before sending to backend
- ✅ CORS configured for extension origin

## Troubleshooting

### "Backend connection issue" in extension
1. Verify `BACKEND_URL` in `extension/background/service_worker.js`
2. Test backend: `curl -X POST $BACKEND_URL ...`
3. Check function is deployed: `gcloud functions describe chromium-history-chat`

### "Rate limit exceeded"
- Wait 1 minute between requests
- Or increase rate limit in `backend/main.go` and redeploy

### Backend returns 500 errors
1. Check logs: `gcloud functions logs read chromium-history-chat`
2. Verify OpenAI API key is set in Secret Manager
3. Check OpenAI API status

## Contributing

1. Follow existing code structure
2. Add tests for new features
3. Update documentation
4. Ensure build passes

## License

[Your license here]

## Support

- [Backend Documentation](backend/README.md)
- [Extension Documentation](chromium-extension/README.md)
- [Deployment Guide](backend/DEPLOYMENT_GUIDE.md)
- [Integration Guide](chromium-extension/docs/backend-integration.md)

---

Built with Rust 🦀, Go 🔵, and WebAssembly 🕸️


