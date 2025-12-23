import { storage } from './storage.js';
import { api } from './api.js';
import { DiffEngine } from './diff.js';
import { logger } from '../utils/logger.js';
import { SYNC_INTERVAL_MINUTES, SYNC_INTERVAL_ALARMS } from '../utils/constants.js';

export class SyncEngine {
    constructor() {
        this.isSyncing = false;
    }

    async start() {
        logger.info('SyncEngine starting...');

        // Clear any existing alarms to avoid duplicates on reload
        await chrome.alarms.clear(SYNC_INTERVAL_ALARMS);

        // Register alarm for periodic sync
        chrome.alarms.create(SYNC_INTERVAL_ALARMS, { periodInMinutes: SYNC_INTERVAL_MINUTES });
        chrome.alarms.onAlarm.addListener(this.handleAlarm.bind(this));

        // Initial sync
        this.sync();
    }

    async handleAlarm(alarm) {
        if (alarm.name === SYNC_INTERVAL_ALARMS) {
            await this.sync();
        }
    }

    async sync() {
        if (this.isSyncing) {
            logger.warn('Sync already in progress, skipping.');
            return;
        }

        // specific check: don't sync if no auth token (API Key)
        const token = await storage.getAuthToken();
        if (!token) {
            logger.debug('No API Key found, skipping sync.');
            return;
        }

        this.isSyncing = true;
        logger.info('Starting sync cycle...');

        try {
            await this.push();
            await this.pull();
            await storage.setLastSync(new Date().toISOString());
            logger.info('Sync cycle completed successfully.');
        } catch (error) {
            logger.error('Sync cycle failed:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    async pull() {
        logger.info('Pulling changes from server...');
        try {
            // GET /api/sync/pull
            const data = await api.get('/sync/pull');

            if (data) {
                await DiffEngine.applyServerChanges(data);
            }
        } catch (error) {
            logger.error('Pull failed:', error);
            throw error;
        }
    }

    async push() {
        logger.info('Pushing local changes to server...');
        const queue = await storage.getSyncQueue();
        if (queue.length === 0) return;

        // Process deletions individually (since sync/push is upsert)
        // Process creates/updates in batch

        const bookmarksToPush = [];
        const foldersToPush = [];
        const processedIds = new Set(); // deduplication within batch

        // We process the queue
        // Note: A more advanced implementation would coalesce changes (e.g. create + update = create with new data)
        // For now, we simple-scan.

        for (const item of queue) {
            if (item.type === 'delete') {
                try {
                    // Determine if it was a folder or bookmark to call right endpoint
                    // Since we might not know, we try bookmarks endpoint first? 
                    // Actually, API docs differentiate /api/folders/:id and /api/bookmarks/:id
                    // We need to know which one it is.
                    // Assuming 'item.data.url' exists, it's a bookmark.
                    const isFolder = !item.data.url;
                    const endpoint = isFolder ? `/folders/${item.id}` : `/bookmarks/${item.id}`;

                    await api.delete(endpoint);
                } catch (err) {
                    logger.warn(`Failed to delete item ${item.id}`, err);
                    // Continue, don't block other syncs
                }
            } else {
                // create or update
                // We only push the LATEST state if we can get it, but here we rely on the event data
                // or we could fetch the current node from valid chrome.bookmarks if it still exists.

                // Optimization: Fetch current node from browser to ensure we push latest state
                // avoiding sending stale data from queue.
                try {
                    const results = await chrome.bookmarks.get(item.id);
                    if (results && results[0]) {
                        const node = results[0];
                        if (node.url) {
                            bookmarksToPush.push({
                                id: node.id,
                                title: node.title,
                                url: node.url,
                                parent_id: node.parentId,
                                index: node.index
                            });
                        } else {
                            foldersToPush.push({
                                id: node.id,
                                name: node.title,
                                parent_id: node.parentId,
                                index: node.index
                            });
                        }
                    }
                } catch (e) {
                    // Bookmark might have been deleted since queued
                    logger.debug(`Skipping push for ${item.id}, not found in browser.`);
                }
            }
        }

        if (bookmarksToPush.length > 0 || foldersToPush.length > 0) {
            try {
                await api.post('/sync/push', {
                    bookmarks: bookmarksToPush,
                    folders: foldersToPush
                });
            } catch (error) {
                logger.error('Failed to push batch:', error);
                throw error; // Re-throw to prevent queue clearing if creating fails
            }
        }

        // Clear queue after successful processing
        // In a robust system, we'd only remove processed items. 
        // For MVP, we clear all assuming success.
        await storage.clearSyncQueue();
    }
}
