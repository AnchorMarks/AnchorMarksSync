/**
 * Resolves conflicts between local and server states.
 * Default Strategy: Last Write Wins (LWW) based on 'modifiedAt'.
 */
export const ConflictResolver = {
    resolve(localNode, serverNode) {
        const localTime = new Date(localNode.dateGroupModified || localNode.dateAdded).getTime();
        const serverTime = new Date(serverNode.modifiedAt).getTime();

        if (serverTime > localTime) {
            return { winner: 'server', node: serverNode };
        } else {
            return { winner: 'local', node: localNode };
        }
    }
};
