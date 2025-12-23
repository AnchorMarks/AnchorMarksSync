import { storage } from '../background/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
    const loginBtn = document.getElementById('login-btn');
    const syncBtn = document.getElementById('sync-now-btn');
    const optionsLink = document.getElementById('open-options');
    const authSection = document.getElementById('auth-section');
    const syncSection = document.getElementById('sync-section');
    const lastSyncLabel = document.getElementById('last-sync');

    // Check auth state
    const token = await storage.getAuthToken();
    if (token) {
        authSection.classList.add('hidden');
        syncSection.classList.remove('hidden');
        updateLastSync();
    }

    loginBtn.addEventListener('click', () => {
        // Simulate login for prototype
        chrome.runtime.openOptionsPage();
    });

    syncBtn.addEventListener('click', () => {
        // Trigger sync via message to background
        chrome.runtime.sendMessage({ action: 'FORCE_SYNC' });
    });

    optionsLink.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    async function updateLastSync() {
        const ts = await storage.getLastSync();
        if (ts) {
            lastSyncLabel.textContent = new Date(ts).toLocaleString();
        }
    }
});
