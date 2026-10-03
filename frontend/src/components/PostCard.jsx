import { Link } from 'react-router-dom';
import { assetUrl } from '../services/api';

export default function PostCard({ post }) {
  const excerpt = post.excerpt || '';
  const imageUrl = post.featured_image ? assetUrl(post.featured_image) : '';

  return (
    <article className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200 hover:shadow-xl transform hover:-translate-y-1 transition-all">
      <Link to={`/blog/${post.slug}`} className="block group">
        <div className="relative w-full h-52 overflow-hidden rounded-t-xl">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={post.title}
              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
              No image
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <span className="absolute left-3 bottom-3 bg-white/90 text-xs text-slate-800 px-2 py-1 rounded-full font-medium">{post.category || 'general'}</span>
        </div>
        <div className="p-5">
          <h2 className="text-lg md:text-xl font-semibold text-slate-800 mb-2 line-clamp-2">{post.title}</h2>
          <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
            <span>{new Date(post.created_at).toLocaleDateString()}</span>
          </div>
          {excerpt && <p className="text-slate-600 text-sm line-clamp-3">{excerpt}</p>}
        </div>
      </Link>
    </article>
  );
}
