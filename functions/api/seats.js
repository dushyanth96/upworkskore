/* Cloudflare Pages Function: GET /api/seats
 * Public seat counter for the hero eyebrow. Returns how many of the
 * 10 founding beta seats are still open. No personal data leaves D1.
 * Uses the same D1 binding as feedback (FEEDBACK_DB or DB).
 */
function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

export async function onRequestGet({ env }) {
  try {
    const db = env.FEEDBACK_DB || env.DB;
    if (!db) return json({ ok: false, error: 'storage_unbound' }, 500);
    let taken = 0;
    try {
      const row = await db.prepare('SELECT COUNT(*) AS taken FROM beta_signups').first();
      taken = (row && row.taken) || 0;
    } catch (e) {
      return json({ ok: false, error: 'query_failed' }, 500);
    }
    return json({ ok: true, taken: taken, open: Math.max(0, 10 - taken) }, 200);
  } catch (e) {
    return json({ ok: false, error: 'server' }, 500);
  }
}
