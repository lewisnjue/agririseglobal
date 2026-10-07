const pool = require('../config/db');

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const publicImageUrl = (value, baseUrl) => {
  if (!value || /^data:/i.test(value)) return '';
  try {
    const imageUrl = new URL(value, baseUrl);
    if (!['http:', 'https:'].includes(imageUrl.protocol)) return '';
    if (imageUrl.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(imageUrl.hostname)) {
      imageUrl.protocol = 'https:';
    }
    return imageUrl.toString();
  } catch {
    return '';
  }
};

const sharePost = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT title, slug, excerpt, description, featured_image, featured_image_caption FROM posts WHERE slug = $1 AND status = 'published'",
      [req.params.slug]
    );
    if (result.rows.length === 0) return res.status(404).send('Post not found');

    const post = result.rows[0];
    const frontendBase = (process.env.CLIENT_URL || '').split(',')[0].trim().replace(/\/$/, '');
    const serverBase = (process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const articleUrl = frontendBase ? `${frontendBase}/blog/${encodeURIComponent(post.slug)}` : '';
    const shareLink = `${serverBase}/share/${encodeURIComponent(post.slug)}`;
    const rawDescription = String(post.description || post.excerpt || '').trim();
    const description = rawDescription
      ? (rawDescription.length > 200 ? `${rawDescription.slice(0, 197)}…` : rawDescription)
      : `Read ${post.title} on Agri Rise Global`;
    const imageAlt = post.featured_image_caption || post.title;
    const image = publicImageUrl(post.featured_image, serverBase)
      || publicImageUrl(process.env.DEFAULT_OG_IMAGE, serverBase);
    const safeArticleUrl = JSON.stringify(articleUrl).replace(/</g, '\\u003c');

    res.set('Cache-Control', 'public, max-age=300, s-maxage=300');
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
    <meta property="og:url" content="${escapeHtml(articleUrl || shareLink)}">
    ${image ? `<meta property="og:image" content="${escapeHtml(image)}">
    <meta property="og:image:secure_url" content="${escapeHtml(image)}">
    <meta property="og:image:alt" content="${escapeHtml(imageAlt)}">` : ''}
    <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
    <meta name="twitter:title" content="${escapeHtml(post.title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    ${image ? `<meta name="twitter:image" content="${escapeHtml(image)}">
    <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}">` : ''}
    ${articleUrl ? `<meta http-equiv="refresh" content="0;url=${escapeHtml(articleUrl)}">` : ''}
  </head>
  <body>
    ${articleUrl ? `<script>window.location.replace(${safeArticleUrl});</script>` : ''}
    <a href="${escapeHtml(articleUrl || shareLink)}">${escapeHtml(post.title)}</a>
  </body>
</html>`);
  } catch (err) {
    console.error('Share preview error:', err);
    res.status(500).send('Unable to create share preview');
  }
};

module.exports = { sharePost };