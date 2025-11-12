import { getPosts } from '@/lib/notion';
import Link from 'next/link';

export const revalidate = 10; // ISR every 10 seconds

export default async function BlogIndex() {
  const posts = await getPosts();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Blog</h1>
      <ul className="space-y-6">
        {posts.map((p) => (
          <li key={p.id} className="group">
            <Link href={`/blog/${p.slug}`} className="block">
              <h2 className="text-xl font-semibold group-hover:underline">
                {p.title}
              </h2>
              {p.description && (
                <p className="text-neutral-600">{p.description}</p>
              )}
              <div className="text-sm text-neutral-500">
                {p.publishedAt
                  ? new Date(p.publishedAt).toLocaleDateString()
                  : ''}
                {p.tags?.length ? <span> · {p.tags.join(', ')}</span> : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
