import { STORAGE_KEYS, DEFAULT_API_BASE_URL } from '../utils/constants.js';

/**
 * Wrapper for chrome.storage.local to provide typed access and ease of use.
 */
export const storage = {
    async get(key) {
        const result = await chrome.storage.local.get(key);
        return result[key];
    },

    async set(key, value) {
        await chrome.storage.local.set({ [key]: value });
    },

    async getAuthToken() {
        return this.get(STORAGE_KEYS.AUTH_TOKEN);
    },

    async setAuthToken(token) {
        return this.set(STORAGE_KEYS.AUTH_TOKEN, token);
    },

    async getLastSync() {
        return this.get(STORAGE_KEYS.LAST_SYNC);
    },

    async setLastSync(timestamp) {
        return this.set(STORAGE_KEYS.LAST_SYNC, timestamp);
    },

    async getSyncQueue() {
        return (await this.get(STORAGE_KEYS.SYNC_QUEUE)) || [];
    },

    async addToSyncQueue(item) {
        const queue = await this.getSyncQueue();
        queue.push(item);
        await this.set(STORAGE_KEYS.SYNC_QUEUE, queue);
    },

    async clearSyncQueue() {
        await this.set(STORAGE_KEYS.SYNC_QUEUE, []);
    },

    async getApiBaseUrl() {
        // Import default here or check if it's better to pass it in. 
        // For circular dep reasons, sometimes it's better to import constants at top.
        // We already import STORAGE_KEYS. Let's import DEFAULT_API_BASE_URL too.
        const url = await this.get(STORAGE_KEYS.API_BASE_URL);
        // Static import usage
        return url || DEFAULT_API_BASE_URL;
    },

    async setApiBaseUrl(url) {
        // Ensure trailing slash is removed or standardized if needed, but for now just save raw
        // or maybe standardized? The user prompt said "example http://localhost:5173/" (with slash)
        // logic in api.js should handle slash or no slash.
        return this.set(STORAGE_KEYS.API_BASE_URL, url);
    },

    async getIdMapping() {
        return (await this.get(STORAGE_KEYS.ID_MAPPING)) || {};
    },

    async setMapping(serverID, localID) {
        const map = await this.getIdMapping();
        map[serverID] = localID;
        await this.set(STORAGE_KEYS.ID_MAPPING, map);
    },

    async getLocalId(serverID) {
        const map = await this.getIdMapping();
        return map[serverID];
    },
};
