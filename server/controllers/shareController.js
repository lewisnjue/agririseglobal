const pool = require('../config/db');

const CRAWLER = /facebookexternalhit|Facebot|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot/i;

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const absoluteUrl = (value, request) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value, `${request.protocol}://${request.get('host')}`).toString();
};

const sharePost = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT title, slug, excerpt, featured_image FROM posts WHERE slug = $1 AND status = 'published'",
      [req.params.slug]
    );
    if (result.rows.length === 0) return res.status(404).send('Post not found');

    const post = result.rows[0];
    const frontendBase = (process.env.CLIENT_URL || '').split(',')[0].trim().replace(/\/$/, '');
    const articleUrl = `${frontendBase}/blog/${encodeURIComponent(post.slug)}`;
    const serverBase = (process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const shareLink = `${serverBase}/share/${encodeURIComponent(post.slug)}`;
    const description = post.excerpt || `Read ${post.title} on Agri Rise Global`;
    const image = absoluteUrl(post.featured_image, req).replace(/^http:\/\/(?!localhost)/i, 'https://');

    if (!CRAWLER.test(req.get('user-agent') || '')) {
      return res.redirect(302, articleUrl);
    }

    res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>${escapeHtml(post.title)} | Agri Rise Global</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta property="og:site_name" content="Agri Rise Global">
    <meta property="og:title" content="${escapeHtml(post.title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${escapeHtml(shareLink)}">
    ${image ? `<meta property="og:image" content="${escapeHtml(image)}">
    <meta property="og:image:secure_url" content="${escapeHtml(image)}">
    <meta property="og:image:alt" content="${escapeHtml(post.title)}">` : ''}
    <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
    <meta name="twitter:title" content="${escapeHtml(post.title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    ${image ? `<meta name="twitter:image" content="${escapeHtml(image)}">` : ''}
  </head>
  <body><a href="${escapeHtml(articleUrl)}">${escapeHtml(post.title)}</a></body>
</html>`);
  } catch (err) {
    console.error('Share preview error:', err);
    res.status(500).send('Unable to create share preview');
  }
};

module.exports = { sharePost };