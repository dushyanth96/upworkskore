/* Cloudflare Pages Function: POST /api/beta
 * Claims a beta seat with email only. The server generates a readable
 * password, stores its salted SHA-256 hash in D1, and returns the
 * plaintext once so the page can show it. Plaintext is never stored and
 * never emailed. Re-claims issue a fresh password (built-in reset).
 * A filled honeypot returns success without writing anything.
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

    const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
    const rand = crypto.getRandomValues(new Uint8Array(12));
    let password = '';
    for (const b of rand) password += alphabet[b % alphabet.length];

    const passwordHash = await hashPassword(email, password);
    await db.prepare(
      'INSERT INTO beta_signups (email, password_hash) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash'
    ).bind(email, passwordHash).run();

    return json({ ok: true, password }, 200);
  } catch (e) {
    return json({ ok: false, error: 'server' }, 500);
  }
}
