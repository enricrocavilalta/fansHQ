// routes/posts.js
const express = require('express');
const router = express.Router();

const multer = require('multer');
const path = require('path');

const db = require('../db');
const isLoggedIn = require('../middleware/auth');

router.use((req,res,next)=>{ console.log('[posts]', req.method, req.originalUrl); next(); });


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

  //console.log(type);

  const viewByType = {
    text:'new_text', image:'new_image', video:'new_video', audio:'new_audio',
    link:'new_link', file:'new_file', poll:'new_poll', product:'new_product',
    tipjar:'new_tipjar', ama:'new_ama'
  };
  const view = viewByType[type];

  res.render(`posts/${view}`, {
    mode: 'edit',
    type,
    post,
    action: `/posts/${id}?_method=PUT`,
    submitLabel: 'Update',
    cancelHref: '/posts'
  });
});




/*
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
*/
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

    // --- helpers to normalize body fields ---
    const pickOne = v => Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
    const normLower = v => String(pickOne(v)).trim().toLowerCase();
    const normStr   = v => String(pickOne(v)).trim();

    const {
      title,
      content,
      media_url: mediaUrlFromBodyRaw, // may be '', url, or undefined/array
      display_mode,
      media_type,
    } = req.body || {};

    const mediaFile = req.files?.['media_file']?.[0];
    const thumbFile = req.files?.['thumbnail']?.[0];

    const updates = [];
    const params  = [];

    // text fields (keep exactly what user sent)
    if (typeof title   !== 'undefined') { updates.push('title = ?');   params.push(pickOne(title)); }
    if (typeof content !== 'undefined') { updates.push('content = ?'); params.push(pickOne(content)); }

    // ---- media_url decision (URL or file or clear) ----
    const bodyHadMediaUrl = Object.prototype.hasOwnProperty.call(req.body || {}, 'media_url');
    const mediaUrlFromBody = bodyHadMediaUrl ? normStr(mediaUrlFromBodyRaw) : undefined;

    let newMediaUrl; // undefined = don't touch; string = set; null = clear

    if (mediaFile) newMediaUrl = `/uploads/${mediaFile.filename}`;   // file candidate

    if (bodyHadMediaUrl) {                                           // form had media_url field → it wins
      newMediaUrl = mediaUrlFromBody === '' ? null : mediaUrlFromBody;
    }

    if (newMediaUrl !== undefined) {
      updates.push('media_url = ?');
      params.push(newMediaUrl);
    }

    // thumbnail
    if (thumbFile) {
      updates.push('thumbnail_url = ?');
      params.push(`/uploads/${thumbFile.filename}`);
    }

    // normalize types safely (only if provided & non-empty)
    const dm = normLower(display_mode);   // '' if missing
    const mt = normLower(media_type);
    if (dm) { updates.push('display_mode = ?'); params.push(dm); }
    if (mt) { updates.push('media_type   = ?'); params.push(mt); }

    // debug
    console.log('PUT media debug:', {
      bodyHadMediaUrl, mediaUrlFromBody, hasFile: !!mediaFile, decided: newMediaUrl, dm, mt
    });

    if (!updates.length) return res.redirect('/posts');

    const sql = `UPDATE posts SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);

    await db.execute(sql, params);
    res.redirect('/posts');
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




module.exports = router; // keep this ONCE, at the very end
