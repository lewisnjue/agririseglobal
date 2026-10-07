const pool = require('./db');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const initDb = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            profile_image TEXT,
            bio TEXT DEFAULT '',
            location VARCHAR(255),
            role VARCHAR(20) DEFAULT 'author' CHECK (role IN ('admin', 'author')),
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        await client.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='profile_image') THEN
              ALTER TABLE users ADD COLUMN profile_image TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bio') THEN
              ALTER TABLE users ADD COLUMN bio TEXT DEFAULT '';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='location') THEN
              ALTER TABLE users ADD COLUMN location VARCHAR(255);
            END IF;
          END $$;
        `);

        // Add role column if it doesn't exist (for existing databases)
        await client.query(`
          DO $$ 
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name='users' AND column_name='role') THEN
              ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'author' CHECK (role IN ('admin', 'author'));
              -- Set first user as admin
              UPDATE users SET role = 'admin' WHERE id = (SELECT MIN(id) FROM users);
            END IF;
          END $$;
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS posts (
            id SERIAL PRIMARY KEY,
            title VARCHAR(500) NOT NULL,
            content TEXT NOT NULL,
            slug VARCHAR(500) UNIQUE NOT NULL,
            featured_image TEXT,
            category VARCHAR(50) DEFAULT 'generic',
            source VARCHAR(20) DEFAULT 'native' CHECK (source IN ('native', 'wordpress')),
            wp_post_id INTEGER,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        await client.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='user_id') THEN
              ALTER TABLE posts ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
            END IF;
          END $$;
        `);

        await client.query(`
          UPDATE posts
          SET user_id = (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
          WHERE user_id IS NULL
            AND EXISTS (SELECT 1 FROM users WHERE role = 'admin');
        `);

        // Add category column if it doesn't exist (for existing databases)
        await client.query(`
          DO $$ 
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name='posts' AND column_name='category') THEN
              ALTER TABLE posts ADD COLUMN category VARCHAR(50) DEFAULT 'generic';
            END IF;
          END $$;
        `);

        await client.query(`
          UPDATE posts
          SET category = 'generic'
          WHERE category IN ('general', '') OR category IS NULL;
        `);

        await client.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name='posts' AND column_name='excerpt') THEN
              ALTER TABLE posts ADD COLUMN excerpt TEXT DEFAULT '';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name='posts' AND column_name='featured_image_caption') THEN
              ALTER TABLE posts ADD COLUMN featured_image_caption TEXT DEFAULT '';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name='posts' AND column_name='description') THEN
              ALTER TABLE posts ADD COLUMN description TEXT DEFAULT '';
            END IF;
          END $$;
        `);

        console.log('Database tables initialized successfully');
      } finally {
        client.release();
      }
      return;
    } catch (err) {
      console.error(`Database connection attempt ${i + 1}/${retries}:`, err.message);
      if (i === retries - 1) throw err;
      await sleep(2000);
    }
  }
};

module.exports = initDb;
