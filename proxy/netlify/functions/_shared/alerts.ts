/**
 * V4V Payment Failure Alerts via ntfy.sh
 *
 * Sends push notifications when payment-related failures occur.
 * Configure NTFY_TOPIC env var in Netlify to enable (optional).
 * 
 * Environment variables:
 * - NTFY_TOPIC: Your ntfy.sh topic name (optional)
 * - V4V_SITE_URL: Your site domain for alert title (optional)
 */

export async function alertFailure(
  context: string,
  error: string,
  details?: Record<string, string>
): Promise<void> {
  const topic = Netlify.env.get("NTFY_TOPIC");
  if (!topic) return; // Silent fail if not configured

  const siteUrl = Netlify.env.get("V4V_SITE_URL") || "V4V";

  const body = [
    `V4V Failure: ${context}`,
    `Error: ${error}`,
    details ? Object.entries(details).map(([k, v]) => `${k}: ${v}`).join('\n') : ''
  ].filter(Boolean).join('\n\n');

  try {
    await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers: { 'Title': `${siteUrl} V4V Alert` },
      body
    });
  } catch (e) {
    // Don't let alert failures break payment flow
    console.error('Alert send failed:', e);
  }
}
