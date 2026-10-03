const pool = require('../config/db');
const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');

const DOMPurify = createDOMPurify(new JSDOM('').window);

const decodeHtmlEntities = (text) => String(text || '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/&apos;/gi, "'");

const slugify = (text) => {
  const base = String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return base || `post-${Date.now()}`;
};

const TEXT_FIELDS_BY_TYPE = {
  paragraph: ['text'],
  header: ['text'],
  quote: ['text', 'caption'],
  warning: ['title', 'message'],
  image: ['caption'],
};

const sanitizeListItem = (item) => {
  if (typeof item === 'string') return DOMPurify.sanitize(item);

  const out = { ...item };
  if (out.content !== undefined) out.content = DOMPurify.sanitize(out.content || '');
  if (out.text !== undefined) out.text = DOMPurify.sanitize(out.text || '');
  if (Array.isArray(out.items)) out.items = out.items.map(sanitizeListItem);
  return out;
};

const sanitizeEditorData = (raw) => {
  let document;
  try {
    document = typeof raw === 'string' ? JSON.parse(raw) : raw;
    // Edit forms may send the JSON document as an already-stringified field.
    if (typeof document === 'string') {
      try {
        document = JSON.parse(document);
      } catch {
        document = { time: Date.now(), blocks: [{ type: 'raw', data: { html: document } }] };
      }
    }
  } catch {
    throw new Error('Invalid content format');
  }
  if (!document || !Array.isArray(document.blocks)) throw new Error('Invalid content format');

  return {
    ...document,
    blocks: document.blocks.map((block) => {
      const data = { ...(block.data || {}) };
      if (block.type === 'raw') {
        data.html = DOMPurify.sanitize(data.html || '', { ADD_ATTR: ['target'] });
      } else if (block.type === 'list' || block.type === 'checklist') {
        data.items = (data.items || []).map(sanitizeListItem);
      } else if (block.type === 'table') {
        data.content = (data.content || []).map((row) => row.map((cell) => DOMPurify.sanitize(cell || '')));
      } else {
        for (const field of TEXT_FIELDS_BY_TYPE[block.type] || []) {
          if (data[field]) data[field] = DOMPurify.sanitize(data[field], { ADD_ATTR: ['target'] });
        }
      }

      if (block.type === 'image' && data.file?.url && !/^https?:\/\//i.test(data.file.url)) data.file.url = '';
      if (block.type === 'embed' && data.embed && !/^https?:\/\//i.test(data.embed)) data.embed = '';
      return { ...block, data };
    }),
  };
};

const extractExcerpt = (document, maxLength = 300) => {
  const parts = [];
  for (const block of document.blocks) {
    const data = block.data || {};
    if (typeof data.text === 'string') parts.push(data.text);
    if (block.type === 'raw' && data.html) parts.push(data.html);
    if (Array.isArray(data.items)) {
      parts.push(data.items.map((item) => typeof item === 'string' ? item : item.text || item.content || '').join(' '));
    }
  }
  const plain = decodeHtmlEntities(parts.join(' ')).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return plain.length > maxLength ? `${plain.slice(0, maxLength)}…` : plain;
};

const canManagePost = (user, post) => user?.role === 'admin' || Number(post.user_id) === Number(user?.id);

// Public: list published posts (paginated)
const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const category = req.query.category;

    let countQuery = "SELECT COUNT(*) FROM posts WHERE status = 'published'";
    let dataQuery = "SELECT p.id, p.title, p.slug, p.featured_image, p.category, p.source, p.status, p.created_at, p.updated_at, p.excerpt, u.id AS author_id, u.name AS author_name, u.profile_image AS author_profile_image, u.bio AS author_bio, u.location AS author_location FROM posts p LEFT JOIN users u ON u.id = p.user_id WHERE p.status = 'published'";
    const queryParams = [];

    if (category && category !== 'all') {
      countQuery += " AND category = $1";
      dataQuery += " AND p.category = $1";
      queryParams.push(category);
    }

    dataQuery += " ORDER BY created_at DESC LIMIT $" + (queryParams.length + 1) + " OFFSET $" + (queryParams.length + 2);
    queryParams.push(limit, offset);

    const countResult = await pool.query(countQuery, category && category !== 'all' ? [category] : []);
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(dataQuery, queryParams);

    res.json({
      posts: result.rows,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Public: get single post by slug
const getPostBySlug = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT p.*, u.id AS author_id, u.name AS author_name, u.profile_image AS author_profile_image, u.bio AS author_bio, u.location AS author_location FROM posts p LEFT JOIN users u ON u.id = p.user_id WHERE p.slug = $1 AND p.status = 'published'",
      [req.params.slug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json({ post: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Admin: list all posts (including drafts)
const getAllPosts = async (req, res) => {
  try {
    const query = req.user.role === 'admin'
      ? 'SELECT p.id, p.title, p.slug, p.featured_image, p.category, p.source, p.status, p.created_at, p.updated_at, p.user_id, u.name AS author_name FROM posts p LEFT JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC'
      : 'SELECT p.id, p.title, p.slug, p.featured_image, p.category, p.source, p.status, p.created_at, p.updated_at, p.user_id, u.name AS author_name FROM posts p LEFT JOIN users u ON u.id = p.user_id WHERE p.user_id = $1 ORDER BY p.created_at DESC';
    const result = await pool.query(
      query,
      req.user.role === 'admin' ? [] : [req.user.id]
    );
    res.json({ posts: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Admin: get single post by id (full content for editing)
const getPostById = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM posts WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (!canManagePost(req.user, result.rows[0])) return res.status(403).json({ error: 'You can only manage your own posts' });
    res.json({ post: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Admin: create post
const createPost = async (req, res) => {
  try {
    const { title, content, featured_image, category, status } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    let document;
    try {
      document = sanitizeEditorData(content);
    } catch {
      return res.status(400).json({ error: 'Invalid content format' });
    }

    let slug = slugify(title);
    const safeSlug = slug || `post-${Date.now()}`;

    const result = await pool.query(
      'INSERT INTO posts (title, content, excerpt, slug, featured_image, category, status, source, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [title, JSON.stringify(document), extractExcerpt(document), safeSlug, featured_image || null, category || 'generic', status || 'draft', 'native', req.user.id]
    ).catch((err) => {
      if (err.code === '23505') {
        const retrySlug = `${safeSlug}-${Date.now()}`;
        return pool.query(
          'INSERT INTO posts (title, content, excerpt, slug, featured_image, category, status, source, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
          [title, JSON.stringify(document), extractExcerpt(document), retrySlug, featured_image || null, category || 'generic', status || 'draft', 'native', req.user.id]
        );
      }
      throw err;
    });

    res.status(201).json({ post: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Admin: update post
const updatePost = async (req, res) => {
  try {
    const { title, content, featured_image, category, status } = req.body;
    const { id } = req.params;

    const existing = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = existing.rows[0];
    if (!canManagePost(req.user, post)) return res.status(403).json({ error: 'You can only edit your own posts' });
    const newTitle = title || post.title;
    let newContent = post.content;
    let newExcerpt = post.excerpt || '';
    if (content) {
      try {
        const document = sanitizeEditorData(content);
        newContent = JSON.stringify(document);
        newExcerpt = extractExcerpt(document);
      } catch {
        return res.status(400).json({ error: 'Invalid content format' });
      }
    }
    const newImage = featured_image !== undefined ? featured_image : post.featured_image;
    const newCategory = category !== undefined ? category : (post.category || 'generic');
    const newStatus = status || post.status;

    const result = await pool.query(
      'UPDATE posts SET title = $1, content = $2, excerpt = $3, featured_image = $4, category = $5, status = $6, updated_at = NOW() WHERE id = $7 RETURNING *',
      [newTitle, newContent, newExcerpt, newImage, newCategory, newStatus, id]
    );

    res.json({ post: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Admin: delete post
const deletePost = async (req, res) => {
  try {
    const existing = await pool.query('SELECT user_id FROM posts WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    if (!canManagePost(req.user, existing.rows[0])) return res.status(403).json({ error: 'You can only delete your own posts' });
    const result = await pool.query(
      'DELETE FROM posts WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getPosts, getPostBySlug, getAllPosts, getPostById, createPost, updatePost, deletePost };
