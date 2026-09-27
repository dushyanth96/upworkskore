/* Cloudflare Pages Function: POST /api/password
 * Changes a beta password. Verifies the current password hash first, then
 * stores the new hash. Plaintext is never stored. Rate-sensitive by
 * Cloudflare bot management; wrong attempts return a generic error.
 * Uses the same D1 binding as feedback (FEEDBACK_DB or DB).
 */
function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' }
  });
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
    const newPassword = String(body.newPassword || '');
    if (!password || newPassword.length < 8 || newPassword.length > 200) {
      return json({ ok: false, error: 'bad_password' }, 400);
    }

    const row = await db.prepare(
      'SELECT id, password_hash FROM beta_signups WHERE email = ? LIMIT 1'
    ).bind(email).first();

    if (!row || !row.password_hash) return json({ ok: false, error: 'denied' }, 200);
    if (row.password_hash !== (await hashPassword(email, password))) {
      return json({ ok: false, error: 'denied' }, 200);
    }

    await db.prepare(
      'UPDATE beta_signups SET password_hash = ? WHERE id = ?'
    ).bind(await hashPassword(email, newPassword), row.id).run();

    return json({ ok: true }, 200);
  } catch (e) {
    return json({ ok: false, error: 'server' }, 500);
  }
}
