/**
 * Status Command
 * Show connection status, config, and cache info
 */

import fs from 'fs';
import { CONFIG } from '../config.js';
import { getCacheStats, getTitlesCacheInfo } from '../cache.js';
import { logger } from '../logger.js';
import {
  success, error, warning, dim, bold, cyan, green, red, yellow,
} from '../colors.js';

/**
 * Test NWC connection
 */
async function testNwcConnection() {
  if (!CONFIG.nwcConnectionString) {
    return { success: false, error: 'Not configured' };
  }

  const { NWCClient } = await import('@getalby/sdk');

  logger.debug('Testing NWC connection');

  const client = new NWCClient({
    nostrWalletConnectUrl: CONFIG.nwcConnectionString,
    timeout: 15000,
  });

  try {
    const start = Date.now();
    await client.listTransactions({ type: 'incoming', limit: 1 });
    const latency = Date.now() - start;
    logger.debug('NWC connection successful', { latency });
    return { success: true, latency };
  } catch (err) {
    logger.debug('NWC connection failed', { error: err.message });
    return { success: false, error: err.message };
  } finally {
    client.close();
  }
}

/**
 * Format a status indicator
 */
function statusIndicator(ok, label = null) {
  const icon = ok ? green('✓') : red('✗');
  return label ? `${icon} ${label}` : icon;
}

/**
 * Execute status command
 */
export async function statusCommand(options = {}) {
  console.log(bold('\nV4V Analytics Status\n'));

  // Config status
  console.log(bold('Configuration'));
  console.log('─'.repeat(40));

  const envPath = `${CONFIG.paths.root}/.env`;
  const envExists = fs.existsSync(envPath);

  console.log(`  .env file:        ${statusIndicator(envExists, envExists ? 'Found' : 'Not found')}`);
  console.log(`  NWC Connection:   ${statusIndicator(!!CONFIG.nwcConnectionString, CONFIG.nwcConnectionString ? 'Configured' : 'Missing')}`);
  console.log(`  Site URL:         ${statusIndicator(!!CONFIG.siteUrl, CONFIG.siteUrl || 'Missing')}`);

  if (CONFIG.rssUrl) {
    console.log(`  RSS URL:          ${dim(CONFIG.rssUrl)}`);
  }

  // Cache status
  console.log(bold('\nCache'));
  console.log('─'.repeat(40));

  const cacheStats = getCacheStats();
  if (cacheStats) {
    console.log(`  Transactions:     ${cyan(cacheStats.totalTransactions.toString())} cached`);
    console.log(`  Cache size:       ${dim(cacheStats.sizeKb + ' KB')}`);
    console.log(`  Last updated:     ${dim(cacheStats.updated || 'Unknown')}`);

    if (cacheStats.oldest && cacheStats.newest) {
      const oldest = new Date(cacheStats.oldest * 1000).toISOString().split('T')[0];
      const newest = new Date(cacheStats.newest * 1000).toISOString().split('T')[0];
      console.log(`  Date range:       ${dim(`${oldest} to ${newest}`)}`);
    }
  } else {
    console.log(`  Transactions:     ${dim('No cache')}`);
  }

  const titlesInfo = getTitlesCacheInfo();
  if (titlesInfo) {
    console.log(`  Essay titles:     ${cyan(titlesInfo.count.toString())} cached`);
  }

  // Connection test
  console.log(bold('\nConnection Test'));
  console.log('─'.repeat(40));

  if (!CONFIG.nwcConnectionString) {
    console.log(`  NWC:              ${red('✗')} ${dim('Not configured')}`);
    console.log(dim('\n  Run `v4v init` to set up your connection.\n'));
    return;
  }

  process.stdout.write(`  NWC:              ${dim('Testing...')}`);

  const result = await testNwcConnection();

  // Clear the "Testing..." text
  process.stdout.write('\r');

  if (result.success) {
    console.log(`  NWC:              ${green('✓')} Connected ${dim(`(${result.latency}ms)`)}`);
  } else {
    console.log(`  NWC:              ${red('✗')} ${result.error}`);

    // Provide troubleshooting hints
    console.log(dim('\n  Troubleshooting:'));
    if (result.error.includes('timeout')) {
      console.log(dim('    • Is your Alby Hub running?'));
      console.log(dim('    • Check your internet connection'));
    } else if (result.error.includes('Invalid')) {
      console.log(dim('    • Check your NWC connection string'));
      console.log(dim('    • Run `v4v init` to reconfigure'));
    }
  }

  console.log('');
}
