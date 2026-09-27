/* Cloudflare Pages Function: POST /api/feedback
 * Validates a feedback submission and stores it in D1.
 * Bind a D1 database as FEEDBACK_DB (dashboard: Pages project → Settings →
 * Functions → D1 database bindings) after applying migrations/0001_feedback.sql.
 */
const CATEGORIES = ['wrong-score', 'bug', 'feature', 'other'];

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
    const name = String(body.name || '').trim().slice(0, 120);
    const email = String(body.email || '').trim().toLowerCase().slice(0, 254);
    const category = String(body.category || '');
    const message = String(body.message || '').trim();
    const isTester = body.isTester === true ? 1 : 0;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'bad_email' }, 400);
    if (CATEGORIES.indexOf(category) === -1) return json({ ok: false, error: 'bad_category' }, 400);
    if (message.length < 10 || message.length > 5000) return json({ ok: false, error: 'bad_message' }, 400);

    await db.prepare(
      'INSERT INTO feedback (name, email, is_tester, category, message) VALUES (?, ?, ?, ?, ?)'
    ).bind(name || null, email, isTester, category, message).run();

    return json({ ok: true }, 200);
  } catch (e) {
    return json({ ok: false, error: 'server' }, 500);
  }
}
