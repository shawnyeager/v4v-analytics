/**
 * NWC WebSocket Polyfill
 * Sets up WebSocket for Node.js environment
 * Import this once in the entry point
 */

import { WebSocket } from 'ws';

// Polyfill WebSocket for Node.js (required by NWC SDK)
globalThis.WebSocket = WebSocket;