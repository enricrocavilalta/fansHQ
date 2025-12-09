USE fanshq;

-- =============================
-- USERS
-- =============================
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(255) NOT NULL UNIQUE,      -- login email
  password      VARCHAR(255) NOT NULL,             -- bcrypt hash
  username      VARCHAR(100) UNIQUE,               -- display name
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- =============================
-- POSTS (main content entity)
-- Supports: text, image, video, audio, file, link, product, poll, AMA, tipjar
-- =============================
CREATE TABLE IF NOT EXISTS posts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,

  -- Author
  user_id INT UNSIGNED NULL,

  -- Basic information
  title        VARCHAR(255) NULL,
  content      TEXT,
  display_text TEXT,

  -- Media
  media_url    VARCHAR(500),
  media_type   ENUM(
    'text',
    'image',
    'video',
    'audio',
    'file',
    'link',
    'product',
    'poll',
    'ama',
    'tipjar',
    'emed'
  ) NOT NULL,
  thumbnail_url TEXT,

  -- Presentation mode
  display_mode ENUM('text', 'image', 'upload', 'embed') DEFAULT 'text',

  -- Poll options (1..10)
  option_1  VARCHAR(255),
  option_2  VARCHAR(255),
  option_3  VARCHAR(255),
  option_4  VARCHAR(255),
  option_5  VARCHAR(255),
  option_6  VARCHAR(255),
  option_7  VARCHAR(255),
  option_8  VARCHAR(255),
  option_9  VARCHAR(255),
  option_10 VARCHAR(255),

  -- Monetization
  price DECIMAL(10,2) DEFAULT 0.00,

  -- Timestamp
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_posts_user (user_id),

  -- If the user is deleted → post stays (owner becomes NULL)
  CONSTRAINT fk_posts_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =============================
-- POLL VOTES (multi-choice)
-- One row per user * option
-- A user can vote multiple options, but not repeat the same one
-- =============================
CREATE TABLE IF NOT EXISTS votes (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  poll_id    INT UNSIGNED NOT NULL,      -- posts.id of a poll post
  user_id    INT UNSIGNED NOT NULL,      -- who voted
  option_num TINYINT UNSIGNED NOT NULL,  -- 1..10
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_vote (poll_id, user_id, option_num),
  INDEX idx_votes_poll (poll_id),
  INDEX idx_votes_user (user_id),

  CONSTRAINT fk_votes_poll FOREIGN KEY (poll_id)
    REFERENCES posts(id) ON DELETE CASCADE,

  CONSTRAINT fk_votes_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================
-- AMA QUESTIONS
-- =============================
CREATE TABLE IF NOT EXISTS questions (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  post_id    INT UNSIGNED NOT NULL,     -- posts.id of an AMA post
  user_id    INT UNSIGNED NULL,         -- may be NULL if anonymous
  question   TEXT NULL,
  tip        DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_q_post (post_id),
  INDEX idx_q_user (user_id),

  CONSTRAINT fk_questions_post FOREIGN KEY (post_id)
    REFERENCES posts(id) ON DELETE CASCADE,

  CONSTRAINT fk_questions_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================
-- TIPS (Tip Jar & AMA tips)
-- Multiple tips per post
-- =============================
CREATE TABLE IF NOT EXISTS tips (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  post_id    INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NULL,         -- who tipped
  amount     DECIMAL(10,2) NOT NULL,    -- amount tipped
  note       VARCHAR(500) NULL,         -- optional message
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_tips_post (post_id),
  INDEX idx_tips_user (user_id),

  CONSTRAINT fk_tips_post FOREIGN KEY (post_id)
    REFERENCES posts(id) ON DELETE CASCADE,

  CONSTRAINT fk_tips_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================
-- ORDERS (Product purchases)
-- =============================
CREATE TABLE IF NOT EXISTS orders (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  buyer_id    INT UNSIGNED NOT NULL,     -- the fan
  creator_id  INT UNSIGNED NOT NULL,     -- post owner
  post_id     INT UNSIGNED NOT NULL,     -- product post id
  title       VARCHAR(255) NOT NULL,     -- snapshot of post.title
  price_cents INT UNSIGNED NOT NULL,     -- snapshot of post.price * 100
  currency    CHAR(3) NOT NULL DEFAULT 'EUR',
  status      ENUM('pending','paid','canceled','refunded')
                NOT NULL DEFAULT 'pending',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at     DATETIME NULL,

  INDEX idx_orders_buyer (buyer_id),
  INDEX idx_orders_creator (creator_id),
  INDEX idx_orders_post (post_id),

  CONSTRAINT fk_orders_buyer FOREIGN KEY (buyer_id)
    REFERENCES users(id) ON DELETE CASCADE,

  CONSTRAINT fk_orders_creator FOREIGN KEY (creator_id)
    REFERENCES users(id) ON DELETE CASCADE,

  CONSTRAINT fk_orders_post FOREIGN KEY (post_id)
    REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================
-- CREATOR SUBSCRIPTION SETTINGS
-- Settings for creators who enable subscriptions
-- =============================
CREATE TABLE IF NOT EXISTS creator_subscription_settings (
  user_id      INT UNSIGNED NOT NULL PRIMARY KEY,
  enabled      TINYINT(1) NOT NULL DEFAULT 1,
  price_cents  INT UNSIGNED NOT NULL DEFAULT 100,
  billing_days INT UNSIGNED NOT NULL DEFAULT 1,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                          ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_css_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================
-- SUBSCRIPTIONS (active users supporting a creator)
-- =============================
CREATE TABLE IF NOT EXISTS subscriptions (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  subscriber_id  INT UNSIGNED NOT NULL,   -- the paying user
  creator_id     INT UNSIGNED NOT NULL,   -- the creator
  start_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_at         DATETIME NOT NULL,
  status         ENUM('active','canceled','expired')
                    NOT NULL DEFAULT 'active',
  price_cents    INT UNSIGNED NOT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (subscriber_id)
    REFERENCES users(id) ON DELETE CASCADE,

  FOREIGN KEY (creator_id)
    REFERENCES users(id) ON DELETE CASCADE,

  INDEX idx_sub_state (subscriber_id, creator_id, end_at, status)
) ENGINE=InnoDB;

select * from questions;
select * from posts;
select * from tips;

ALTER TABLE posts 
MODIFY media_type ENUM(
  'text',
  'image',
  'video',
  'audio',
  'file',
  'link',
  'embed',
  'poll',
  'product',
  'tipjar',
  'ama'
) NOT NULL;

