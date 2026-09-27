/* Cloudflare Pages Function: POST /api/beta
 * Validates a beta seat claim and stores it in D1: email plus a salted
 * SHA-256 hash of the password. Plaintext passwords are never stored and
 * never emailed. Duplicate emails are silently accepted so seat state
 * never leaks. A filled honeypot returns success without writing
 * anything or notifying anyone.
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
    const ct = request.headers.get('content-type') || '';
    if (ct.indexOf('application/json') === -1) return json({ ok: false, error: 'bad_request' }, 400);

    const body = await request.json();

    // Spam trap filled: pretend success, store nothing, notify no one.
    if (body._honey) return json({ ok: true }, 200);

    const db = env.FEEDBACK_DB || env.DB;
    if (!db) return json({ ok: false, error: 'storage_unbound' }, 500);

    const email = String(body.email || '').trim().toLowerCase().slice(0, 254);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'bad_email' }, 400);

    const password = String(body.password || '');
    if (password.length < 8 || password.length > 200) return json({ ok: false, error: 'bad_password' }, 400);

    const passwordHash = await hashPassword(email, password);
    await db.prepare(
      'INSERT INTO beta_signups (email, password_hash) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash'
    ).bind(email, passwordHash).run();

    return json({ ok: true }, 200);
  } catch (e) {
    return json({ ok: false, error: 'server' }, 500);
  }
}
