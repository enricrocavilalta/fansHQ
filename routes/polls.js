// routes/polls.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const isLoggedIn = require('../middleware/auth'); // you have default export

// Vote (multi-choice)
router.post('/api/polls/:id/vote', isLoggedIn, async (req, res) => {
  const pollId = Number(req.params.id);
  const userId = req.user.id;

  // Expect { choices: [1,3,5] }
  const choices = Array.isArray(req.body.choices)
    ? req.body.choices.map(n => Number(n)).filter(Number.isInteger)
    : [];

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      'DELETE FROM poll_votes WHERE poll_id = ? AND user_id = ?',
      [pollId, userId]
    );

    if (choices.length) {
      const values = choices.map(opt => [pollId, userId, opt]);
      // MySQL bulk insert
      await conn.query(
        'INSERT INTO poll_votes (poll_id, user_id, option_num) VALUES ?',
        [values]
      );
    }

    // Return fresh counts for this poll
    const [rows] = await conn.query(
      'SELECT option_num, COUNT(*) AS votes FROM poll_votes WHERE poll_id = ? GROUP BY option_num',
      [pollId]
    );

    await conn.commit();
    res.json({ ok: true, counts: rows });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ ok: false, error: 'Failed to save vote' });
  } finally {
    conn.release();
  }
});

module.exports = router;
