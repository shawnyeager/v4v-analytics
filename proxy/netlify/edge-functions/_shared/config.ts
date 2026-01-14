/**
 * Shared configuration constants for edge functions
 * 
 * Environment variables:
 * - ALBY_USERNAME: Your Alby username (required)
 */

// Get Alby username from environment (set in Netlify UI)
const albyUsername = Deno.env.get("ALBY_USERNAME") || "";

export const ALBY_LNURL = `https://getalby.com/.well-known/lnurlp/${albyUsername}`;
export const ALBY_TIMEOUT_MS = 10000;

// Lightning address aliases that map to your Alby account
// Users can configure these based on their domain
export const VALID_USERNAMES = ["sats", "zap", "lightning"] as const;

export function errorResponse(status: number, reason: string): Response {
  return new Response(JSON.stringify({ status: "ERROR", reason }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
