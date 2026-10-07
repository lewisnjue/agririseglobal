import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postsApi } from '../services/api';
import BlockEditor from '../components/BlockEditor';
import EditorJsRenderer from '../components/EditorJsRenderer';
import FeaturedImageField from '../components/FeaturedImageField';
import { assetUrl } from '../services/api';

export default function CreatePost() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(null);
  const [featuredImage, setFeaturedImage] = useState('');
  const [featuredImageCaption, setFeaturedImageCaption] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('generic');
  const [status, setStatus] = useState('draft');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [showPreview, setShowPreview] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await postsApi.create({
        title,
        content: JSON.stringify(content || { time: Date.now(), blocks: [], version: '2.31.0' }),
        featured_image: featuredImage || null,
        featured_image_caption: featuredImageCaption,
        description,
        category,
        status,
      });
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.error || err.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">New post</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-sm border border-slate-100">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Story</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{content?.blocks?.length || 0} blocks</span>
                  <button type="button" onClick={() => setShowPreview((s) => !s)} className="text-xs text-slate-600 hover:underline">{showPreview ? 'Hide preview' : 'Show preview'}</button>
                </div>
              </div>
              <BlockEditor content={content} onChange={setContent} />
            </div>

            <div>
              <label htmlFor="post-description" className="block text-sm font-medium text-slate-700 mb-1">Article description</label>
              <textarea
                id="post-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="Write a short summary of this article"
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500"
              />
              <p className="text-xs text-slate-500 mt-1">{description.length}/300</p>
            </div>

            <FeaturedImageField value={featuredImage} onChange={setFeaturedImage} caption={featuredImageCaption} onCaptionChange={setFeaturedImageCaption} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500"
                >
                  <option value="generic">Generic</option>
                  <option value="crop-production">Crop Production</option>
                  <option value="livestock-production">Livestock Production</option>
                  <option value="agricultural-engineering">Agricultural Engineering</option>
                  <option value="agricultural-economics">Agricultural Economics</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-slate-800 text-white rounded font-medium hover:bg-slate-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create post'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/dashboard')}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded font-medium hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Preview</h2>
            {featuredImage ? (
              <>
                <img src={assetUrl(featuredImage)} alt={featuredImageCaption || title || 'Featured'} className="w-full h-56 object-cover rounded-md border border-slate-200" />
                {featuredImageCaption && <p className="text-xs text-slate-500 mt-1 mb-3">{featuredImageCaption}</p>}
              </>
            ) : (
              <div className="w-full h-56 bg-slate-100 rounded-md flex items-center justify-center text-slate-400 mb-3 border border-dashed border-slate-200">No image</div>
            )}

            <h3 className="text-lg font-semibold text-slate-800 mb-1">{title || 'Untitled'}</h3>
            {showPreview ? <EditorJsRenderer content={content} /> : <p className="text-sm text-slate-600">{description || getExcerpt(content) || 'No description added.'}</p>}
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100 text-sm text-slate-600">
            <p><span className="font-medium text-slate-800">Category:</span> <span className="ml-1">{category}</span></p>
            <p className="mt-2"><span className="font-medium text-slate-800">Status:</span> <span className="ml-1">{status}</span></p>
            <p className="mt-2 text-xs text-slate-500">Tip: Click "Show preview" to render HTML content live.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function getExcerpt(document) {
  const markup = (document?.blocks || []).map((block) => {
    const data = block.data || {};
    if (typeof data.text === 'string') return data.text;
    if (Array.isArray(data.items)) return data.items.map((item) => typeof item === 'string' ? item : item.text || item.content || '').join(' ');
    return '';
  }).join(' ').replace(/<[^>]*>/g, ' ');
  const text = new DOMParser().parseFromString(markup, 'text/html').body.textContent.replace(/\s+/g, ' ').trim();
  return text.length > 300 ? `${text.slice(0, 300)}…` : text;
}
