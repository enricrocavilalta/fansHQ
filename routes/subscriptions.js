const express = require('express');
const router = express.Router();
const db = require('../db');
const isLoggedIn = require('../middleware/auth');
//const { getCreatorSettings } = require('../lib/subscriptions');


// inline helper (replace the missing ../lib/subscriptions)
async function getCreatorSettings(creatorId) {
  const [rows] = await db.query(
    'SELECT enabled, price_cents, billing_days FROM creator_subscription_settings WHERE user_id=?',
    [creatorId]
  );
  return rows[0] || { enabled: 1, price_cents: 499, billing_days: 30 };
}



// Subscribe (mock payment succeeds)
router.post('/api/subscriptions/:creatorId/subscribe', isLoggedIn, async (req, res) => {
  const subscriberId = req.user.id;
  const creatorId = Number(req.params.creatorId);
  if (subscriberId === creatorId) return res.status(400).json({ ok:false, error:'Cannot subscribe to yourself' });

  const settings = await getCreatorSettings(creatorId);
  if (!settings.enabled) return res.status(400).json({ ok:false, error:'Creator not accepting subscribers' });

  // already active?
  const [[{ cnt }]] = await db.query(
    `SELECT COUNT(*) AS cnt
       FROM subscriptions
      WHERE subscriber_id=? AND creator_id=? AND status='active' AND end_at>NOW()`,
    [subscriberId, creatorId]
  );
  if (cnt > 0) return res.json({ ok:true, already:true });

  // mock payment -> create sub
  const [nowRow] = await db.query('SELECT NOW() AS now');
  const start = new Date(nowRow[0].now);
  const end = new Date(start.getTime() + settings.billing_days * 86400000);

  await db.query(
    `INSERT INTO subscriptions (subscriber_id, creator_id, start_at, end_at, status, price_cents)
     VALUES (?,?,?,?, 'active', ?)`,
    [subscriberId, creatorId, start, end, settings.price_cents]
  );

  res.json({ ok:true, start, end, price_cents: settings.price_cents });
});

// Cancel (keeps access until end_at)
router.post('/api/subscriptions/:creatorId/cancel', isLoggedIn, async (req, res) => {
  const subscriberId = req.user.id;
  const creatorId = Number(req.params.creatorId);

  const [rows] = await db.query(
    `SELECT id FROM subscriptions
      WHERE subscriber_id=? AND creator_id=? AND status='active' AND end_at>NOW()
      ORDER BY start_at DESC LIMIT 1`,
    [subscriberId, creatorId]
  );
  if (!rows.length) return res.json({ ok:true, already:false });

  await db.query('UPDATE subscriptions SET status="canceled" WHERE id=?', [rows[0].id]);
  res.json({ ok:true, canceled:true });
});

module.exports = router;
