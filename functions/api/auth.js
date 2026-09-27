/* Cloudflare Pages Function: POST /api/auth
 * Beta allow-list check. Returns { ok: true } only when the email claimed
 * a seat (exists in beta_signups). The extension signs the user in locally
 * on success. No passwords, no sessions server-side.
 * Uses the same D1 binding as feedback (FEEDBACK_DB or DB).
 */
function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

export async function onRequestPost({ request, env }) {
  try {
    const db = env.FEEDBACK_DB || env.DB;
    if (!db) return json({ ok: false, error: 'storage_unbound' }, 500);

    const ct = request.headers.get('content-type') || '';
    if (ct.indexOf('application/json') === -1) return json({ ok: false, error: 'bad_request' }, 400);

    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase().slice(0, 254);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'bad_email' }, 400);

    const row = await db.prepare(
      'SELECT id FROM beta_signups WHERE email = ? LIMIT 1'
    ).bind(email).first();

    if (!row) return json({ ok: false, error: 'not_on_list' }, 200);
    return json({ ok: true }, 200);
  } catch (e) {
    return json({ ok: false, error: 'server' }, 500);
  }
}
