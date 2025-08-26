// routes/posts.js
const express = require('express');
const router = express.Router();

const multer = require('multer');
const path = require('path');

const db = require('../db');
const isLoggedIn = require('../middleware/auth');



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
  res.render(`posts/new_${type}`, { mode:'create', type, post:{}, action:'/posts', submitLabel:'Create', cancelHref:'/posts' });
});


// ---------- EDIT: reuse new_<type>.ejs ----------
router.get('/:id/edit', isLoggedIn, async (req, res) => {
  const id = Number(req.params.id);
  const [rows] = await db.execute('SELECT * FROM posts WHERE id = ?', [id]);
  const post = rows[0];
  if (!post) return res.status(404).send('Not found');

  // if (post.user_id !== req.session.userId) return res.status(403).send('Forbidden');

  const type = (post.display_mode || post.media_type || 'text').toLowerCase();
  const viewByType = {
    text:'new_text', image:'new_image', video:'new_video', audio:'new_audio',
    link:'new_link', file:'new_file', poll:'new_poll', product:'new_product',
    tipjar:'new_tipjar', ama:'new_ama'
  };
  const view = viewByType[type] || 'new_text';

  res.render(`posts/${view}`, {
    mode: 'edit',
    type,
    post,
    action: `/posts/${id}?_method=PUT`,
    submitLabel: 'Save changes'
  });
});

// ---------- Posts by user ----------
router.get('/by/:userId', async (req, res) => {
  const userId = Number(req.params.userId);
  try {
    const [rows] = await db.query(`
      SELECT p.*, u.email
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `, [userId]);
    if (!rows.length) return res.send('This user has no posts.');
    const posts = rows.map(r => ({ ...r, price: r.price == null ? null : Number(r.price) }));
    res.render('posts/index', { posts });
  } catch (err) {
    console.error('SQL Error:', err.message);
    res.status(500).send('Database error: ' + err.message);
  }
});

// ---------- CREATE ----------
router.post(
  '/',
  isLoggedIn,
  upload.fields([{ name: 'media_file', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]),
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
    if (mediaUrlFromBody && mediaUrlFromBody.trim() !== '') media_url = mediaUrlFromBody.trim();
    else if (mediaFile) media_url = `/uploads/${mediaFile.filename}`;

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
          option_6, option_7, option_8, option_9, option_10,
          votes_1, votes_2, votes_3, votes_4, votes_5,
          votes_6, votes_7, votes_8, votes_9, votes_10
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          option_6 || null, option_7 || null, option_8 || null, option_9 || null, option_10 || null,
          ...Array(10).fill(0)
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
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, u.email, p.id AS post_id
      FROM posts p
      LEFT JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
    `);
    res.render('posts/index', { posts: rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  }
});

// ---------- UPDATE (accept files on edit) ----------
router.put(
  '/:id',
  isLoggedIn,
  upload.fields([{ name: 'media_file', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]),
  async (req, res) => {
    const id = Number(req.params.id);

    const {
      title,
      content,
      media_url: mediaUrlFromBody,   // optional URL replacement
      display_mode,
      media_type
    } = req.body || {};

    const mediaFile = req.files?.['media_file']?.[0];
    const thumbFile = req.files?.['thumbnail']?.[0];

    const updates = [];
    const params  = [];

    // Always allow text edits
    if (typeof title   !== 'undefined') { updates.push('title = ?');   params.push(title || null); }
    if (typeof content !== 'undefined') { updates.push('content = ?'); params.push(content || null); }

    // Replace image via URL or uploaded file (URL wins if both provided)
    if (mediaUrlFromBody && mediaUrlFromBody.trim() !== '') {
      updates.push('media_url = ?'); params.push(mediaUrlFromBody.trim());
    } else if (mediaFile) {
      updates.push('media_url = ?'); params.push(`/uploads/${mediaFile.filename}`);
    }

    // Replace thumbnail if provided
    if (thumbFile) {
      updates.push('thumbnail_url = ?'); params.push(`/uploads/${thumbFile.filename}`);
    }

    // (Optional) persist/normalize type
    if (display_mode) { updates.push('display_mode = ?'); params.push(display_mode); }
    if (media_type)   { updates.push('media_type = ?');   params.push(media_type);   }

    if (!updates.length) return res.redirect('/posts'); // nothing to change

    //updates.push('updated_at = NOW()'); // if you have this column
    const sql = `UPDATE posts SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);

    await db.execute(sql, params);
    return res.redirect('/posts');
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

module.exports = router; // keep this ONCE, at the very end
