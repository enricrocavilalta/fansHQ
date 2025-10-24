// middleware/auth.js
function isLoggedIn(req, res, next) {
  console.log('🔒 isLoggedIn middleware triggered');

  const uid = req.session?.userId;
  if (uid) {
    console.log('✅ User is logged in:', uid);
    // normalize for all routes/templates
    req.user = req.user || { id: uid };
    res.locals.user = res.locals.user || req.user;
    return next();
  }

  console.log('❌ User not logged in');

  // If it's an API/AJAX/JSON request, return 401 JSON
  const wantsJSON =
    req.path.startsWith('/api') ||
    req.xhr ||
    (req.headers.accept && req.headers.accept.includes('application/json'));

  if (wantsJSON) {
    return res.status(401).json({ ok: false, error: 'Login required' });
  }

  // Otherwise, do the normal web redirect
  res.redirect('/login');
}

module.exports = isLoggedIn;
