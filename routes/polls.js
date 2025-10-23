// routes/polls.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const isLoggedIn = require('../middleware/auth'); // you have default export

// Vote (multi-choice)
router.post('/:id/vote', isLoggedIn, async (req, res, next) => {
  try {
    const pollId = Number(req.params.id);
    const userId = req.session?.userId || req.user?.id;

    if (!Number.isFinite(pollId)) return res.status(400).send('Bad poll id');
    if (!userId) return res.status(401).send('Login required');

    // coerce to array: supports choices=3 or choices=[1,3,5]
    let choices = req.body.choices;
    if (choices == null) choices = [];
    if (!Array.isArray(choices)) choices = [choices];
    choices = choices.map(c => Number(c)).filter(n => Number.isFinite(n) && n >= 1 && n <= 10);

    // Load poll to know which options exist
    const [rows] = await db.query(
      `SELECT id,
              option_1, option_2, option_3, option_4, option_5,
              option_6, option_7, option_8, option_9, option_10
       FROM posts
       WHERE id=? AND media_type='poll' LIMIT 1`,
      [pollId]
    );
    const poll = rows[0];
    if (!poll) return res.status(404).send('Poll not found');

    // Keep only choices that actually exist (non-null/non-empty labels)
    const validChoices = choices.filter(i => {
      const label = poll[`option_${i}`];
      return label != null && String(label).trim() !== '';
    });

    // Replace user’s previous votes atomically
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query('DELETE FROM poll_votes WHERE poll_id=? AND user_id=?', [pollId, userId]);

      if (validChoices.length) {
        const values = validChoices.map(i => [pollId, userId, i]);
        await conn.query(
          'INSERT INTO poll_votes (poll_id,user_id,option_num) VALUES ?',
          [values]
        );
      }

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    // Return counts (for AJAX) or redirect (for normal form)
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      const [counts] = await db.query(
        `SELECT option_num, COUNT(*) AS votes
         FROM poll_votes
         WHERE poll_id=?
         GROUP BY option_num`,
        [pollId]
      );
      return res.json({ ok: true, counts });
    }

    res.redirect('back'); // or res.redirect(`/posts/${pollId}`)
  } catch (err) {
    next(err);
  }
});

module.exports = router;
