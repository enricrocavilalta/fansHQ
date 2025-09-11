USE fanshq;

CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255),
  content TEXT,
  media_url VARCHAR(500),
  media_type ENUM(
    'image',
    'video',
    'audio',
    'text',
    'link',
    'file',
    'poll',
    'product'
  ) NOT NULL,
  price DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

show tables;

ALTER TABLE posts MODIFY COLUMN title VARCHAR(255) NULL;

ALTER TABLE posts
ADD COLUMN display_text TEXT,
ADD COLUMN display_mode ENUM('text', 'image') DEFAULT 'text',
ADD COLUMN thumbnail_url TEXT;

describe posts;

SELECT id, media_url FROM posts WHERE media_type = 'image';

USE fanshq;select * from posts;

ALTER TABLE posts
ADD COLUMN option_1 VARCHAR(255),
ADD COLUMN option_2 VARCHAR(255),
ADD COLUMN option_3 VARCHAR(255),
ADD COLUMN option_4 VARCHAR(255),
ADD COLUMN option_5 VARCHAR(255),
ADD COLUMN option_6 VARCHAR(255),
ADD COLUMN option_7 VARCHAR(255),
ADD COLUMN option_8 VARCHAR(255),
ADD COLUMN option_9 VARCHAR(255),
ADD COLUMN option_10 VARCHAR(255),
ADD COLUMN votes_1 INT DEFAULT 0,
ADD COLUMN votes_2 INT DEFAULT 0,
ADD COLUMN votes_3 INT DEFAULT 0,
ADD COLUMN votes_4 INT DEFAULT 0,
ADD COLUMN votes_5 INT DEFAULT 0,
ADD COLUMN votes_6 INT DEFAULT 0,
ADD COLUMN votes_7 INT DEFAULT 0,
ADD COLUMN votes_8 INT DEFAULT 0,
ADD COLUMN votes_9 INT DEFAULT 0,
ADD COLUMN votes_10 INT DEFAULT 0;

ALTER TABLE posts 
MODIFY media_type ENUM('text', 'image', 'video', 'audio', 'link', 'poll', 'product', 'ama', 'tipjar', 'file');

UPDATE posts 
SET media_type = 'file' 
WHERE media_type = 'download';

ALTER TABLE posts ADD COLUMN display_mode VARCHAR(20) DEFAULT NULL;


SELECT id, media_type, display_mode FROM posts ORDER BY id DESC LIMIT 5;

ALTER TABLE posts MODIFY display_mode ENUM('text', 'image', 'upload', 'embed');

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  username VARCHAR(100) UNIQUE
);
select * from users;

ALTER TABLE posts
ADD COLUMN user_id INT,
ADD CONSTRAINT fk_user
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE SET NULL;

SELECT posts.*, SUBSTRING_INDEX(users.email, '@', 1) AS username
FROM posts
JOIN users ON posts.user_id = users.id
ORDER BY posts.created_at DESC;

ALTER TABLE posts
ADD CONSTRAINT fk_user_id
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;

delete FROM posts;
SHOW COLUMNS FROM posts;
 describe users;
 SHOW COLUMNS FROM posts;
 
 UPDATE posts SET media_type = 'file' WHERE media_type = 'download';
SET SQL_SAFE_UPDATES = 0;
ALTER TABLE posts 
MODIFY media_type ENUM('text', 'image', 'video', 'audio', 'link', 'file', 'poll', 'product', 'ama', 'tipjar');

DROP TABLE IF EXISTS posts;

CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  media_type ENUM(
    'text', 'image', 'video', 'audio',
    'link', 'file', 'product', 'poll',
    'ama', 'tipjar'
  ),
  display_mode VARCHAR(20),
  title VARCHAR(255),
  content TEXT,
  media_url VARCHAR(255),
  thumbnail_url VARCHAR(255),
  price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE posts ADD COLUMN display_text TEXT;

SHOW COLUMNS FROM posts;

DESCRIBE posts;
SELECT title, price FROM posts ORDER BY created_at DESC LIMIT 5;
SELECT posts.id AS post_id, posts.user_id, posts.title, posts.content, posts.media_type, posts.media_url, posts.created_at, users.email, posts.price FROM posts LEFT JOIN users ON users.id = posts.user_id ORDER BY posts.created_at DESC;
SELECT DATABASE() db, CURRENT_USER() user;
select * from posts;
SET SQL_SAFE_UPDATES = 0;
delete from posts where id=94;

CREATE TABLE votes (
  post_id   INT NOT NULL,
  user_id   INT NOT NULL,
  option_id INT NOT NULL,
  PRIMARY KEY (post_id, user_id)   -- one vote per user per post
);
describe votes;
drop table votes;
CREATE TABLE questions (
  post_id INT PRIMARY KEY,
  question VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
describe questions;

CREATE TABLE tips (
  post_id INT PRIMARY KEY,
  tip DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
describe tips;


