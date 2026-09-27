-- UpworkSkore feedback archive. Apply once: wrangler d1 execute upworkskore-feedback --file migrations/0001_feedback.sql
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT NOT NULL,
  is_tester INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback (created_at DESC);
