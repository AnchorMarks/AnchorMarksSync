import { storage } from '../background/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
    const apiKeyInput = document.getElementById('api-key');
    const apiUrlInput = document.getElementById('api-url');
    const saveBtn = document.getElementById('save-btn');
    const clearBtn = document.getElementById('clear-data');

    // Load existing token
    const token = await storage.getAuthToken();
    if (token) {
        apiKeyInput.value = token;
    }

    // Load existing URL
    // We want to show the STORED one. If none stored, we might show placeholder or empty.
    // getApiBaseUrl returns default if empty, but we might want to differentiate for UI?
    // Let's just retrieve what's in storage raw.
    // Wait, getApiBaseUrl logic handles fallback. Let's just use getApiBaseUrl but maybe we want to know if it's default?
    // Simpler: Just get pure value from storage to fill input. If null, input is empty (using default).
    const storedUrl = await chrome.storage.local.get('apiBaseUrl'); // Direct access to check if set
    if (storedUrl.apiBaseUrl) {
        apiUrlInput.value = storedUrl.apiBaseUrl;
    }

    saveBtn.addEventListener('click', async () => {
        const newToken = apiKeyInput.value.trim();
        const newUrl = apiUrlInput.value.trim();

        await storage.setAuthToken(newToken);

        if (newUrl) {
            await storage.setApiBaseUrl(newUrl);
        } else {
            // If empty, maybe clear it to reset to default?
            await chrome.storage.local.remove('apiBaseUrl');
        }

        alert('Settings saved!');
    });

    clearBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear all sync data?')) {
            await storage.setLastSync(null);
            await storage.clearSyncQueue();
            alert('Data cleared.');
        }
    });
});
