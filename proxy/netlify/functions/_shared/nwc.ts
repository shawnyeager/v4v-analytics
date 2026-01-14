/**
 * NWC (Nostr Wallet Connect) client wrapper for Netlify functions
 * 
 * Environment variables:
 * - NWC_CONNECTION_STRING: Your NWC connection URL (required)
 */

import { WebSocket } from "ws";
import { NWCClient } from "@getalby/sdk";

// Polyfill WebSocket for serverless environment
(globalThis as any).WebSocket = WebSocket;

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
  const nwcUrl = Netlify.env.get("NWC_CONNECTION_STRING");
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
