// CORS-headers voor publieke read-endpoints, zodat externe pagina's (bv.
// nederlanders.fr) de data cross-origin via GET kunnen ophalen.
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

// Preflight-respons (OPTIONS).
export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}
