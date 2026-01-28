import express from 'express';
import crypto from 'crypto';
import { db } from './db.js';
import { sign, verify, hashToken } from './crypto.js';

const app = express();
app.use(express.json());

const now = () => Math.floor(Date.now() / 1000);

/* ───────────────── CREATE LINK ───────────────── */

app.post('/link/create', (req, res) => {
  const { address, start } = req.body;

  if (!address || !start || start <= now()) {
    return res.status(400).json({ error: 'invalid_request' });
  }

  const payload = {
    id: crypto.randomUUID(),
    a: address,
    start,
    exp: start + 60,
    v: 1,
  };

  const payloadBase64 = Buffer
    .from(JSON.stringify(payload))
    .toString('base64url');

  const sig = sign(payloadBase64);
  const token = `${payloadBase64}.${sig}`;
  const tokenHash = hashToken(token);

  db.run(
    `
    INSERT INTO link_tokens
      (token_hash, address, start_ts, exp_ts, created_at)
    VALUES (?, ?, ?, ?, ?)
    `,
    [tokenHash, address, payload.start, payload.exp, now()],
    err => {
      if (err) {
        return res.status(409).json({ error: 'link_exists' });
      }
      res.json({ token });
    }
  );
});

/* ───────────────── RESOLVE LINK ───────────────── */

app.post('/link/resolve', (req, res) => {
  const { token } = req.body;

  if (!token || !token.includes('.')) {
    return res.json({ status: 'used' });
  }

  const [payloadBase64, sig] = token.split('.');
  if (!verify(payloadBase64, sig)) {
    return res.json({ status: 'used' });
  }

  const tokenHash = hashToken(token);

  db.get(
    `SELECT * FROM link_tokens WHERE token_hash = ?`,
    [tokenHash],
    (err, row) => {
      if (!row || row.used) {
        return res.json({ status: 'used' });
      }

      if (now() < row.start_ts) {
        return res.json({
          status: 'tooEarly',
          secondsLeft: row.start_ts - now(),
        });
      }

      if (now() > row.exp_ts) {
        return res.json({ status: 'expired' });
      }

      res.json({ status: 'ready' });
    }
  );
});

/* ───────────────── CONSUME LINK ───────────────── */

app.post('/link/consume', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).end();

  const tokenHash = hashToken(token);

  db.run(
    `
    UPDATE link_tokens
    SET used = 1
    WHERE token_hash = ? AND used = 0
    `,
    [tokenHash],
    function () {
      if (this.changes === 0) {
        return res.status(409).json({ ok: false });
      }
      res.json({ ok: true });
    }
  );
});

/* ───────────────── HEALTH (RAILWAY) ───────────────── */

app.get('/health', (_, res) => {
  res.json({ ok: true });
});

/* ───────────────── START ───────────────── */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Link Authority running on port ${PORT}`);
});
