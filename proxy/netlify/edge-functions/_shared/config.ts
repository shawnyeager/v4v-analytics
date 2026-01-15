/**
 * Shared configuration constants for edge functions
 *
 * Environment variables (set in Netlify UI):
 * - ALBY_USERNAME: Your Alby username (required)
 * - V4V_SITE_URL: Your site domain without protocol (required)
 * - VALID_USERNAMES: Comma-separated Lightning address aliases (e.g., "sats,zap,lightning")
 * - NTFY_TOPIC: Your ntfy.sh topic name (optional, for failure alerts)
 */

const albyUsername = Deno.env.get("ALBY_USERNAME") || "";
export const siteUrl = Deno.env.get("V4V_SITE_URL") || "";

export const ALBY_LNURL = `https://getalby.com/.well-known/lnurlp/${albyUsername}`;
export const ALBY_CALLBACK = `https://getalby.com/lnurlp/${albyUsername}/callback`;
export const ALBY_TIMEOUT_MS = 10000;

// Lightning address aliases parsed from env var
const usernamesEnv = Deno.env.get("VALID_USERNAMES") || "sats";
export const VALID_USERNAMES = usernamesEnv.split(",").map(s => s.trim());

export function errorResponse(status: number, reason: string): Response {
  return new Response(JSON.stringify({ status: "ERROR", reason }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export function jsonResponse(data: object, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

/**
 * V4V Payment Failure Alerts via ntfy.sh
 */
export async function alertFailure(
  context: string,
  error: string,
  details?: Record<string, string>
): Promise<void> {
  const topic = Deno.env.get("NTFY_TOPIC");
  if (!topic) return;

  const body = [
    `V4V Failure: ${context}`,
    `Error: ${error}`,
    details ? Object.entries(details).map(([k, v]) => `${k}: ${v}`).join('\n') : ''
  ].filter(Boolean).join('\n\n');

  try {
    await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers: { 'Title': `${siteUrl || 'V4V'} Alert` },
      body
    });
  } catch (e) {
    console.error('Alert send failed:', e);
  }
}
