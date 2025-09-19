app.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Select only what you need; make sure 'password' is the HASH column
  db.query('SELECT id, email, display_name, password FROM users WHERE email = ? LIMIT 1',
    [email],
    async (err, results) => {
      if (err) return res.status(500).send('Server error');
      if (!results || results.length === 0) return res.status(401).send('Invalid credentials');

      const user = results[0];

      // Compare provided password against stored hash
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).send('Invalid credentials');

      // Important: prevent session fixation
      req.session.regenerate(sessErr => {
        if (sessErr) return res.status(500).send('Session error');

        // Store the identity server-side (do NOT store the password/hash)
        req.session.user = {
          id: user.id,
          email: user.email,
          display_name: user.display_name || null
        };

        // Persist then redirect (or send JSON)
        req.session.save(() => res.redirect('/'));
      });
    }
  );
});
