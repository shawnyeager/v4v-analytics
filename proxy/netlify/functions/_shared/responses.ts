/**
 * Shared response utilities for Netlify functions
 */

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
