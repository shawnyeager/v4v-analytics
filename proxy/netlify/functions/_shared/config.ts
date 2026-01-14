/**
 * Shared configuration constants for Netlify functions
 * 
 * Environment variables:
 * - ALBY_USERNAME: Your Alby username (required)
 */

// Get Alby username from environment
const albyUsername = Netlify.env.get("ALBY_USERNAME") || "";

export const ALBY_LNURL = `https://getalby.com/.well-known/lnurlp/${albyUsername}`;
export const ALBY_CALLBACK = `https://getalby.com/lnurlp/${albyUsername}/callback`;
export const ALBY_TIMEOUT_MS = 10000;

// Lightning address aliases
export const VALID_USERNAMES = ["sats", "zap", "lightning"] as const;
