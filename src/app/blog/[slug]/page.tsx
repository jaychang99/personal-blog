/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO: remove any types
import { getBlocks, getPostBySlug } from '@/lib/notion';
import NotionRenderer from '@/components/NotionRenderer';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

export const revalidate = 10; // ISR every 10 seconds

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPostBySlug((await params).slug);
  if (!page) return {};
  const props: any = page.properties;
  const title = props.Title?.title?.[0]?.plain_text ?? 'Post';
  const desc = props.Description?.rich_text?.[0]?.plain_text ?? '';
  return {
    title,
    description: desc,
    openGraph: { title, description: desc },
  };
}

export default async function PostPage({ params }: Props) {
  await params;
  const page = await getPostBySlug((await params).slug);
  if (!page) return notFound();
  const blocks = await getBlocks(page.id);

  const props: any = page.properties;
  const title = props.Title?.title?.[0]?.plain_text ?? 'Post';
  const date = props.PublishedAt?.date?.start ?? undefined;

  return (
    <article className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      {date && (
        <p className="text-sm text-neutral-500 mb-8">
          {new Date(date).toLocaleDateString()}
        </p>
      )}
      {/* content */}
      <NotionRenderer blocks={blocks} />
    </article>
  );
}
