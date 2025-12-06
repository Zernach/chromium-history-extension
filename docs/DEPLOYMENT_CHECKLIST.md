# Deployment Checklist

Use this checklist to deploy your Chromium History Extension backend and connect it to the frontend.

## Prerequisites

- [ ] Google Cloud Platform account created
- [ ] Billing enabled on GCP account
- [ ] `gcloud` CLI installed locally
- [ ] OpenAI API key obtained (from https://platform.openai.com/api-keys)
- [ ] Git repository cloned locally

## Step 1: Backend Setup (First Time Only)

- [ ] Open terminal and navigate to backend directory
  ```bash
  cd backend
  ```

- [ ] Make scripts executable (if not already)
  ```bash
  chmod +x setup.sh deploy.sh config.sh
  ```

- [ ] Run setup script
  ```bash
  ./setup.sh
  ```

- [ ] When prompted:
  - [ ] Enter your GCP Project ID (or create one)
  - [ ] Confirm billing is enabled
  - [ ] Choose to store OpenAI API key in Secret Manager (recommended)
  - [ ] Enter your OpenAI API key when prompted

- [ ] Wait for APIs to be enabled (takes ~1-2 minutes)

- [ ] Verify setup completed successfully

## Step 2: Deploy Backend

- [ ] Still in backend directory, run deploy script
  ```bash
  ./deploy.sh
  ```

- [ ] Wait for deployment to complete (takes ~2-5 minutes)

- [ ] **IMPORTANT**: Copy the Function URL from the output
  - It looks like: `https://chromium-history-chat-xxxxx-uc.a.run.app`
  - Also saved in `backend/function_url.txt`

- [ ] Test the backend endpoint
  ```bash
  curl -X POST [YOUR_FUNCTION_URL] \
    -H "Content-Type: application/json" \
    -d '{"message":"test","history":[]}'
  ```
  - [ ] Verify you get a response with `"reply":` field

## Step 3: Update Frontend

- [ ] Open the service worker file in your editor
  ```bash
  cd ../chromium-extension/extension/background
  # Open service_worker.js in your editor
  ```

- [ ] Find this line near the top (around line 10):
  ```javascript
  const BACKEND_URL = 'https://chromium-history-chat-xxxxx-uc.a.run.app';
  ```

- [ ] Replace the URL with your actual Function URL from Step 2

- [ ] Save the file

## Step 4: Rebuild Extension

- [ ] Navigate to extension directory
  ```bash
  cd ../../chromium-extension
  ```

- [ ] Build the extension
  ```bash
  make build
  # OR
  ./build.sh
  ```

- [ ] Verify build completed without errors

## Step 5: Load Extension in Chrome

- [ ] Open Chrome browser

- [ ] Navigate to `chrome://extensions/`

- [ ] Enable "Developer mode" (toggle in top right)

- [ ] Click "Load unpacked"

- [ ] Select the `chromium-extension/extension` directory

- [ ] Verify extension appears in the list

- [ ] Check for any errors in the extension card

## Step 6: Test End-to-End

- [ ] Click the extension icon in Chrome toolbar

- [ ] Grant history permission if prompted

- [ ] Type a test message in the chat (e.g., "What did I visit today?")

- [ ] Click Send

- [ ] Verify you receive a response from the AI

- [ ] Test a few more queries to ensure it's working

## Step 7: Verify Functionality

- [ ] Test with no history: "What did I visit?" → Should get appropriate response

- [ ] Test with actual browsing history

- [ ] Test rate limiting: Send 15 requests quickly
  - [ ] Verify you get "Rate limit exceeded" after ~10 requests

- [ ] Check extension options page
  - [ ] Verify backend connection status shows

- [ ] Check browser console for errors
  - [ ] Right-click extension icon → Inspect popup
  - [ ] Verify no error messages

## Step 8: Monitoring Setup (Recommended)

- [ ] Set up billing alerts in GCP
  - Go to: https://console.cloud.google.com/billing/alerts
  - Set alert at $10, $25, $50 (adjust as needed)

- [ ] Bookmark Cloud Function logs
  - Go to: https://console.cloud.google.com/functions
  - Click on `chromium-history-chat`
  - Click "Logs" tab

- [ ] Test log viewing
  ```bash
  gcloud functions logs read chromium-history-chat \
    --gen2 --region=us-central1 --limit=10
  ```

## Troubleshooting

### Backend Deployment Failed

- [ ] Check billing is enabled: https://console.cloud.google.com/billing
- [ ] Verify APIs are enabled: Run `./setup.sh` again
- [ ] Check error message in terminal
- [ ] Review deployment logs in GCP Console

### Extension Can't Connect to Backend

- [ ] Verify BACKEND_URL in service_worker.js matches deployed URL
- [ ] Test backend URL with curl command
- [ ] Check browser console for error messages
- [ ] Verify function is deployed: `gcloud functions describe chromium-history-chat`

### "Rate limit exceeded" Immediately

- [ ] This is expected after 10 requests in 1 minute
- [ ] Wait 1 minute and try again
- [ ] To increase limit, edit `backend/main.go` and redeploy

### AI Responses Are Slow

- [ ] This is normal - OpenAI API can take 3-10 seconds
- [ ] Check Cloud Function timeout (default 60s)
- [ ] Monitor function execution time in GCP Console

## Post-Deployment

- [ ] Document your Function URL for reference
- [ ] Share extension with test users (if applicable)
- [ ] Monitor costs in GCP Console
- [ ] Review logs periodically for errors
- [ ] Plan for scaling if usage increases

## Updating After Deployment

### Update Backend Code
```bash
cd backend
# Make changes to *.go files
./deploy.sh
```

### Update Frontend Code
```bash
cd chromium-extension
# Make changes
make build
# Reload extension in chrome://extensions/
```

## Cost Monitoring

- [ ] Check current costs: https://console.cloud.google.com/billing/reports
- [ ] Estimate: ~$0.002-0.006 per request
- [ ] Set budget alerts for your expected usage

## Security Review

- [ ] Verify OpenAI API key is in Secret Manager (not environment variable)
- [ ] Check CORS settings are appropriate for your use case
- [ ] Review rate limiting settings
- [ ] Ensure no sensitive data in logs

## Cleanup (If Needed)

To remove everything:

```bash
# Delete Cloud Function
gcloud functions delete chromium-history-chat --gen2 --region=us-central1

# Delete Secret
gcloud secrets delete openai-api-key

# Remove extension from Chrome
# Go to chrome://extensions/ and click "Remove"
```

## Resources

- [Backend README](backend/README.md)
- [Deployment Guide](backend/DEPLOYMENT_GUIDE.md)
- [Quick Reference](backend/QUICK_REFERENCE.md)
- [Integration Guide](chromium-extension/docs/backend-integration.md)
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md)

## Support Commands

```bash
# View logs
gcloud functions logs read chromium-history-chat --gen2 --region=us-central1 --follow

# Check function status
gcloud functions describe chromium-history-chat --gen2 --region=us-central1

# Test endpoint
curl -X POST [YOUR_URL] -H "Content-Type: application/json" -d '{"message":"test","history":[]}'
```

---

✅ Once all items are checked, your deployment is complete!

