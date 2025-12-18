/**
 * RSS Title Fetcher
 * Fetch essay titles from site's RSS feed for friendly display names
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TITLES_CACHE_FILE = path.join(__dirname, '..', '.titles-cache.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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
 * Load cached titles
 */
function loadTitlesCache() {
  try {
    if (fs.existsSync(TITLES_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(TITLES_CACHE_FILE, 'utf8'));
      const age = Date.now() - new Date(data.fetched).getTime();
      if (age < CACHE_TTL_MS) {
        return data.titles;
      }
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

/**
 * Save titles to cache
 */
function saveTitlesCache(titles) {
  try {
    fs.writeFileSync(TITLES_CACHE_FILE, JSON.stringify({
      fetched: new Date().toISOString(),
      titles,
    }, null, 2));
  } catch {
    // Ignore cache errors
  }
}

/**
 * Fetch essay titles from RSS feed
 * @param {string} siteUrl - Site URL (default: from V4V_SITE_URL env)
 * @param {boolean} forceRefresh - Skip cache and fetch fresh
 */
export async function fetchEssayTitles(siteUrl = null, forceRefresh = false) {
  const site = siteUrl || process.env.V4V_SITE_URL;
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

  // Fetch RSS feed (configurable via V4V_RSS_URL, defaults to site + /feed.xml)
  const feedUrl = process.env.V4V_RSS_URL || `https://${site.replace(/^https?:\/\//, '')}/feed.xml`;

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

/**
 * Get cache file path
 */
export function getTitlesCacheFile() {
  return TITLES_CACHE_FILE;
}
