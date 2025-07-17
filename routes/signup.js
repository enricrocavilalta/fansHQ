const bcrypt = require('bcrypt');

app.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashed = await bcrypt.hash(password, 10);

    const sql = 'INSERT INTO users (email, password) VALUES (?, ?)';
    db.query(sql, [email, hashed], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Signup failed');
      }

      // Set session and redirect
      req.session.userId = result.insertId;
      console.log('✅ New user logged in with ID:', req.session.userId);
      res.redirect('/');
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});
