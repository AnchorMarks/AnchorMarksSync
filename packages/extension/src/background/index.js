import { SyncEngine } from './syncEngine.js';
import { storage } from './storage.js';
import { logger } from '../utils/logger.js';

const syncEngine = new SyncEngine();

// Initialize Sync Engine
chrome.runtime.onStartup.addListener(() => {
    syncEngine.start();
});

chrome.runtime.onInstalled.addListener(() => {
    syncEngine.start();
});

// Message listener for popup actions
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'FORCE_SYNC') {
        syncEngine.sync().then(() => {
            sendResponse({ status: 'done' });
        });
        return true; // keep channel open
    }
});

// Bookmark Event Listeners
// We need to be careful not to trigger these events when WE are modifying them via DiffEngine.
// A common pattern is to set a global flag or check a recently-modified list.
// For this starter code, we will just log and queue.

chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
    // If this was created by SyncEngine, we should ideally ignore it.
    // Implementation: Check if we are currently isSyncing (simple lock)
    if (syncEngine.isSyncing) {
        logger.debug('onCreated triggered by internal sync, ignoring.');
        return;
    }

    logger.info('Bookmark created:', id);
    await storage.addToSyncQueue({ type: 'create', id, data: bookmark, timestamp: Date.now() });
});

chrome.bookmarks.onChanged.addListener(async (id, changeInfo) => {
    if (syncEngine.isSyncing) return;

    logger.info('Bookmark changed:', id);
    await storage.addToSyncQueue({ type: 'update', id, data: changeInfo, timestamp: Date.now() });
});

chrome.bookmarks.onRemoved.addListener(async (id, removeInfo) => {
    if (syncEngine.isSyncing) return;

    logger.info('Bookmark removed:', id);
    await storage.addToSyncQueue({ type: 'delete', id, data: removeInfo, timestamp: Date.now() });
});

chrome.bookmarks.onMoved.addListener(async (id, moveInfo) => {
    if (syncEngine.isSyncing) return;

    // Treat move as an update (parent changed)
    logger.info('Bookmark moved:', id);
    // Fetch latest to get new parentUrl or structure
    const node = await chrome.bookmarks.get(id);
    if (node && node[0]) {
        await storage.addToSyncQueue({ type: 'update', id, data: node[0], timestamp: Date.now() });
    }
});
