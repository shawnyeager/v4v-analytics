/**
 * LNURL-pay Callback Endpoint (Edge Function)
 *
 * Handles invoice generation requests from Lightning wallets.
 * - Zap requests (with nostr param): forwards to Alby for zap receipt handling
 * - Regular payments: generates invoice locally via NWC for essay tracking
 *
 * Environment variables:
 * - NWC_CONNECTION_STRING: Your NWC connection URL (required)
 * - ALBY_USERNAME: Your Alby username (required for zap forwarding)
 * - V4V_SITE_URL: Your site domain without protocol (required)
 * - NTFY_TOPIC: Your ntfy.sh topic name (optional, for failure alerts)
 */

import type { Config } from "@netlify/edge-functions";
import bolt11 from "bolt11";
import { errorResponse, jsonResponse, alertFailure, siteUrl, ALBY_CALLBACK, ALBY_TIMEOUT_MS } from "./_shared/config.ts";
import { withNWCClient, NWCNotConfiguredError } from "./_shared/nwc.ts";

export default async (req: Request) => {
  const url = new URL(req.url);
  const amount = url.searchParams.get('amount');
  const nostrParam = url.searchParams.get('nostr');
  const essaySlug = url.searchParams.get('essay') || '';
  const essayTitle = url.searchParams.get('title') || '';

  if (!amount) {
    return errorResponse(400, "Amount parameter required");
  }

  // If nostr param present, this is a zap request - forward to Alby
  // so they can handle zap receipt (kind 9735) publishing
  if (nostrParam) {
    console.log(`Zap request detected, forwarding to Alby: amount=${amount}ms`);

    const albyUrl = new URL(ALBY_CALLBACK);
    albyUrl.searchParams.set('amount', amount);
    albyUrl.searchParams.set('nostr', nostrParam);

    const comment = url.searchParams.get('comment');
    if (comment) albyUrl.searchParams.set('comment', comment);

    const payerdata = url.searchParams.get('payerdata');
    if (payerdata) albyUrl.searchParams.set('payerdata', payerdata);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ALBY_TIMEOUT_MS);

    try {
      const albyResponse = await fetch(albyUrl.toString(), { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!albyResponse.ok) {
        console.error(`Alby callback error: ${albyResponse.status}`);
        await alertFailure('Alby Callback', `HTTP ${albyResponse.status}`, { amount });
        return errorResponse(502, "Upstream error");
      }

      const albyData = await albyResponse.json();
      return jsonResponse(albyData);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        await alertFailure('Alby Callback', 'Timeout (10s)', { amount });
        return errorResponse(504, "Upstream timeout");
      }
      console.error('Alby callback fetch error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      await alertFailure('Alby Callback', errorMessage, { amount });
      return errorResponse(502, "Upstream error");
    }
  }

  // No nostr param - handle locally with NWC for essay tracking
  try {
    const result = await withNWCClient(async (client) => {
      const memo = essaySlug
        ? `${siteUrl}/${essaySlug}`
        : siteUrl || 'V4V payment';

      const invoice = await client.makeInvoice({
        amount: parseInt(amount),
        description: memo
      });

      // Extract payment hash from BOLT11 invoice
      let paymentHash = '';
      try {
        const decoded = bolt11.decode(invoice.invoice);
        const paymentHashTag = decoded.tags.find((t: { tagName: string }) => t.tagName === 'payment_hash');
        paymentHash = (paymentHashTag?.data as string) || '';
      } catch (e) {
        console.error('Failed to decode BOLT11:', e);
      }

      console.log(`Invoice generated: source=${essaySlug || 'footer'}, amount=${amount}ms, hash=${paymentHash}`);

      return { invoice: invoice.invoice, paymentHash };
    });

    return jsonResponse({
      pr: result.invoice,
      paymentHash: result.paymentHash,
      routes: [],
      successAction: {
        tag: "message",
        message: essayTitle
          ? `Thank you for supporting ${essayTitle}.`
          : 'Thank you for your support.'
      }
    });

  } catch (error) {
    if (error instanceof NWCNotConfiguredError) {
      console.error('NWC_CONNECTION_STRING environment variable not set');
      await alertFailure('Invoice Generation', 'NWC not configured');
      return errorResponse(500, "Server configuration error");
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('NWC invoice generation error:', errorMessage, error);
    await alertFailure('Invoice Generation', errorMessage, {
      source: essaySlug || 'footer',
      amount
    });
    return errorResponse(500, `Invoice generation failed: ${errorMessage}`);
  }
};

export const config: Config = {
  path: "/lnurl-callback"
};
