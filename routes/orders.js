// routes/orders.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// --------------------------------------------------
// CREATE ORDER (fan clicks Buy)
// --------------------------------------------------
router.post('/', async (req, res, next) => {
  try {
    // ⚙️ if you use sessions/passport, you'll still have req.user here
    const buyerId = req.user ? req.user.id : null;
    const { post_id } = req.body;

    // 1) validate product post
    const [rows] = await db.query(
      `SELECT id, user_id AS creator_id, media_type, title, price
       FROM posts WHERE id = ? LIMIT 1`,
      [post_id]
    );

    const post = rows[0];
    if (!post || post.media_type !== 'product') {
      return res.status(400).send('Invalid product.');
    }

    // 2) convert price
    const priceCents = Math.round(Number(post.price) * 100);
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      return res.status(400).send('Invalid price.');
    }

    // 3) create order
    const [result] = await db.query(
      `INSERT INTO orders
         (buyer_id, creator_id, post_id, title, price_cents, currency, status)
       VALUES (?, ?, ?, ?, ?, 'EUR', 'pending')`,
      [buyerId, post.creator_id, post.id, post.title || 'Product', priceCents]
    );

    const orderId = result.insertId;

    // 4) redirect to order summary
    res.redirect(`/orders/${orderId}`);
  } catch (err) {
    next(err);
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
