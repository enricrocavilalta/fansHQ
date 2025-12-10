// routes/posts.js
const express = require('express');
const router = express.Router();

const multer = require('multer');
const path = require('path');

const db = require('../db');
const isLoggedIn = require('../middleware/auth');







//const { getCreatorSettings, isSubscribed } = require('../lib/subscriptions');
// --- inline subscription helpers (no external require) ---
async function getCreatorSettings(creatorId) {
  const [rows] = await db.query(
    'SELECT enabled, price_cents, billing_days FROM creator_subscription_settings WHERE user_id=?',
    [creatorId]
  );
  return rows[0] || { enabled: 1, price_cents: 100, billing_days: 1 };
}

async function isSubscribed(subscriberId, creatorId) {
  if (!subscriberId) return false;
  if (subscriberId === creatorId) return true; // creator sees own content
  const [rows] = await db.query(
    `SELECT 1 FROM subscriptions
     WHERE subscriber_id=? AND creator_id=? AND status='active' AND end_at>NOW()
     LIMIT 1`,
    [subscriberId, creatorId]
  );
  return rows.length > 0;
}



function getFormView(mediaType) {
  switch (mediaType) {
    case 'text':    return 'posts/new_text';
    case 'image':   return 'posts/new_image';
    case 'video':   return 'posts/new_video';
    case 'embed':   return 'posts/new_video';  // reuse the video form
    case 'audio':   return 'posts/new_audio';
    case 'file':    return 'posts/new_file';
    case 'link':    return 'posts/new_link';
    case 'poll':    return 'posts/new_poll';
    case 'product': return 'posts/new_product';
    case 'tipjar':  return 'posts/new_tipjar';
    case 'ama':     return 'posts/new_ama';
    default:        return 'posts/new_text';
  }
}



// --- end inline helpers ---




router.use((req, res, next) => {
  console.log('[posts]', req.method, req.originalUrl);
  next();
});


// ---------- Multer (uploads) ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ---------- Debug ----------
router.get('/_debug', async (req, res) => {
  const [[countRow]] = await db.query('SELECT COUNT(*) AS n FROM posts');
  const [sample] = await db.query('SELECT id,title,created_at FROM posts ORDER BY id DESC LIMIT 5');
  res.json({ db: process.env.DB_NAME, rows: countRow.n, sample });
});
router.get('/ping', (req, res) => res.send('posts router OK'));

// ---------- NEW: text ----------
const VALID_TYPES = ['text','image','video','audio','link','file','poll','product','tipjar','ama'];
router.get('/new/:type', isLoggedIn, (req,res)=>{
  const type = String(req.params.type||'').toLowerCase();
  if (!VALID_TYPES.includes(type)) return res.status(404).send('Invalid content type');
  const view = getFormView(type);
  res.render(view, {
    mode: 'create',                        // create mode
    post: {},                              // empty object so EJS can safely use post.*
    type,                                  // used by <%= type %>
    mediaType: type,                       // if you use it anywhere else
    action: '/posts',                      // form will POST here to create
    submitLabel: 'CREATE POST'                      
  });
});


// ---------- EDIT: reuse new_<type>.ejs ----------

// routes/posts.js
// EDIT (reuses new_<type>.ejs)
// routes/posts.js
// EDIT (reuses new_<type>.ejs)
router.get('/:id/edit', isLoggedIn, async (req, res) => {
  const id = Number(req.params.id);
  const [rows] = await db.execute('SELECT * FROM posts WHERE id = ?', [id]);
  const post = rows[0];
  if (!post) return res.status(404).send('Not found');





  
  const type = (post.media_type).toLowerCase();


  const view = getFormView(post.media_type);
  res.render(view, { 
    mode: 'edit',                          // edit mode
    post,                                  // prefill fields
    type,                                  // same as above
    mediaType: type,                       // optional
    action: `/posts/${id}?_method=PUT`,     // where the form will submit to update 
    submitLabel: 'UPDATE POST'
  });
});

const RESERVED = new Set([
  'logout','login','register','feed','posts','api','static','assets','settings','subscriptions'
]);




// ---------- Posts by user (hard paywall, by username) ----------
router.get('/by/:username', async (req, res) => {
  try {
    const username = req.params.username;

    // 1) Creator
    const [userRows] = await db.query(
      'SELECT id, username, sub_is_on, sub_price_cents FROM users WHERE username = ?',
      [username]
    );
    if (!userRows.length) return res.status(404).send('User not found');

    const creator   = userRows[0];
    const creatorId = Number(creator.id);

    // 2) Viewer
    const viewerId = Number((req.user?.id) || (req.session?.userId) || 0);
    const viewingOwnProfile = viewerId === creatorId;

    // 3) Subscription status
    let viewerIsSubscribed = false;
    if (!viewingOwnProfile && viewerId) {
      const [rows] = await db.query(
        `SELECT 1 FROM subscriptions
         WHERE subscriber_id=? AND creator_id=? AND LOWER(status)='active' LIMIT 1`,
        [viewerId, creatorId]
      );
      viewerIsSubscribed = rows.length > 0;
    }

    // 4) Posts (only if allowed)
    let posts = [];
    if (viewingOwnProfile || viewerIsSubscribed) {
      [posts] = await db.query(`
        SELECT p.*, u.username, u.email, u.username
        FROM posts p
        JOIN users u ON u.id = p.user_id
        WHERE p.user_id=?
        ORDER BY p.created_at DESC
      `, [creatorId]);
    }

    // 5) define ok BEFORE using or logging it
    const ok = req.query.ok === '1';

    // (optional) debug
    console.log('creator passed to view:', creator);
    console.log({ viewerId, viewingOwnProfile, viewerIsSubscribed, sub_is_on: creator.sub_is_on, ok });

    // 6) Render
    return res.render('posts/by_user', {
      creator,
      posts,
      viewerIsSubscribed: viewingOwnProfile || viewerIsSubscribed,
      viewingOwnProfile,
      ok, // pass to EJS
    });
  } catch (err) {
    console.error('by/:username error:', err);
    return res.status(500).send('Server error');
  }
});






// ---------- CREATE ----------
router.post('/', isLoggedIn, upload.fields([{ name: 'media_file', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]),
  async (req, res) => {
    // debug
    console.log('CREATE HIT:', {
      ct: req.headers['content-type'],
      bodyKeys: Object.keys(req.body || {}),
      hasMedia: !!(req.files?.['media_file']?.[0]),
      hasThumb: !!(req.files?.['thumbnail']?.[0]),
    });

    const {
      title,
      content,
      media_type,
      media_url: mediaUrlFromBody,
      display_text,
      display_mode,
      price,
      option_1, option_2, option_3, option_4, option_5,
      option_6, option_7, option_8, option_9, option_10
    } = req.body || {};

    const mediaFile = req.files?.['media_file']?.[0];
    const thumbnailFile = req.files?.['thumbnail']?.[0];

    
    
    let media_url = null;

    // 1st priority: NEW uploaded file
    if (mediaFile) {
      media_url = `/uploads/${mediaFile.filename}`;
    }
    // 2nd priority: URL / old file path from body
    else if (mediaUrlFromBody && mediaUrlFromBody.trim() !== '') {
      media_url = mediaUrlFromBody.trim();
    }



    const final_thumbnail_url = thumbnailFile ? `/uploads/${thumbnailFile.filename}` : null;
    const final_display_text  = (!final_thumbnail_url && display_mode === 'text') ? (display_text || null) : null;

    const userId = req.session.userId;
    if (!userId) return res.status(401).send('Login required');

    try {
      await db.execute(
        `INSERT INTO posts (
          user_id, title, content, media_type, media_url, display_text,
          thumbnail_url, display_mode, price,
          option_1, option_2, option_3, option_4, option_5,
          option_6, option_7, option_8, option_9, option_10
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          title || null,
          content || null,
          media_type || display_mode || 'text',
          media_url,
          final_display_text,
          final_thumbnail_url,
          display_mode || media_type || 'text',
          price || 0,
          option_1 || null, option_2 || null, option_3 || null, option_4 || null, option_5 || null,
          option_6 || null, option_7 || null, option_8 || null, option_9 || null, option_10 || null
        ]
      );

      return res.redirect('/posts');
    } catch (err) {
      console.error('INSERT ERROR:', err);
      return res.status(500).send('Error saving post: ' + err.message);
    }
  }
);

// ---------- FEED (REAL QUERY; remove the stub) ----------


// ---------- UPDATE (accept files on edit) ----------
router.put(
  '/:id',
  isLoggedIn,
  upload.fields([
    { name: 'media_file', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  async (req, res) => {
    const postId = req.params.id;

    const {
      title,
      content,
      media_type,
      media_url: mediaUrlFromBody,   // old file path OR link
      display_text,
      display_mode,
      price,
      option_1, option_2, option_3, option_4, option_5,
      option_6, option_7, option_8, option_9, option_10
    } = req.body || {};

    const mediaFile     = req.files?.['media_file']?.[0] || null;
    const thumbnailFile = req.files?.['thumbnail']?.[0] || null;

    // 🔥 1) Decide media_url (NEW FILE > BODY VALUE)
    let media_url = null;

    if (mediaFile) {
      // new uploaded file wins
      media_url = `/uploads/${mediaFile.filename}`;
    } else if (mediaUrlFromBody && mediaUrlFromBody.trim() !== '') {
      // keep whatever was in the form (old file path or link)
      media_url = mediaUrlFromBody.trim();
    } else {
      media_url = null;
    }

    // 🔥 2) Thumbnail (same idea, optional)
    const oldThumbnailFromBody = req.body.existing_thumbnail_url || null;
    let thumbnail_url = oldThumbnailFromBody;

    if (thumbnailFile) {
      thumbnail_url = `/uploads/${thumbnailFile.filename}`;
    }

    // 🔥 3) Display text logic, same as in create
    const final_display_text =
      (!thumbnail_url && display_mode === 'text') ? (display_text || null) : null;

    try {
      await db.execute(
        `UPDATE posts
         SET
           title = ?,
           content = ?,
           media_type = ?,
           media_url = ?,
           display_text = ?,
           thumbnail_url = ?,
           display_mode = ?,
           price = ?,
           option_1 = ?, option_2 = ?, option_3 = ?, option_4 = ?, option_5 = ?,
           option_6 = ?, option_7 = ?, option_8 = ?, option_9 = ?, option_10 = ?
         WHERE id = ?`,
        [
          title || null,
          content || null,
          media_type || display_mode || 'text',
          media_url,
          final_display_text,
          thumbnail_url,
          display_mode || media_type || 'text',
          price || 0,
          option_1 || null, option_2 || null, option_3 || null, option_4 || null, option_5 || null,
          option_6 || null, option_7 || null, option_8 || null, option_9 || null, option_10 || null,
          postId
        ]
      );

      return res.redirect('/posts');
    } catch (err) {
      console.error('UPDATE ERROR:', err);
      return res.status(500).send('Error updating post: ' + err.message);
    }
  }
);




// ---------- DELETE ----------
router.delete('/:id', isLoggedIn, async (req, res) => {
  const id = Number(req.params.id);
  const [result] = await db.execute('DELETE FROM posts WHERE id = ?', [id]);
  const affected = result.affectedRows ?? result.rowCount ?? 0;
  if (req.xhr) return res.sendStatus(affected ? 204 : 404);
  return res.redirect('/posts');
});



router.get('/_routes', (req, res) => {
  const list = router.stack
    .filter(l => l.route)
    .map(l => ({ path: l.route.path, methods: Object.keys(l.route.methods) }));
  res.json(list);
});


// POST /posts/:postId/tip  (HTML form submit or fetch)
router.post('/:postId/tip', async (req, res) => {
  try {
    const postId = Number.parseInt(req.params.postId, 10);

    // accept either "amount" or legacy "tip" from your form
    const amount = Number(req.body?.amount ?? req.body?.tip);
    const note   = (req.body?.note ?? '').slice(0, 500).trim() || null;

    if (!Number.isFinite(postId))      return res.status(400).send('Bad postId');
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
      return res.status(400).send('Bad amount');
    }

    // who tipped: user id from the session (app-level guard can enforce login)
    const userId = req.session?.user?.id ?? req.session?.userId ?? null;

    await db.execute(
      'INSERT INTO tips (post_id, user_id, amount, note) VALUES (?, ?, ?, ?)',
      [postId, userId, amount, note]
    );

    // If it’s a form post, redirect back; if it’s XHR/fetch, send JSON.
    const wantsJSON = req.headers['content-type']?.includes('application/json') ||
                      req.headers['accept']?.includes('application/json');

    if (wantsJSON) return res.status(201).json({ ok: true, post_id: postId, amount, note });
    return res.redirect(req.get('Referer') || '/posts');
  } catch (e) {
    console.error(e);
    return res.status(500).send('Tip failed');
  }
});







module.exports = router; // keep this ONCE, at the very end
