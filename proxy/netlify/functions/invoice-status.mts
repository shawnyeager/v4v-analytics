/**
 * Invoice Status Endpoint - Checks Payment Status
 * 
 * Polls for payment confirmation via NWC.
 * 
 * Environment variables:
 * - NWC_CONNECTION_STRING: Your NWC connection URL (required)
 */

import type { Context, Config } from "@netlify/functions";
import { errorResponse, jsonResponse } from "./_shared/responses.ts";
import { withNWCClient, NWCNotConfiguredError } from "./_shared/nwc.ts";
import { alertFailure } from "./_shared/alerts.ts";

export default async (req: Request, context: Context) => {
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
