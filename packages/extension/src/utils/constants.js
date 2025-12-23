export const DEFAULT_API_BASE_URL = 'https://api.anchormarks.com/api';

export const STORAGE_KEYS = {
    AUTH_TOKEN: 'authToken',
    LAST_SYNC: 'lastSyncTimestamp',
    SYNC_QUEUE: 'syncQueue',
    USER_SETTINGS: 'userSettings',
    API_BASE_URL: 'apiBaseUrl',
    ID_MAPPING: 'idMapping', // Map<ServerID, LocalID>
};

export const SYNC_INTERVAL_ALARMS = 'anchorMarksSyncAlarm';
export const SYNC_INTERVAL_MINUTES = 5;
