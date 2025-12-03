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
app.post('/api/posts/:id/ask', ensureAuthPage, async (req, res) => {
  try {
    const postId = req.params.id;

    const user = req.session.user || null;
    const username = user ? user.email : null; // o user.username si tienes

    const { question, tip } = req.body;

    // Aseguramos que tip es número
    const tipNum = Number(tip);
    const safeTip = Number.isFinite(tipNum) ? tipNum : 0;

    console.log('AMA payload:', { postId, username, question, tip, safeTip });

    const [result] = await db.query(
      `INSERT INTO questions (post_id, username, question, tip)
       VALUES (?, ?, ?, ?)`,
      [postId, username, question, safeTip]   //  este orden SÍ cuadra
    );

    const row = {
      id: result.insertId,
      post_id: postId,
      username,
      question,
      tip: safeTip,
      created_at: new Date()
    };

    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
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
    WHERE user_id = (SELECT id FROM users WHERE username = ?)
    ORDER BY created_at DESC
    LIMIT 200;
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


// Subscribe (or reactivate)
app.post('/subscriptions/:username/subscribe', isLoggedIn, async (req, res) => {
  try {
    const [[creator]] = await db.query(
      'SELECT id, sub_is_on FROM users WHERE username=?',
      [req.params.username]
    );
    if (!creator) return res.status(404).send('User not found');
    if (Number(creator.sub_is_on) !== 1) return res.status(400).send('Creator not accepting subs');

    const subscriberId =
      req.user?.id ?? req.session?.user?.id ?? req.session?.userId ?? null;
    if (!subscriberId) return res.status(401).send('Login required');

    await db.query(`
      INSERT INTO subscriptions (subscriber_id, creator_id, status, started_at)
      VALUES (?, ?, 'active', NOW())
      ON DUPLICATE KEY UPDATE status='active', started_at=NOW(), canceled_at=NULL
    `, [subscriberId, creator.id]);

    return res.redirect(`/posts/by/${encodeURIComponent(req.params.username)}`);
  } catch (e) {
    console.error('subscribe error:', e);
    return res.status(500).send('Subscribe failed');
  }
});



// Cancel subscription
app.post('/subscriptions/:username/cancel', isLoggedIn, async (req, res) => {
  try {
    console.log('HIT POST /subscriptions/%s/cancel', req.params.username);

    // find creator
    const [[creator]] = await db.query(
      'SELECT id FROM users WHERE username=?',
      [req.params.username]
    );
    if (!creator) return res.status(404).send('User not found');

    // subscriber (viewer)
    const subscriberId =
      req.user?.id ?? req.session?.user?.id ?? req.session?.userId ?? null;
    if (!subscriberId) return res.status(401).send('Login required');

    // update row
    await db.query(
      `UPDATE subscriptions
         SET status='canceled', canceled_at=NOW()
       WHERE subscriber_id=? AND creator_id=? AND status='active'`,
      [subscriberId, creator.id]
    );

    // back to the wall
    return res.redirect(`/posts/by/${encodeURIComponent(req.params.username)}`);
  } catch (e) {
    console.error('cancel error:', e);
    return res.status(500).send('Cancel failed');
  }
});


// GET settings
app.get('/settings/subscription', isLoggedIn, async (req, res) => {
  const userId = req.user?.id ?? req.session?.userId;
  const [[me]] = await db.query(
    'SELECT username, sub_is_on, sub_price_cents FROM users WHERE id=?',
    [userId]
  );
  res.render('settings/subscription', { me });
});

// Show subscription settings form (creator only)
app.get('/settings/subscription', isLoggedIn, async (req, res) => {
  const userId = req.user?.id ?? req.session?.userId;
  const [[me]] = await db.query(
    'SELECT username, sub_is_on, sub_price_cents FROM users WHERE id=?',
    [userId]
  );
  if (!me) return res.status(404).send('User not found');
  
  // 👇 this line renders your EJS template
  res.render('settings/subscription', { me });
});



app.post('/settings/subscription', isLoggedIn, async (req, res) => {
  const userId = req.user?.id ?? req.session?.userId;
  if (!userId) return res.redirect('/login');

  const sub_is_on = req.body.sub_is_on ? 1 : 0;

  // Convert EUR (string) -> cents (int)
  const eur = parseFloat(String(req.body.sub_price_eur || '0').replace(',', '.'));
  const sub_price_cents = Math.max(0, Math.round((isFinite(eur) ? eur : 0) * 100));

  try {
    await db.query(
      'UPDATE users SET sub_is_on=?, sub_price_cents=? WHERE id=?',
      [sub_is_on, sub_price_cents, userId]
    );
    return res.redirect('/settings/subscription?ok=1');
  } catch (e) {
    console.error('save subscription settings error:', e);
    return res.status(500).send('Could not save settings');
  }
});





// POST /subscriptions/:username/subscribe
app.post('/subscriptions/:username/subscribe', isLoggedIn, async (req, res) => {
  console.log('HIT POST /subscriptions/:username/subscribe');

  try {
    // 1️⃣ Find creator
    const [[creator]] = await db.query(
      'SELECT id, sub_is_on, sub_price_cents FROM users WHERE username=?',
      [req.params.username]
    );

    if (!creator) return res.status(404).send('User not found');
    if (Number(creator.sub_is_on) !== 1)
      return res.status(400).send('Creator not accepting subscriptions');

    // 2️⃣ Identify subscriber
    const subscriberId =
      req.user?.id ?? req.session?.user?.id ?? req.session?.userId;
    if (!subscriberId) return res.status(401).send('Login required');

    // 3️⃣ Determine billing info
    const priceCents = Number(creator.sub_price_cents ?? 100) || 100;

    // optional: read custom billing_days if you have that table, else just use 30
    const [[settings]] = await db.query(
      'SELECT billing_days FROM creator_subscription_settings WHERE user_id=?',
      [creator.id]
    );
    const days =
      Number(settings?.billing_days) > 0 ? Number(settings.billing_days) : 30;

    // 4️⃣ Create or renew subscription
    await db.query(
      `
      INSERT INTO subscriptions (subscriber_id, creator_id, status, started_at, end_at, price_cents)
      VALUES (?, ?, 'active', NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), ?)
      ON DUPLICATE KEY UPDATE
        status='active',
        started_at=NOW(),
        end_at=DATE_ADD(NOW(), INTERVAL ? DAY),
        price_cents=VALUES(price_cents),
        canceled_at=NULL
      `,
      [subscriberId, creator.id, days, priceCents, days]
    );

    // 5️⃣ Redirect back to the creator page
    return res.redirect(`/posts/by/${encodeURIComponent(req.params.username)}`);
  } catch (err) {
    console.error('subscribe error:', err);
    return res.status(500).send('Subscribe failed.');
  }
});




// --- Creator subscription settings page ---
app.get('/settings/subscription', isLoggedIn, async (req, res) => {
  console.log('HIT GET /settings/subscription', { q_ok: req.query.ok });

  const userId = req.user?.id ?? req.session?.userId;
  const [[me]] = await db.query(
    'SELECT username, sub_is_on, sub_price_cents FROM users WHERE id=?',
    [userId]
  );

  return res.render('settings/subscription', {
    me,
    ok: req.query.ok === '1',   // <= pass right here
  });
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FansHQ running at http://localhost:${PORT}`);
});
