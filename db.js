import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || './data';

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'links.db');

export const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS link_tokens (
      token_hash TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      start_ts INTEGER NOT NULL,
      exp_ts INTEGER NOT NULL,
      used INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_link_active
    ON link_tokens(address, used)
  `);
});
