# Backend Integration Guide

## Overview

The Chromium History Extension now uses a Go-based Google Cloud Function backend to handle AI interactions. This eliminates the need for users to provide their own OpenAI API keys.

## Architecture Changes

### Before (Client-Side)
```
Chrome Extension → OpenAI API
                   (user's API key required)
```

### After (Server-Side)
```
Chrome Extension → Cloud Function Backend → OpenAI API
                   (no user API key needed)  (backend's API key)
```

## Key Benefits

1. **Better UX**: Users don't need to obtain or manage API keys
2. **Centralized Management**: Single API key to manage for all users
3. **Rate Limiting**: Built-in protection against abuse (10 req/min per IP)
4. **Cost Control**: Better ability to monitor and control OpenAI costs
5. **Security**: API key never exposed to client-side code

## Implementation Details

### Backend Components

**Location**: `/backend/`

- **main.go**: Cloud Function HTTP handler with CORS and rate limiting
- **openai.go**: OpenAI API client with GPT-4o-mini integration
- **types.go**: Request/response type definitions
- **rate_limit.go**: IP-based rate limiting middleware
- **deploy.sh**: Automated deployment script
- **setup.sh**: Initial GCP setup and configuration
- **config.sh**: Configuration variables (project, region, etc.)

### Frontend Changes

**Service Worker** (`chromium-extension/extension/background/service_worker.js`):
- Added `BACKEND_URL` constant (must be updated after deployment)
- Modified `chatWithHistory()` to call backend instead of OpenAI directly
- Removed API key requirement
- Updated error handling for backend responses
- **Enhanced to support up to 100,000 history records** (increased from 1,000)
- **Implemented smart pagination** to bypass Chrome API's 10,000-per-call limit
- Time-based batching with automatic deduplication

**Options Page** (`chromium-extension/extension/options/options.html`):
- Removed OpenAI API key input section
- Added backend connection status information
- Updated privacy notice to reflect backend usage

**Popup** (`chromium-extension/extension/popup/popup.html`):
- Updated warning message for connection issues

## Deployment Process

See [`/backend/DEPLOYMENT_GUIDE.md`](/backend/DEPLOYMENT_GUIDE.md) for complete deployment instructions.

### Quick Start

```bash
# 1. Deploy backend
cd backend
./setup.sh    # Configure GCP project
./deploy.sh   # Deploy Cloud Function

# 2. Update frontend
# Copy the function URL from deploy output
# Edit chromium-extension/extension/background/service_worker.js
# Update BACKEND_URL with your function URL

# 3. Rebuild extension
cd ../chromium-extension
make build
```

## History Capacity

### Large-Scale History Support

The extension now supports **up to 100,000 browsing history records**:

- **Frontend**: Smart batching algorithm to fetch 100k+ records from Chrome API
- **Backend**: WebSocket-based batching to handle large datasets efficiently
- **Memory Management**: Automatic threshold warnings and limits to prevent resource exhaustion

### How It Works

1. **Chrome API Batching**: Chrome's `history.search()` API has a hard limit of 10,000 results per call
2. **Time-Window Strategy**: Extension automatically divides the time range into multiple batches
3. **Deduplication**: Removes duplicate URLs and keeps the most recent visit data
4. **Efficient Transmission**: Sends history in batches over WebSocket to backend

### Configuration

Default user preferences (adjustable in options page):
- `historyRangeDays`: 365 days (1 year)
- `maxResults`: 100,000 records

Backend limits:
- `MAX_HISTORY_ENTRIES`: 100,000
- `HISTORY_MEMORY_WARNING_THRESHOLD`: 50,000

## API Specification

### Endpoint

**POST** `https://your-function-url.run.app`

### Request Format

```json
{
  "message": "What websites did I visit yesterday?",
  "history": [
    {
      "url": "https://example.com",
      "title": "Example Page",
      "visit_count": 5,
      "last_visit_time": 1702345678000
    }
  ]
}
```

**Note**: For large history datasets (>10,000 records), use WebSocket batching:

```json
{
  "type": "history_batch",
  "history": [ /* batch of up to 10,000 entries */ ]
}
```

### Response Format

**Success**:
```json
{
  "reply": "Based on your browsing history, you visited..."
}
```

**Error**:
```json
{
  "error": "Error message"
}
```

### Status Codes

- `200` - Success
- `400` - Bad Request
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

## Rate Limiting

**Current Settings**:
- 10 requests per minute per IP address
- Burst allowance: 5 requests
- Cleanup interval: 10 minutes

**Customization**: Edit `main.go` line:
```go
rateLimiter = NewRateLimiter(10.0/60.0, 5)
```

## Error Handling

The backend provides user-friendly error messages for common scenarios:

| Backend Error | User Message |
|---------------|--------------|
| Invalid JSON | "Invalid request format" |
| Missing message | "Message is required" |
| Rate limit hit | "Rate limit exceeded. Please try again later." |
| OpenAI API error | Specific OpenAI error message |
| No API key | "Backend not properly configured" |

## Security Considerations

### CORS Configuration

Currently allows all origins (`*`) for Chrome extension compatibility. For production, consider restricting:

```go
// In backend/main.go
w.Header().Set("Access-Control-Allow-Origin", "chrome-extension://YOUR_EXTENSION_ID")
```

### API Key Storage

**Recommended**: Use Google Secret Manager (set during `setup.sh`)

**Alternative**: Environment variable (less secure)

### Rate Limiting

Protects against abuse but can be bypassed with multiple IPs. For production, consider:
- Google Cloud Armor
- API Gateway with more sophisticated rate limiting
- User authentication

## Monitoring

### View Logs

```bash
# Real-time
gcloud functions logs read chromium-history-chat \
  --gen2 \
  --region=us-central1 \
  --follow

# Recent
gcloud functions logs read chromium-history-chat \
  --gen2 \
  --region=us-central1 \
  --limit=100
```

### Metrics to Monitor

- Request rate (invocations per second)
- Error rate
- Latency (execution time)
- Memory usage
- OpenAI API costs

## Cost Estimates

### Cloud Functions
- Free tier: 2M invocations/month
- After: $0.40 per 1M invocations
- Memory/CPU: ~$0.001 per request

### OpenAI API (GPT-4o-mini)
- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens
- ~$0.001-0.005 per request (varies with history size)

**Total**: ~$0.002-0.006 per request

For 10,000 requests/month: ~$20-60/month

## Troubleshooting

### Extension shows "Backend connection issue"

1. Verify `BACKEND_URL` in `service_worker.js`
2. Test backend directly: `curl -X POST $BACKEND_URL -H "Content-Type: application/json" -d '{"message":"test","history":[]}'`
3. Check function status: `gcloud functions describe chromium-history-chat --gen2 --region=us-central1`

### Backend returns 500 errors

1. Check logs: `gcloud functions logs read ...`
2. Verify OpenAI API key is set
3. Check OpenAI API status

### Rate limiting too strict

1. Edit `backend/main.go`
2. Increase rate limit: `NewRateLimiter(20.0/60.0, 10)`
3. Redeploy: `cd backend && ./deploy.sh`

## Development Workflow

### Making Backend Changes

```bash
cd backend
# Make your changes to *.go files
./deploy.sh  # Rebuilds and redeploys automatically
```

### Testing Locally

```bash
cd backend
export OPENAI_API_KEY="sk-..."
go run cmd/local/main.go  # Run locally on port 8080
```

### Making Frontend Changes

```bash
cd chromium-extension
# Edit files in extension/background/, etc.
make build
# Reload extension in chrome://extensions/
```

## Migration from Client-Side API Calls

For users migrating from the old client-side implementation:

1. **No user action required**: Old API keys in storage are simply ignored
2. **Backend handles everything**: Extension automatically uses backend
3. **Rate limits apply**: 10 requests/min vs unlimited before (with user's key)

## Future Enhancements

Potential improvements:

1. **User Authentication**: Add Google Sign-In for per-user rate limiting
2. **Usage Tracking**: Track costs per user
3. **Multiple Backends**: Load balancing across regions
4. **Caching**: Cache responses for identical queries
5. **Compression**: Reduce history payload size
6. **Websockets**: Real-time streaming responses
7. **Multiple Models**: Allow users to choose GPT model

## Related Documentation

- [Backend README](/backend/README.md) - Technical documentation
- [Deployment Guide](/backend/DEPLOYMENT_GUIDE.md) - Step-by-step deployment
- [PRD](/chromium-extension/docs/prd.md) - Product requirements
- [Main README](/chromium-extension/README.md) - Extension overview

## Support

For backend-related issues:
1. Check Cloud Function logs
2. Verify configuration in `backend/config.sh`
3. Test endpoint with curl
4. Review error messages in browser console

