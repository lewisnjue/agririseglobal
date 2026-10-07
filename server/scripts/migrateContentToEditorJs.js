const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');
const pool = require('../config/db');

const DOMPurify = createDOMPurify(new JSDOM('').window);
const decodeHtmlEntities = (text) => String(text || '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/&apos;/gi, "'");

function toEditorDocument(content) {
  try {
    const parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.blocks)) return parsed;
  } catch {
    // Existing HTML is wrapped below.
  }

  return {
    time: Date.now(),
    blocks: [{ type: 'raw', data: { html: DOMPurify.sanitize(content || '', { ADD_ATTR: ['target'] }) } }],
    version: '2.31.0',
  };
}

function extractExcerpt(document) {
  const parts = [];
  for (const block of document.blocks) {
    const data = block.data || {};
    if (typeof data.text === 'string') parts.push(data.text);
    if (block.type === 'raw' && data.html) parts.push(data.html);
    if (Array.isArray(data.items)) parts.push(data.items.map((item) => typeof item === 'string' ? item : item.text || item.content || '').join(' '));
  }
  const plain = decodeHtmlEntities(parts.join(' ').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
  return plain.length > 300 ? `${plain.slice(0, 300)}…` : plain;
}

async function migrate() {
  const result = await pool.query('SELECT id, content FROM posts');
  for (const post of result.rows) {
    const document = toEditorDocument(post.content);
    await pool.query(
      'UPDATE posts SET content = $1, excerpt = $2 WHERE id = $3',
      [JSON.stringify(document), extractExcerpt(document), post.id]
    );
  }
  console.log(`Migrated ${result.rows.length} posts to Editor.js`);
  await pool.end();
}

migrate().catch(async (error) => {
  console.error('Editor.js content migration failed:', error);
  await pool.end();
  process.exitCode = 1;
});
