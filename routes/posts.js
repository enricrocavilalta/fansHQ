const express = require('express');
const router = express.Router();

const multer = require('multer');
const path = require('path');

const db = require('../db');

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
router.get('/', (req, res) => {
  req.db.query('SELECT * FROM posts ORDER BY created_at DESC', (err, results) => {
    if (err) return res.send('Database error');
    res.render('posts/index', { posts: results });
  });
});

// Show new post form
router.get('/new', (req, res) => {
  res.render('posts/new');
});

// Create a new post
router.post('/', upload.single('media_file'), async (req, res) => {
  const { title, content, media_type, price } = req.body;
  const media_url = req.file ? `/uploads/${req.file.filename}` : req.body.media_url;

  try {
    await db.execute(
  'INSERT INTO posts (title, content, media_type, media_url, price) VALUES (?, ?, ?, ?, ?)',
  [
    title ?? null,
    content ?? null,
    media_type ?? null,
    media_url ?? null,
    price !== undefined && price !== '' ? parseFloat(price) : 0
  ]
);

    res.redirect('/posts');
  } catch (err) {
    console.error('INSERT ERROR:', err.message);
    console.error(err); // 🔍 Esto mostrará todo el error con más detalles
    res.send('Error saving post');
  }
});


module.exports = router;

// Show edit form
router.get('/:id/edit', (req, res) => {
  const id = req.params.id;
  req.db.query('SELECT * FROM posts WHERE id = ?', [id], (err, results) => {
    if (err || results.length === 0) return res.send('Post not found');
    res.render('posts/edit', { post: results[0] });
  });
});

// Handle edit submit
router.post('/:id', (req, res) => {
  const id = req.params.id;
  const { title, content, media_url, media_type, price } = req.body;
  req.db.query(
    'UPDATE posts SET title = ?, content = ?, media_url = ?, media_type = ?, price = ? WHERE id = ?',
    [title, content, media_url, media_type, price, id],
    (err) => {
      if (err) return res.send('Update failed');
      res.redirect('/posts');
    }
  );
});

// Handle delete
router.post('/:id/delete', (req, res) => {
    console.log('BODY:', req.body);
    console.log('FILE:', req.file);
    
  const id = req.params.id;
  req.db.query('DELETE FROM posts WHERE id = ?', [id], (err) => {
    if (err) return res.send('Delete failed');
    res.redirect('/posts');
  });
});

// Show form for each content type
router.get('/new/:type', (req, res) => {
  const type = req.params.type;
  const validTypes = ['text', 'image', 'video', 'audio', 'link', 'download', 'poll', 'product'];

  if (!validTypes.includes(type)) return res.status(404).send('Invalid content type');
  
  res.render(`posts/new_${type}`, { type });
});



router.post('/', upload.single('media_file'), async (req, res) => {
  const { title, content, media_type, price } = req.body;
  const media_url = req.file ? `/uploads/${req.file.filename}` : req.body.media_url;

  try {
    await db.execute(
      'INSERT INTO posts (title, content, media_type, media_url, price) VALUES (?, ?, ?, ?, ?)',
      [title, content || null, media_type, media_url || null, price || 0]
    );
    res.redirect('/posts');
  } catch (err) {
    console.error(err);
    res.send('Error saving post');
  }
});



