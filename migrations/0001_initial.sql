CREATE TABLE timestamps (
  id TEXT PRIMARY KEY,
  ts TEXT NOT NULL,
  creator_timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
