CREATE TABLE articles (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(200) NOT NULL UNIQUE,
  title VARCHAR(300) NOT NULL,
  meta_title VARCHAR(300),
  meta_description VARCHAR(400),
  excerpt TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'alcohol',
  cover_url TEXT,
  cover_alt VARCHAR(300),
  content TEXT NOT NULL DEFAULT '',
  cta_type VARCHAR(30) NOT NULL DEFAULT 'consult',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  author VARCHAR(200),
  views INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_articles_status ON articles(status, published_at DESC);
CREATE INDEX idx_articles_category ON articles(category);