/**
 * NWC Client Module
 * Nostr Wallet Connect client wrapper
 */

import { NWCClient } from '@getalby/sdk';
import { CONFIG, validateConfig } from './config.js';
import { logger } from './logger.js';

/**
 * Create NWC client
 * @param {Object} options
 * @param {number} options.timeout - Request timeout in ms
 * @throws {Error} if NWC_CONNECTION_STRING is not configured
 */
export function createClient(options = {}) {
  if (!CONFIG.nwcConnectionString) {
    throw new Error('NWC_CONNECTION_STRING not found. Set it in your environment or .env file.');
  }

  logger.debug('Creating NWC client', {
    timeout: options.timeout || CONFIG.nwcTimeout,
  });

  return new NWCClient({
    nostrWalletConnectUrl: CONFIG.nwcConnectionString,
    timeout: options.timeout || CONFIG.nwcTimeout,
  });
}
