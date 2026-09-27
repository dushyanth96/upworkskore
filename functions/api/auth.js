/* Cloudflare Pages Function: POST /api/auth
 * Beta sign-in: the email must sit in beta_signups and the password must
 * match its salted SHA-256 hash. Rows claimed before passwords existed
 * get their hash set on first sign-in. The extension signs the user in
 * locally on success. No sessions server-side.
 * Uses the same D1 binding as feedback (FEEDBACK_DB or DB).
 */
// Extension popups may only call cross-origin hosts with permission or an
// explicit CORS grant. These endpoints are public and cookie-free, so a
// wildcard grant is appropriate.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: Object.assign({ 'content-type': 'application/json' }, CORS)
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

async function hashPassword(email, password) {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(email + ':' + password)
  );
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
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

    const password = String(body.password || '');
    if (!password) return json({ ok: false, error: 'bad_password' }, 400);

    let row;
    try {
      row = await db.prepare(
        'SELECT id, password_hash FROM beta_signups WHERE email = ? LIMIT 1'
      ).bind(email).first();
    } catch (e) {
      return json({ ok: false, error: 'query_failed' }, 500);
    }

    if (!row) return json({ ok: false, error: 'not_on_list' }, 200);

    const passwordHash = await hashPassword(email, password);
    if (!row.password_hash) {
      try {
        await db.prepare(
          'UPDATE beta_signups SET password_hash = ? WHERE id = ?'
        ).bind(passwordHash, row.id).run();
      } catch (e) {
        return json({ ok: false, error: 'query_failed' }, 500);
      }
      return json({ ok: true }, 200);
    }

    if (row.password_hash !== passwordHash) return json({ ok: false, error: 'wrong_password' }, 200);
    return json({ ok: true }, 200);
  } catch (e) {
    return json({ ok: false, error: 'server' }, 500);
  }
}
