// routes/orders.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// --------------------------------------------------
// CREATE ORDER (fan clicks Buy)
// --------------------------------------------------
router.post('/', async (req, res, next) => {
  try {
    console.log('[orders] session.userId =', req.session?.userId, 'req.user?.id =', req.user?.id);

    const buyerId = req.session?.userId || req.user?.id || null;
    if (!buyerId) {
      return res.status(401).send('Login required');
    }

    const postId = Number(req.body.post_id);
    if (!Number.isFinite(postId)) {
      return res.status(400).send('Invalid product id.');
    }

    const [rows] = await db.query(
      `SELECT id, user_id AS creator_id, media_type, title, price
       FROM posts WHERE id = ? LIMIT 1`,
      [postId]
    );
    const post = rows[0];

    const kind = (post?.media_type || '').toString().trim().toLowerCase();
    if (!post || kind !== 'product') {
      return res.status(400).send('Invalid product.');
    }

    // Parse price robustly (0 not allowed)
    const raw = (post.price ?? '').toString();
    const priceCents = Math.round(Number.parseFloat(raw.replace(/[€\s]/g,'').replace(',', '.')) * 100);
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      return res.status(400).send('Invalid price.');
    }

    const [result] = await db.query(
      `INSERT INTO orders
         (buyer_id, creator_id, post_id, title, price_cents, currency, status)
       VALUES (?, ?, ?, ?, ?, 'EUR', 'pending')`,
      [buyerId, post.creator_id, post.id, post.title || 'Product', priceCents]
    );

    const orderId = result.insertId;
    return res.redirect(`/orders/${orderId}`);
  } catch (e) {
    next(e);
  }
});


// --------------------------------------------------
// SHOW ORDER PAGE
// --------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT o.*, u.email AS buyer_email
       FROM orders o
       JOIN users u ON u.id = o.buyer_id
       WHERE o.id = ?`,
      [req.params.id]
    );

    const order = rows[0];
    if (!order) return res.status(404).send('Order not found');

    res.render('orders/show', { order });
  } catch (err) {
    next(err);
  }
});

// --------------------------------------------------
module.exports = router;
