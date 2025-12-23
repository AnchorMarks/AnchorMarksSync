# AnchorMarks Sync

Sync browser bookmarks with [AnchorMarks](https://anchormarks.com).

## Overview

This repository contains the browser extension for AnchorMarks. It uses a background service worker to periodically sync bookmarks (push changes and pull updates) with the AnchorMarks API.

## Project Structure

- `packages/extension`: The Chrome Extension source code.
  - `src/background`: Background service worker (sync engine, listeners).
  - `src/popup`: Extension popup UI.
  - `src/options`: Extension options page.

## Installation (Development)

1.  Clone this repository.
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable **Developer mode**.
4.  Click **Load unpacked**.
5.  Select the `packages/extension` directory.

## Development

The extension is built with standard ES Modules.

- **Logs**: Debug logs are available in the Service Worker console (prefixed with `[AnchorMarks]`). See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for details.
- **Permissions**:
  - `bookmarks`: To read/write bookmarks.
  - `storage`: To save sync queue and auth tokens.
  - `alarms`: For periodic sync scheduling.

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for help with debugging and common issues.
