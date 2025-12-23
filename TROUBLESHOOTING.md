# Troubleshooting AnchorMarks Sync

This guide provides steps to troubleshoot common issues with the AnchorMarks Sync extension.

## Accessing Logs

The extension uses a dedicated logger that prefixes messages with `[AnchorMarks]`. To view these logs:

1.  Open the **Extensions Management Page** in Chrome (`chrome://extensions`).
2.  Enable **Developer mode** in the top right corner.
3.  Find **AnchorMarks**.
4.  Click **service worker** next to "Inspect views". This opens the DevTools for the background script.
5.  Go to the **Console** tab.
6.  Filter by `[AnchorMarks]` to see relevant logs.

## Debugging Sync Issues

If bookmarks are not syncing:

1.  **Check Authentication**:
    The sync engine requires an Auth Token.
    - Open the Service Worker DevTools (see above).
    - Go to **Application** > **Storage** > **Local Storage**.
    - Verify `authToken` exists.

2.  **Force Sync**:
    - Open the extension popup.
    - If there is a manual sync button (or "Retry"), click it.
    - Watch the Service Worker console for `Starting sync cycle...` and `Sync cycle completed successfully`.

3.  **Check Sync Queue**:
    - In the Service Worker console, you can inspect the storage:
    ```javascript
    chrome.storage.local.get('syncQueue', (data) => console.log(data.syncQueue));
    ```
    - If the queue is stuck (items not clearing), there might be API errors.

4.  **Network Errors**:
    - In the Service Worker DevTools, go to the **Network** tab.
    - Trigger a sync.
    - Look for red (failed) requests to `/api/sync/pull` or `/api/sync/push`.
    - Check the response body for error details.

## Common Issues

### "SyntaxError: Unexpected token '<'"
**Cause**: The API URL is pointing to a web page instead of the API server.
**Solution**: This usually happens if you set the **API URL** to the frontend (e.g. `http://localhost:5173`) instead of the backend (e.g. `http://localhost:3000/api`).
- Go to the **Options** page.
- Change the **API URL** to your backend server URL (e.g., `http://localhost:3000/api`).

### "TypeError: Failed to fetch"
**Cause**: Network error or CORS issue.
**Solution**:
- Ensure your backend server is running.
- If using `localhost`, ensure you have reloaded the extension to apply the latest manifest permissions.

### "Error: API Error: 403 Forbidden"
**Cause**: The API Key is invalid or expired.
**Solution**:
- Go to the **Options** page.
- Clear the current API key and paste a valid one from your AnchorMarks dashboard.
- Save Settings.

### "Sync cycle failed"
Usually indicates a network error or invalid API key. Check the Console for the specific error message.

### "No API Key found, skipping sync"
The user is not logged in or the API key was not saved. Re-login via the Options page or Popup.
