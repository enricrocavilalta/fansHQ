const db = require('../db');

async function getCreatorSettings(creatorId) {
  const [rows] = await db.query(
    'SELECT enabled, price_cents, billing_days FROM creator_subscription_settings WHERE user_id=?',
    [creatorId]
  );
  return rows[0] || { enabled: 1, price_cents: 499, billing_days: 30 };
}

async function isSubscribed(subscriberId, creatorId) {
  if (!subscriberId) return false;
  if (subscriberId === creatorId) return true; // creator can see own content
  const [rows] = await db.query(
    `SELECT 1 FROM subscriptions
     WHERE subscriber_id=? AND creator_id=? AND status='active' AND end_at>NOW()
     LIMIT 1`,
    [subscriberId, creatorId]
  );
  return rows.length > 0;
}

module.exports = { getCreatorSettings, isSubscribed };
