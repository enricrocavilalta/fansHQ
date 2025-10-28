const { getCreatorSettings } = require('../lib/subscriptions');

router.get('/u/:username', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [req.params.username]);
  if (!rows.length) return res.status(404).send('User not found');
  const creator = rows[0];

  // Fetch posts (you probably already do this)
  const [posts] = await db.query(
    'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC',
    [creator.id]
  );

  let viewerIsSubscribed = false;
  let creatorSettings = null;

  if (req.user) {
    // Get the creator's subscription settings (price, etc.)
    creatorSettings = await getCreatorSettings(creator.id);

    // Check if current viewer is subscribed
    const [subRows] = await db.query(
      `SELECT 1 FROM subscriptions
       WHERE subscriber_id=? AND creator_id=? AND status='active' AND end_at>NOW()
       LIMIT 1`,
      [req.user.id, creator.id]
    );
    viewerIsSubscribed = subRows.length > 0;
  } else {
    // not logged in, still show price
    creatorSettings = await getCreatorSettings(creator.id);
  }

  res.render('users/show', {
    creator,
    posts,
    viewerIsSubscribed,
    creatorSettings
  });
});
