export default async function handler(req, res) {
  const slug = req.query.slug;
  const env = globalThis.process?.env || {};
  const apiBase = env.SHARE_API_URL || env.VITE_API_URL;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method not allowed');
  }

  if (typeof slug !== 'string' || !slug || !apiBase) {
    return res.status(500).send('Share preview is not configured');
  }

  let upstreamUrl;
  try {
    upstreamUrl = new URL(`/share/${encodeURIComponent(slug)}`, apiBase);
    if (!['http:', 'https:'].includes(upstreamUrl.protocol)) {
      return res.status(500).send('Share preview URL must use HTTP or HTTPS');
    }
  } catch {
    return res.status(500).send('Share preview URL is invalid');
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { 'user-agent': req.headers['user-agent'] || '' },
      signal: AbortSignal.timeout(10000),
    });
    const html = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    return res.send(html);
  } catch (error) {
    console.error('Share preview proxy error:', error);
    return res.status(502).send('Unable to load share preview');
  }
}