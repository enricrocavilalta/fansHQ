app.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err || results.length === 0) return res.status(401).send('Invalid credentials');

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).send('Invalid credentials');

    req.session.userId = user.id;
    res.redirect('/');
  });
});
