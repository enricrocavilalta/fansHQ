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
  user_id   INT NULL,
  option_id INT NOT NULL,
  PRIMARY KEY (post_id, user_id)   -- one vote per user per post but Id rather have multiple choice.
);
describe votes;
drop table votes;

-- Adjust BIGINT UNSIGNED to match your posts.id / users.id types!
CREATE TABLE questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NULL,
  question TEXT NULL,
  tip DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
describe questions;

CREATE TABLE tips (
  post_id INT PRIMARY KEY,
  tip DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
describe tips;

ALTER TABLE posts
DROP COLUMN votes_1,
DROP COLUMN votes_2,
DROP COLUMN votes_3,
DROP COLUMN votes_4,
DROP COLUMN votes_5,
DROP COLUMN votes_6,
DROP COLUMN votes_7,
DROP COLUMN votes_8,
DROP COLUMN votes_9,
DROP COLUMN votes_10;

describe posts;
SHOW TABLES LIKE 'questions';
drop table questions;
describe questions;
select * from questions;

CREATE USER 'fanshq'@'localhost' IDENTIFIED BY 'strong-pass-here';
GRANT ALL PRIVILEGES ON fanshq.* TO 'fanshq'@'localhost';
FLUSH PRIVILEGES;
drop table tips;

CREATE TABLE IF NOT EXISTS tips (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  post_id   INT NOT NULL,
  user_id   INT NULL,
  amount    DECIMAL(10,2) NOT NULL,
  note      VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tips_post (post_id),
  INDEX idx_tips_user (user_id),
  CONSTRAINT fk_tips_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
select * from posts;

CREATE TABLE orders (
  id            BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  buyer_id      BIGINT UNSIGNED NOT NULL,       -- the fan (current user)
  creator_id    BIGINT UNSIGNED NOT NULL,       -- the influencer (post.owner)
  post_id       BIGINT UNSIGNED NOT NULL,       -- the product post
  title         VARCHAR(255) NOT NULL,          -- snapshot from post.title
  price_cents   INT UNSIGNED NOT NULL,          -- snapshot from post.price
  currency      CHAR(3) NOT NULL DEFAULT 'EUR',
  status        ENUM('pending','paid','canceled','refunded') NOT NULL DEFAULT 'pending',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at       DATETIME NULL,
  INDEX (buyer_id),
  INDEX (creator_id),
  INDEX (post_id),
  UNIQUE KEY (order_uuid)
);
describe orders;
drop table orders;
ALTER TABLE orders DROP COLUMN order_uuid;
select * from orders;
describe votes;
drop table votes;
CREATE TABLE IF NOT EXISTS votes (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  poll_id    BIGINT UNSIGNED NOT NULL,       -- posts.id of the poll
  user_id    BIGINT UNSIGNED NOT NULL,       -- who voted
  option_num TINYINT UNSIGNED NOT NULL,      -- 1..10
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_vote (poll_id, user_id, option_num),
  INDEX idx_poll (poll_id),
  INDEX idx_user (user_id)
);
select * from poll_votes;

CREATE TABLE creator_subscription_settings (
  user_id INT PRIMARY KEY,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  price_cents INT NOT NULL DEFAULT 100,
  billing_days INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
drop table subscriptions;
CREATE TABLE subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subscriber_id INT NOT NULL,
  creator_id INT NOT NULL,
  start_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_at DATETIME NOT NULL,
  status ENUM('active','canceled','expired') NOT NULL DEFAULT 'active',
  price_cents INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subscriber_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sub_state (subscriber_id, creator_id, end_at, status)
);
DESCRIBE users;
select * from users;

