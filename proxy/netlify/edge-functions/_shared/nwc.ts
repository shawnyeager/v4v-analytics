/**
 * NWC (Nostr Wallet Connect) client for Edge Functions
 * Uses Deno's native WebSocket - no polyfill needed
 *
 * Environment variables:
 * - NWC_CONNECTION_STRING: Your NWC connection URL (required)
 */

import { NWCClient } from "@getalby/sdk";

export class NWCNotConfiguredError extends Error {
  constructor() {
    super("NWC_CONNECTION_STRING not configured");
    this.name = "NWCNotConfiguredError";
  }
}

/**
 * Execute a function with an NWC client, ensuring proper cleanup
 */
export async function withNWCClient<T>(
  fn: (client: NWCClient) => Promise<T>
): Promise<T> {
  const nwcUrl = Deno.env.get("NWC_CONNECTION_STRING");
  if (!nwcUrl) {
    throw new NWCNotConfiguredError();
  }

  const client = new NWCClient({ nostrWalletConnectUrl: nwcUrl });
  try {
    return await fn(client);
  } finally {
    client.close();
  }
}
