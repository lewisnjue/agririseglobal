import { useRef, useState } from 'react';
import { assetUrl, uploadApi } from '../services/api';

export default function FeaturedImageField({ value, onChange, caption, onCaptionChange }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    setUploading(true);
    try {
      const result = await uploadApi.image(file);
      onChange(result.url);
    } catch (uploadError) {
      setError(uploadError.error || 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor="featured-image-url" className="block text-sm font-medium text-slate-700">Featured image</label>
        {value && (
          <button type="button" onClick={() => onChange('')} className="text-xs text-slate-500 hover:text-red-600">
            Remove image
          </button>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          id="featured-image-url"
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Paste an image URL"
          className="flex-1 px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-3 py-2 bg-slate-200 text-slate-800 rounded font-medium hover:bg-slate-300 disabled:opacity-50 whitespace-nowrap"
        >
          {uploading ? 'Uploading...' : 'Upload image'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>
      <p className="text-xs text-slate-500 mt-2">Paste a direct image URL or upload an image from your device.</p>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      <div className="mt-3">
        <label htmlFor="featured-image-caption" className="block text-sm font-medium text-slate-700 mb-1">Image caption</label>
        <input
          id="featured-image-caption"
          type="text"
          value={caption}
          onChange={(event) => onCaptionChange(event.target.value)}
          placeholder="Add a caption for the featured image"
          className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500"
        />
      </div>
      {value && (
          <img src={assetUrl(value)} alt="Featured image preview" className="mt-3 w-full max-h-48 object-cover rounded-md border border-slate-200" />
      )}
    </div>
  );
}
