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

app.use(methodOverride('_method'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev',
  resave: false,
  saveUninitialized: false
}));

// auth guards
const ensureAuthPage = (req, res, next) => {
  const uid = req.session?.user?.id ?? req.session?.userId;
  if (uid) return next();
  return res.redirect('/login');
};

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
app.use('/posts', ensureAuthPage, postsRouter);



// normalize req.user from the session for every request
app.use((req, res, next) => {
  if (req.session && req.session.userId) {
    req.user = req.user || {};
    req.user.id = Number(req.session.userId);
  }
  next();
});



app.use((req, _res, next) => {
  console.log(req.method, req.url, 'CT=', req.headers['content-type']);
  next();
});

app.post('/logout', (req, res) => req.session.destroy(() => res.redirect('/login')));


app.get('/logout', (req, res) => {
  req.session?.destroy(()=>{});
  req.logout?.();
  res.redirect('/login');
});


// POST /api/posts/:postId/ask
app.post('/api/posts/:postId/ask', ensureAuthPage, async (req, res) => {
  const postId = Number.parseInt(req.params.postId, 10);
  const questionText = (req.body?.question ?? '').trim();
  if (!Number.isFinite(postId)) return res.status(400).json({ message: 'Invalid postId' });
  if (!questionText) return res.status(400).json({ message: 'No question provided' });

  const userId = req.session?.user?.id ?? req.session?.userId; // <- unified
  await db.execute(
    'INSERT INTO questions (post_id, user_id, question) VALUES (?, ?, ?)',
    [postId, userId, questionText]
  );
  res.status(201).json({ message: 'Question saved!' });
});








// home -> feed
app.get('/', ensureAuthPage, (req, res) => res.redirect('/posts'));

app.get('/login', (req, res) => res.render('login'));



app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.execute('SELECT id, email, password FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).send('Invalid credentials');

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).send('Invalid credentials');

    req.session.regenerate(err => {
      if (err) return res.status(500).send('Session error');

      // store consistent shape
      req.session.user = { id: user.id, email: user.email };
      // (optional) also keep userId for legacy
      req.session.userId = user.id;

      req.session.save(() => res.redirect('/posts'));
    });
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





const isLoggedIn = require('./middleware/auth');//  no { }
const ordersRouter = require('./routes/orders');
//const { isLoggedIn } = require('./middleware/auth');

console.log('isLoggedIn type =', typeof isLoggedIn);  // should print "function"

app.use('/orders', ordersRouter);



const pollsRouter = require('./routes/polls');
app.use(pollsRouter);

// parsers BEFORE routers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// mount router at the API prefix
app.use('/api/polls', pollsRouter);



app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(require('./routes/subscriptions'));



console.log('📦 Connected pool to DB:', process.env.DB_NAME, 'on', process.env.DB_HOST);





// --- helper function ---
function emailToHandle(email) {
  if (!email) return null;
  const [local, domainRaw] = String(email).split('@');
  const domain = (domainRaw || '').toLowerCase();
  let base = local.replace(/\+.*$/, '');
  if (domain === 'gmail.com') base = base.replace(/\./g, '');
  return base.toLowerCase();
}

// --- reserved words (so /feed doesn't get mistaken for username) ---
const RESERVED = new Set(['feed', 'api', 'posts', 'static', 'assets']);

// --- FEED (no create form) ---
app.get('/feed', async (req, res) => {
  const [posts] = await db.query(`
    SELECT * FROM posts ORDER BY created_at DESC LIMIT 200
  `);
  res.render('posts/index', { posts, pageHeading: 'Feed', canPost: false });
});

// --- USER PAGE (/username) ---
app.get('/:handle', async (req, res, next) => {
  const handle = String(req.params.handle || '').toLowerCase();
  if (!handle || RESERVED.has(handle)) return next(); // skip if reserved

  const [posts] = await db.query(`
    SELECT * FROM posts
    WHERE LOWER(
      CASE
        WHEN LOWER(SUBSTRING_INDEX(email,'@',-1))='gmail.com'
          THEN REPLACE(SUBSTRING_INDEX(SUBSTRING_INDEX(email,'@',1), '+', 1), '.', '')
        ELSE SUBSTRING_INDEX(SUBSTRING_INDEX(email,'@',1), '+', 1)
      END
    ) = ?
    ORDER BY created_at DESC
    LIMIT 200
  `, [handle]);

  const userHandle = emailToHandle(req.user?.email);
  const canPost = userHandle === handle; // owner check

  res.render('posts/index', {
    posts,
    pageHeading: `Posts by ${handle}`,
    canPost
  });
});

app.use((req,res,next)=>{ console.log('HIT', req.method, req.path); next(); });




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FansHQ running at http://localhost:${PORT}`);
});
