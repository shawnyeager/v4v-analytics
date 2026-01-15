/**
 * Invoice Status Endpoint (Edge Function)
 *
 * Checks if a Lightning invoice has been paid.
 * Used by the frontend to poll for payment confirmation.
 *
 * Environment variables:
 * - NWC_CONNECTION_STRING: Your NWC connection URL (required)
 * - NTFY_TOPIC: Your ntfy.sh topic name (optional, for failure alerts)
 */

import type { Config } from "@netlify/edge-functions";
import { errorResponse, jsonResponse, alertFailure } from "./_shared/config.ts";
import { withNWCClient, NWCNotConfiguredError } from "./_shared/nwc.ts";

export default async (req: Request) => {
  const url = new URL(req.url);
  const paymentHash = url.searchParams.get('hash');
  const invoice = url.searchParams.get('invoice');

  if (!paymentHash && !invoice) {
    return errorResponse(400, "Payment hash or invoice required");
  }

  try {
    const result = await withNWCClient(async (client) => {
      return client.lookupInvoice({
        invoice: invoice || undefined,
        payment_hash: paymentHash || undefined
      });
    });

    // Nip47Transaction has preimage field - only present when paid
    const paid = !!result.preimage;

    return jsonResponse({
      paid,
      preimage: result.preimage || null
    });

  } catch (error) {
    if (error instanceof NWCNotConfiguredError) {
      await alertFailure('Invoice Lookup', 'NWC not configured');
      return errorResponse(500, "Server configuration error");
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Invoice lookup error:', errorMessage);
    await alertFailure('Invoice Lookup', errorMessage);
    return errorResponse(500, `Lookup failed: ${errorMessage}`);
  }
};

export const config: Config = {
  path: "/invoice-status"
};
