import { storage } from './storage.js';
import { logger } from '../utils/logger.js';

async function request(endpoint, options = {}) {
    const token = await storage.getAuthToken();
    const apiBaseUrl = await storage.getApiBaseUrl();

    // normalize url: remove trailing slash if present, and ensure endpoint starts with /
    // OR, we just blindly concatenate if we trust the input. 
    // Let's do a simple join.
    const baseUrl = apiBaseUrl.replace(/\/$/, '');
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['x-api-key'] = token;
    }

    const config = {
        ...options,
        headers,
    };

    try {
        const response = await fetch(`${baseUrl}${path}`, config);

        if (response.status === 401) {
            logger.warn('Unauthorized access. Token might be expired.');
            // TODO: Trigger re-auth flow or clear token
        }

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        logger.error('API Request Failed:', error);
        throw error;
    }
}

export const api = {
    get: (endpoint) => request(endpoint, { method: 'GET' }),
    post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
    put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};
