require('dotenv').config();

const express = require('express');
const path = require('path');
const methodOverride = require('method-override');
const session = require('express-session');
const bcrypt = require('bcrypt');

const db = require('./db');                 // mysql2/promise pool
const postsRouter = require('./routes/posts');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

app.use(express.urlencoded({ extended: true })); // replaces body-parser
app.use(methodOverride('_method'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev',
  resave: false,
  saveUninitialized: false
}));

// make session available in EJS
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// Parse JSON bodies
app.use(express.json());

// (Optional) parse HTML form posts (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

// routes
app.use('/posts', postsRouter);



app.use((req, _res, next) => {
  console.log(req.method, req.url, 'CT=', req.headers['content-type']);
  next();
});



// POST /api/posts/:postId/ask
app.post("/api/posts/:postId/ask", async (req, res) => {
  try {
    const postId = Number.parseInt(req.params.postId, 10);
    const questionText = (req.body?.question ?? "").trim();

    if (!Number.isFinite(postId)) return res.status(400).json({ message: "Invalid postId" });
    if (!questionText) return res.status(400).json({ message: "No question provided" });

    // Read user id regardless of how you stored it (object or flat)
    const userId =
      (req.session && req.session.user && req.session.user.id) ??
      (req.session && req.session.userId) ??
      null;

    // TEMP: log once to confirm what the server sees
    console.log("[ask] session user:", req.session?.user, "userId:", req.session?.userId);

    await db.execute(
      "INSERT INTO questions (post_id, user_id, question) VALUES (?, ?, ?)",
      [postId, userId, questionText]
    );

    return res.status(201).json({ message: "Question saved!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});




// home -> feed
app.get('/', (req, res) => res.redirect('/posts'));

app.get('/login', (req, res) => res.render('login'));

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).send('Invalid credentials');

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).send('Invalid credentials');

    req.session.userId = user.id;
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Login failed');
  }
});

app.get('/signup', (req, res) => res.render('signup'));

app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO users (email, password) VALUES (?, ?)',
      [email, hashed]
    );
    req.session.userId = result.insertId;
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Signup failed');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FansHQ running at http://localhost:${PORT}`);
});
