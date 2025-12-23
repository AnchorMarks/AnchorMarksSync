import { logger } from '../utils/logger.js';
import { storage } from './storage.js';

export const DiffEngine = {
    async applyServerChanges(data) {
        logger.info(`Applying changes from server...`);
        const { bookmarks = [], folders = [] } = data;

        // 1. Sort Folders (Parents before Children)
        const sortedFolders = this.sortFoldersByHierarchy(folders);

        // 2. Folders
        if (sortedFolders.length > 0) {
            logger.debug(`Example folder keys: ${Object.keys(sortedFolders[0]).join(', ')}`);
        }
        for (const folder of sortedFolders) {
            await this.upsertFolder(folder);
        }

        // 3. Bookmarks
        if (bookmarks.length > 0) {
            logger.debug(`Example bookmark keys: ${Object.keys(bookmarks[0]).join(', ')}`);
        }
        for (const bookmark of bookmarks) {
            await this.upsertBookmark(bookmark);
        }
    },

    sortFoldersByHierarchy(folders) {
        const folderMap = new Map(folders.map(f => [f.id, f]));
        const depthCache = new Map();

        const getDepth = (id) => {
            if (!id) return 0;
            if (depthCache.has(id)) return depthCache.get(id);

            const folder = folderMap.get(id);
            if (!folder || !folder.parent_id) {
                depthCache.set(id, 0);
                return 0;
            }

            const parentDepth = getDepth(folder.parent_id);
            const depth = 1 + parentDepth;
            depthCache.set(id, depth);
            return depth;
        };

        folders.forEach(f => getDepth(f.id));

        return [...folders].sort((a, b) => {
            return depthCache.get(a.id) - depthCache.get(b.id);
        });
    },

    async getValidLocalParentId(serverParentId) {
        if (!serverParentId) {
            // Valid for root items
            return '1';
        }

        const localId = await storage.getLocalId(serverParentId);
        if (!localId) {
            logger.warn(`Parent resolution failed: serverID=${serverParentId} has no local mapping. Returning root.`);
            return '1';
        }

        try {
            const results = await chrome.bookmarks.get(localId);
            if (results && results.length > 0) {
                // Ensure parent is a FOLDER (no URL)
                if (results[0].url) {
                    logger.warn(`Parent ${localId} (from server ${serverParentId}) is a bookmark (URL: ${results[0].url}). Fallback to root.`);
                    return '1';
                }
                return localId;
            }
        } catch (e) {
            // Parent missing locally, mapping is stale
            logger.warn(`Stale mapping found for parent ${serverParentId} -> ${localId} (not found in Chrome). Fallback to root.`);
        }
        return '1';
    },

    async upsertFolder(serverFolder) {
        // Resolve Parent ID
        const localParentId = await this.getValidLocalParentId(serverFolder.parent_id);
        let localId = await storage.getLocalId(serverFolder.id);

        // Check for Stale ID
        if (localId) {
            try {
                await chrome.bookmarks.get(localId);
            } catch (e) {
                logger.warn(`Local ID ${localId} for folder "${serverFolder.name}" not found (stale). Clearing mapping and recreating.`);
                localId = null; // Force create
                // Effectively we don't need to explicitly clear mapping here because setMapping below will overwrite it
            }
        }

        if (localId) {
            // Update existing
            try {
                await chrome.bookmarks.update(localId, { title: serverFolder.name });

                const node = (await chrome.bookmarks.get(localId))[0];
                if (node.parentId !== localParentId) {
                    try {
                        await chrome.bookmarks.move(localId, { parentId: localParentId });
                    } catch (moveErr) {
                        if (moveErr.message.includes("Can't find parent bookmark")) {
                            logger.warn(`Parent ${localParentId} invalid during move. Retrying move to root.`);
                            await chrome.bookmarks.move(localId, { parentId: '1' });
                        } else {
                            throw moveErr;
                        }
                    }
                }
            } catch (err) {
                logger.warn(`Failed to update folder ${localId}`, err);
            }
        } else {
            // Create new
            try {
                let newNode;
                try {
                    newNode = await chrome.bookmarks.create({
                        parentId: localParentId,
                        title: serverFolder.name
                    });
                } catch (createErr) {
                    if (createErr.message.includes("Can't find parent bookmark")) {
                        logger.warn(`Parent ${localParentId} invalid during create. Retrying create in root.`);
                        newNode = await chrome.bookmarks.create({
                            parentId: '1',
                            title: serverFolder.name
                        });
                    } else {
                        throw createErr;
                    }
                }

                if (newNode) {
                    await storage.setMapping(serverFolder.id, newNode.id);
                    logger.info(`Created folder "${serverFolder.name}" mapped ${serverFolder.id} -> ${newNode.id}`);
                }
            } catch (err) {
                logger.error(`Failed to create folder ${serverFolder.name}`, err);
            }
        }
    },

    async upsertBookmark(serverBookmark) {
        // Resolve Parent
        const localParentId = await this.getValidLocalParentId(serverBookmark.parent_id);
        let localId = await storage.getLocalId(serverBookmark.id);

        // Check for Stale ID
        if (localId) {
            try {
                await chrome.bookmarks.get(localId);
            } catch (e) {
                logger.warn(`Local ID ${localId} for bookmark "${serverBookmark.title}" not found (stale). Clearing mapping and recreating.`);
                localId = null; // Force create
            }
        }

        if (localId) {
            try {
                await chrome.bookmarks.update(localId, {
                    title: serverBookmark.title,
                    url: serverBookmark.url
                });
                const node = (await chrome.bookmarks.get(localId))[0];
                if (node.parentId !== localParentId) {
                    try {
                        await chrome.bookmarks.move(localId, { parentId: localParentId });
                    } catch (moveErr) {
                        if (moveErr.message.includes("Can't find parent bookmark")) {
                            logger.warn(`Parent ${localParentId} invalid during move. Retrying move to root.`);
                            await chrome.bookmarks.move(localId, { parentId: '1' });
                        } else {
                            throw moveErr;
                        }
                    }
                }
            } catch (err) {
                logger.warn(`Failed to update bookmark ${localId}`, err);
            }
        } else {
            try {
                let newNode;
                try {
                    newNode = await chrome.bookmarks.create({
                        parentId: localParentId,
                        title: serverBookmark.title,
                        url: serverBookmark.url
                    });
                } catch (createErr) {
                    if (createErr.message.includes("Can't find parent bookmark")) {
                        logger.warn(`Parent ${localParentId} invalid during create. Retrying create in root.`);
                        newNode = await chrome.bookmarks.create({
                            parentId: '1',
                            title: serverBookmark.title,
                            url: serverBookmark.url
                        });
                    } else {
                        throw createErr;
                    }
                }

                if (newNode) {
                    await storage.setMapping(serverBookmark.id, newNode.id);
                    logger.info(`Created bookmark "${serverBookmark.title}" mapped ${serverBookmark.id} -> ${newNode.id}`);
                }
            } catch (err) {
                logger.error(`Failed to create bookmark ${serverBookmark.title}`, err);
            }
        }
    }
};
