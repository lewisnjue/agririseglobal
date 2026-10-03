import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { postsApi } from '../services/api';
import PostCard from '../components/PostCard';
import HeroCarousel from '../components/HeroCarousel';
import CategoryFilter from '../components/CategoryFilter';
import Pagination from '../components/Pagination';

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);
  const selectedCategory = searchParams.get('category') || 'all';
  const [data, setData] = useState({ posts: [], page: 1, totalPages: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoading(true);
    const params = selectedCategory === 'all' ? {} : { category: selectedCategory };
    postsApi
      .list(page, 6, params)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load posts');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [page, selectedCategory]);

  const handleCategoryChange = (category) => {
    setSearchParams(category === 'all' ? {} : { category });
  };

  return (
    <main className="min-h-[60vh]">
      <HeroCarousel />

      <section className="max-w-5xl mx-auto px-4 py-12">
        <CategoryFilter selectedCategory={selectedCategory} onCategoryChange={handleCategoryChange} />
        <h2 className="text-2xl font-semibold text-slate-800 mb-6">Latest posts</h2>
        {loading && <p className="text-slate-500">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && data.posts.length === 0 && (
          <p className="text-slate-500">No posts in this category yet. Check back later.</p>
        )}
        {!loading && !error && data.posts.length > 0 && (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              basePath="/"
              query={selectedCategory !== 'all' ? { category: selectedCategory } : {}}
            />
          </>
        )}
      </section>
    </main>
  );
}
