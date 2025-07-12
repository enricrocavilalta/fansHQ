const express = require('express');
const router = express.Router();

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
router.post('/', (req, res) => {
  const { title, content, media_url, media_type, price } = req.body;
  req.db.query(
    'INSERT INTO posts (title, content, media_url, media_type, price) VALUES (?, ?, ?, ?, ?)',
    [title, content, media_url, media_type, price],
    (err) => {
      if (err) return res.send('Insert error');
      res.redirect('/posts');
    }
  );
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
