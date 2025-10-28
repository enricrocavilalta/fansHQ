const bcrypt = require('bcrypt');

app.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashed = await bcrypt.hash(password, 10);

    // derive username from email (everything before @)
    const username = email.split('@')[0];

    const sql = 'INSERT INTO users (email, password, username) VALUES (?, ?, ?)';
    db.query(sql, [email, hashed, username], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Signup failed');
      }

      // set session and redirect
      req.session.userId = result.insertId;
      console.log('✅ New user created:', { id: result.insertId, email, username });
      res.redirect('/');
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});
