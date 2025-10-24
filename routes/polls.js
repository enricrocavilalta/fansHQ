const express = require('express');
const router = express.Router();
const isLoggedIn = require('../middleware/auth');
const db = require('../db'); // adjust path to your pool/conn

router.post('/:id/vote', isLoggedIn, async (req, res) => {
  const pollId = Number(req.params.id);
  const userId = req.user?.id;           // set by isLoggedIn

  console.log('[polls] /:id/vote hit', { pollId, body:req.body, userId });

  const choices = Array.isArray(req.body.choices)
    ? req.body.choices.map(Number).filter(Number.isInteger)
    : [];

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query('DELETE FROM poll_votes WHERE poll_id=? AND user_id=?', [pollId, userId]);

    if (choices.length) {
      const tuples = choices.map(opt => [pollId, userId, opt]);
      const placeholders = tuples.map(() => '(?,?,?)').join(',');
      const flat = tuples.flat();
      await conn.query(
        `INSERT INTO poll_votes (poll_id,user_id,option_num) VALUES ${placeholders}`,
        flat
      );
    }

    const [rows] = await conn.query(
      'SELECT option_num, COUNT(*) AS votes FROM poll_votes WHERE poll_id=? GROUP BY option_num',
      [pollId]
    );

    await conn.commit();
    res.json({ ok:true, counts: rows });
  } catch (e) {
    await conn.rollback();
    console.error('[polls] vote error', e);
    res.status(500).json({ ok:false, error:'Failed to save vote' });
  } finally {
    conn.release();
  }
});

module.exports = router;
