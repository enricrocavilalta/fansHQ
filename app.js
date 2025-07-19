const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express(); // <-- THIS needs to come before any app.use()
app.use(express.static('public'));
// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const session = require('express-session');

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

app.use(session({
  secret: 'change-this-key',
  resave: false,
  saveUninitialized: false
}));

// Make db available in req.db
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Routes
app.use('/posts', require('./routes/posts'));

app.get('/login', (req, res) => {
  res.render('login'); // assumes you have views/login.ejs
});

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

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.get('/signup', (req, res) => {
  res.render('signup');
});

const bcrypt = require('bcrypt');

app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);

  db.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashed], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Signup failed');
    }

    req.session.userId = result.insertId;
    res.redirect('/');
  });
});



app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

app.get('/', (req, res) => {
  db.query('SELECT * FROM posts ORDER BY created_at DESC', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error');
    }

    res.render('posts/index', { posts: results });
  });
});

app.get('/test', (req, res) => {
  res.render('test');
});


// Start server
app.listen(3000, () => {
  console.log('FansHQ running at http://localhost:3000');
});
