const express = require('express');
const router = express.Router();

router.get('/colorpicker', (req, res) => {
  res.render('/colorpicker'); // Renders views/tools/colorpicker.ejs
});

module.exports = router;
