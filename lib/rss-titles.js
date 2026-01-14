/**
 * RSS Title Fetcher
 * Fetch essay titles from site's RSS feed for friendly display names
 */

import https from 'https';
import { CONFIG, getRssUrl } from './config.js';
import { loadTitlesCache, saveTitlesCache, getTitlesCacheFile } from './cache.js';

/**
 * Fetch RSS feed content
 */
function fetchRss(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
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
    }).on('error', reject);
  });
}

/**
 * Parse RSS XML to extract title/link pairs
 * Simple regex-based parser (avoids XML dependency)
 */
function parseRss(xml) {
  const titles = {};

  // Match <item>...</item> blocks
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
  const linkRegex = /<link>(.*?)<\/link>/;

  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const titleMatch = item.match(titleRegex);
    const linkMatch = item.match(linkRegex);

    if (titleMatch && linkMatch) {
      const title = titleMatch[1] || titleMatch[2];
      const link = linkMatch[1];

      // Extract slug from URL (last path segment)
      const url = new URL(link);
      const slug = url.pathname.replace(/^\/|\/$/g, '');

      if (slug && title) {
        titles[slug] = title;
      }
    }
  }

  return titles;
}

/**
 * Fetch essay titles from RSS feed
 * @param {string} siteUrl - Site URL (default: from V4V_SITE_URL env)
 * @param {boolean} forceRefresh - Skip cache and fetch fresh
 */
export async function fetchEssayTitles(siteUrl = null, forceRefresh = false) {
  const site = siteUrl || CONFIG.siteUrl;
  if (!site) {
    console.warn('V4V_SITE_URL not set, skipping RSS title fetch');
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

  try {
    const xml = await fetchRss(feedUrl);
    const titles = parseRss(xml);
    saveTitlesCache(titles);
    return titles;
  } catch (error) {
    console.warn(`Could not fetch RSS feed from ${feedUrl}: ${error.message}`);
    // Return cached titles even if expired, or empty object
    const cached = loadTitlesCache();
    return cached || {};
  }
}

// Re-export for backwards compatibility
export { getTitlesCacheFile };
