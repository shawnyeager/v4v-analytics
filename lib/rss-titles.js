/**
 * RSS Title Fetcher
 * Fetch essay titles from site's RSS feed for friendly display names
 */

import https from 'https';
import { CONFIG, getRssUrl } from './config.js';
import { loadTitlesCache, saveTitlesCache, getTitlesCacheFile } from './cache.js';
import { DEFAULT_HTTP_TIMEOUT } from './constants.js';
import { logger } from './logger.js';
import { ParseError } from './errors.js';

/**
 * Fetch RSS feed content with timeout
 * @param {string} url - URL to fetch
 * @returns {Promise<string>} RSS XML content
 */
function fetchRss(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // Follow redirect
        return fetchRss(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.on('error', reject);
    req.setTimeout(DEFAULT_HTTP_TIMEOUT);
  });
}

/**
 * Parse RSS XML to extract title/link pairs
 * Simple regex-based parser (avoids XML dependency)
 * @param {string} xml - RSS XML content
 * @returns {Object} Title mappings by slug
 * @throws {ParseError}
 */
function parseRss(xml) {
  if (!xml || typeof xml !== 'string') {
    throw new ParseError('Invalid RSS XML content', xml);
  }

  const titles = {};

  // Match <item>...</item> blocks
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
  const linkRegex = /<link>(.*?)<\/link>/;

  let match;
  let itemCount = 0;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const titleMatch = item.match(titleRegex);
    const linkMatch = item.match(linkRegex);

    if (titleMatch && linkMatch) {
      const title = titleMatch[1] || titleMatch[2];
      const link = linkMatch[1];

      try {
        // Extract slug from URL (last path segment)
        const url = new URL(link);
        const slug = url.pathname.replace(/^\/|\/$/g, '');

        if (slug && title) {
          titles[slug] = title;
          itemCount++;
        }
      } catch (error) {
        logger.debug('Failed to parse link', { link, error: error.message });
      }
    }
  }

  if (itemCount === 0) {
    logger.warn('No items found in RSS feed');
  } else {
    logger.debug('Parsed RSS feed', { itemCount });
  }

  return titles;
}

/**
 * Fetch essay titles from RSS feed
 * @param {string} siteUrl - Site URL (default: from V4V_SITE_URL env)
 * @param {boolean} forceRefresh - Skip cache and fetch fresh
 * @returns {Promise<Object>} Title mappings by slug
 */
export async function fetchEssayTitles(siteUrl = null, forceRefresh = false) {
  const site = siteUrl || CONFIG.siteUrl;
  if (!site) {
    logger.warn('V4V_SITE_URL not set, skipping RSS title fetch');
    return {};
  }

  // Check cache first
  if (!forceRefresh) {
    const cached = loadTitlesCache();
    if (cached) {
      return cached;
    }
  }

  // Fetch RSS feed
  const feedUrl = getRssUrl();
  logger.debug('Fetching RSS feed', { url: feedUrl });

  try {
    const xml = await fetchRss(feedUrl);
    const titles = parseRss(xml);
    saveTitlesCache(titles);
    return titles;
  } catch (error) {
    logger.warn(`Could not fetch RSS feed from ${feedUrl}`, { error: error.message });
    // Return cached titles even if expired, or empty object
    const cached = loadTitlesCache();
    return cached || {};
  }
}

// Re-export for backwards compatibility
export { getTitlesCacheFile };
