const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express(); // <-- THIS needs to come before any app.use()

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Make db available in req.db
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Routes
app.use('/posts', require('./routes/posts'));

// Start server
app.listen(3000, () => {
  console.log('FansHQ running at http://localhost:3000');
});
