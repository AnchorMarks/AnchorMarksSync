const PREFIX = '[AnchorMarksSync]';

export const logger = {
    info: (...args) => console.log(PREFIX, ...args),
    warn: (...args) => console.warn(PREFIX, ...args),
    error: (...args) => console.error(PREFIX, ...args),
    debug: (...args) => {
        // Only log debug in development (could be controlled by a flag)
        console.debug(PREFIX, ...args);
    },
};
