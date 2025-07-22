const express = require('express');
const router = express.Router();

const multer = require('multer');
const path = require('path');

const db = require('../db');

const isLoggedIn = require('../middleware/auth');

const session = require('express-session');


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/'); // make sure this folder exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });


// Show all posts
router.get('/', async(req, res) => {
  const [results] = await db.query("SELECT posts.*, users.email FROM posts LEFT JOIN users ON users.id = posts.user_id ORDER BY posts.created_at DESC;"); 
    res.render('posts/index', { posts: results });
  });


// Show new post form
router.get('/new', isLoggedIn, (req, res) => {
  res.render('posts/new');
});

router.get('/by/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  console.log('✅ Route triggered for userId:', userId);

  try {
    const [results] = await db.query(`
      SELECT posts.*, users.email
      FROM posts
      JOIN users ON users.id = posts.user_id
      WHERE posts.user_id = ?
      ORDER BY posts.created_at DESC
    `, [userId]);

    console.log('📦 Posts retrieved:', results.length);
    console.log('🧾 Sample post:', results[0]);

    if (results.length === 0) {
      return res.send('🕳️ This user has no posts.');
    }

    res.render('posts/index', { posts: results });

  } catch (err) {
    console.error('❌ SQL Error:', err.message);
    res.status(500).send('Database error: ' + err.message);
  }
});











// Create a new post
router.post('/', isLoggedIn, upload.fields([
  { name: 'media_file', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
  console.log('📨 req.body:', req.body);
 const {
  user_id,
  title,
  content,
  media_type,
  media_url: fallback_url,
  display_text,
  display_mode,
  price,
  option_1,
  option_2,
  option_3,
  option_4,
  option_5,
  option_6,
  option_7,
  option_8,
  option_9,
  option_10
} = req.body;


  
  // Obtener los archivos subidos
const mediaFile = req.files?.['media_file']?.[0];
const thumbnailFile = req.files?.['thumbnail']?.[0];

// Construir URLs según qué archivo se subió
let media_url = null;
let final_thumbnail_url = null;
let final_display_text = null;

if (req.body.media_url && req.body.media_url.trim() !== '') {
  media_url = req.body.media_url.trim();
} else if (mediaFile) {
  media_url = `/uploads/${mediaFile.filename}`;
} else {
  media_url = null;
}


if (thumbnailFile) {
    final_thumbnail_url = `/uploads/${thumbnailFile.filename}`;
} else if (display_mode === 'text') {
    final_display_text = display_text || null;
}



  // Debug para comprobar qué llega
  console.log('🧠 media_type:', media_type);
  console.log('🧠 display_mode:', display_mode);
  //console.log('🧠 media_url:', media_url);
  console.log('🧠 thumbnail_url:', final_thumbnail_url);
  console.log('🧠 req.files:', req.files);

  const userId = req.session.userId;

  console.log('Session userId:', req.session.userId);

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
    media_type || null,
    media_url,
    final_display_text,
    final_thumbnail_url,
    display_mode || null,
    price || 0,
    req.body.option_1 || null, req.body.option_2 || null, req.body.option_3 || null,
    req.body.option_4 || null, req.body.option_5 || null, req.body.option_6 || null,
    req.body.option_7 || null, req.body.option_8 || null, req.body.option_9 || null,
    req.body.option_10 || null,
    ...Array(10).fill(0)
  ]
);

    res.redirect('/posts');
  } catch (err) {
    console.error('INSERT ERROR:', err.message);
    res.send('Error saving post');
  }
});





module.exports = router;

// Show edit form
router.get('/:id/edit', isLoggedIn, async (req, res) => {
  const id = req.params.id;

  try {
    const [results] = await db.query('SELECT * FROM posts WHERE id = ?', [id]);

    if (results.length === 0) {
      return res.send('Post not found');
    }

    res.render('posts/edit', { post: results[0] });
  } catch (err) {
    console.error('❌ Error loading post:', err.message);
    res.status(500).send('Database error');
  }
});



// Handle edit submit
router.post('/:id', isLoggedIn, async (req, res) => {
  const id = req.params.id;
  const { title, content, media_url, media_type, price } = req.body;

  try {
    const [result] = await db.query(
      'UPDATE posts SET title = ?, content = ?, media_url = ?, media_type = ?, price = ? WHERE id = ?',
      [title, content, media_url, media_type, price, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).send('Post not found or not updated');
    }

    res.redirect('/posts');
  } catch (err) {
    console.error('❌ Update error:', err.message);
    res.status(500).send('Update failed');
  }
});


// Handle delete
router.post('/:id/delete', isLoggedIn, async (req, res) => {
  const id = req.params.id;

  try {
    const [result] = await db.query('DELETE FROM posts WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).send('Post not found or already deleted');
    }

    res.redirect('/posts');
  } catch (err) {
    console.error('❌ Delete error:', err.message);
    res.status(500).send('Delete failed');
  }
});


// Show form for each content type
router.get('/new/:type', isLoggedIn,(req, res) => {
  const type = req.params.type;
  const validTypes = ['text', 'image', 'video', 'audio', 'link', 'download', 'poll', 'product', 'tipjar', 'ama'];

  if (!validTypes.includes(type)) return res.status(404).send('Invalid content type');
  
  res.render(`posts/new_${type}`, { type });
});




