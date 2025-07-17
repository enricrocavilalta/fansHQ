// middleware/auth.js
function isLoggedIn(req, res, next) {
  console.log('🔒 isLoggedIn middleware triggered');
  console.log('Session:', req.session);
  if (req.session.userId) {
    console.log('✅ User is logged in');
    return next();
  }
  console.log('❌ User not logged in. Redirecting...');
  res.redirect('/login');
}


module.exports = isLoggedIn;
