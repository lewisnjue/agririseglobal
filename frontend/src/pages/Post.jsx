import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { assetUrl, postsApi, shareUrl } from '../services/api';
import EditorJsRenderer from '../components/EditorJsRenderer';

function AuthorAvatar({ image, name }) {
  return image ? <img src={image} alt={name} className="w-10 h-10 rounded-full object-cover" /> : <span className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center" aria-label={`${name || 'Author'} profile placeholder`}><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v3h16v-3c0-2.76-3.58-5-8-5Z" /></svg></span>;
}

export default function Post() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    postsApi
      .getBySlug(slug)
      .then((res) => {
        if (!cancelled) setPost(res.post);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Post not found');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!post) return undefined;
    const description = post.description || post.excerpt || `Read ${post.title} on Agri Rise Global`;
    const imageUrl = post.featured_image ? assetUrl(post.featured_image) : '';
    document.title = `${post.title} | Agri Rise Global`;
    const tags = [
      ['description', description],
      ['og:title', post.title, 'property'],
      ['og:description', description, 'property'],
      ['og:type', 'article', 'property'],
      ['og:url', window.location.href, 'property'],
      ['twitter:card', post.featured_image ? 'summary_large_image' : 'summary'],
      ['twitter:title', post.title],
      ['twitter:description', description],
    ];
    if (imageUrl) tags.push(['og:image', imageUrl, 'property'], ['twitter:image', imageUrl]);
    const elements = tags.map(([name, content, attribute = 'name']) => {
      const element = document.createElement('meta');
      element.setAttribute(attribute, name);
      element.setAttribute('content', content);
      document.head.appendChild(element);
      return element;
    });
    return () => {
      elements.forEach((element) => element.remove());
      document.title = 'Agri Rise Global';
    };
  }, [post]);

  const articleUrl = post ? shareUrl(post.slug) : '';
  const shareText = post ? `${post.title} - Agri Rise Global` : '';
  const handleCopy = async () => {
    await navigator.clipboard.writeText(articleUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  if (loading) return <main className="max-w-3xl mx-auto px-4 py-12"><p className="text-slate-500">Loading...</p></main>;
  if (error) return <main className="max-w-3xl mx-auto px-4 py-12"><p className="text-red-600">{error}</p><Link to="/blog" className="text-blue-600 hover:underline">Back to blog</Link></main>;
  if (!post) return null;

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <article>
        {post.featured_image && (
          <figure className="mb-6">
            <img src={assetUrl(post.featured_image)} alt={post.featured_image_caption || post.title} className="w-full rounded-lg shadow-md" />
            {post.featured_image_caption && <figcaption className="mt-2 text-sm text-slate-500">{post.featured_image_caption}</figcaption>}
          </figure>
        )}
        <h1 className="text-3xl font-bold text-slate-800 mb-2">{post.title}</h1>
        {post.description && <p className="text-lg text-slate-600 mb-5">{post.description}</p>}
        <div className="flex items-center gap-3 text-slate-500 text-sm mb-6">
          {post.author_id ? <Link to={`/users/${post.author_id}`} title={`View ${post.author_name || 'author'}'s profile`}><AuthorAvatar image={post.author_profile_image} name={post.author_name} /></Link> : <AuthorAvatar name="Admin" />}
          <span>By {post.author_name || 'Admin'} &middot; {new Date(post.created_at).toLocaleDateString()}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-8 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
          <span className="text-sm font-semibold text-slate-700 mr-1">Share this article</span>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg bg-[#1877F2] text-white text-sm font-medium hover:opacity-90">Facebook</a>
          <a href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${articleUrl}`)}`} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg bg-[#25D366] text-white text-sm font-medium hover:opacity-90">WhatsApp</a>
          <button type="button" onClick={handleCopy} className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50">{copied ? 'Copied' : 'Copy link'}</button>
          {navigator.share && <button type="button" onClick={() => navigator.share({ title: post.title, text: shareText, url: articleUrl })} className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700">More</button>}
        </div>
        <EditorJsRenderer content={post.content} />
      </article>
      <p className="mt-8">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 2) {
              navigate(-1);
              return;
            }
            navigate('/blog');
          }}
          className="text-blue-600 hover:underline"
        >
          ← Back to blog
        </button>
      </p>
    </main>
  );
}
