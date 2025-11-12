/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO: remove any types
import 'server-only';
import Image from 'next/image';
import Link from 'next/link';
import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';

type Rich = {
  plain_text: string;
  href: string | null;
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    code?: boolean;
  };
}[];

function RichText({ rich }: { rich: Rich }) {
  return (
    <>
      {rich.map((r, i) => {
        let node: React.ReactNode = r.plain_text;
        const a = r.annotations || {};
        if (a.code)
          node = (
            <code
              key={i}
              className="px-1 py-0.5 rounded bg-neutral-800 text-neutral-100"
            >
              {node}
            </code>
          );
        if (a.bold) node = <strong key={i}>{node}</strong>;
        if (a.italic) node = <em key={i}>{node}</em>;
        if (a.underline) node = <u key={i}>{node}</u>;
        if (a.strikethrough) node = <s key={i}>{node}</s>;
        return r.href ? (
          <Link key={i} href={r.href}>
            {node}
          </Link>
        ) : (
          <span key={i}>{node}</span>
        );
      })}
    </>
  );
}

function BlockImage({ block }: { block: any }) {
  const src =
    block.image.type === 'external'
      ? block.image.external.url
      : block.image.file.url;
  const caption = (block.image.caption ?? [])
    .map((c: any) => c.plain_text)
    .join(' ');
  return (
    <figure>
      <Image
        src={src}
        alt={caption || 'image'}
        width={1600}
        height={900}
        sizes="(min-width: 768px) 720px, 100vw"
        className="w-full h-auto rounded-xl"
      />
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-neutral-500">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

// groups consecutive list items into a single <ul> or <ol>
function groupLists(blocks: BlockObjectResponse[]) {
  const groups: any[] = [];
  let i = 0;
  while (i < blocks.length) {
    const b: any = blocks[i];
    if (b.type === 'bulleted_list_item' || b.type === 'numbered_list_item') {
      const type = b.type;
      const items: any[] = [];
      while (i < blocks.length && (blocks[i] as any).type === type) {
        items.push(blocks[i]);
        i++;
      }
      groups.push({
        type: type === 'bulleted_list_item' ? 'bulleted_list' : 'numbered_list',
        items,
      });
    } else {
      groups.push(b);
      i++;
    }
  }
  return groups;
}

export default async function NotionRenderer({
  blocks,
}: {
  blocks: BlockObjectResponse[];
}) {
  const grouped = groupLists(blocks);

  return (
    <article className="prose prose-neutral dark:prose-invert mx-auto max-w-3xl">
      {grouped.map((block: any) => {
        if ('type' in block && Array.isArray(block.items)) {
          // list group
          if (block.type === 'bulleted_list') {
            return (
              <ul key={block.items[0].id}>
                {block.items.map((li: any) => (
                  <li key={li.id}>
                    <RichText rich={li.bulleted_list_item.rich_text} />
                  </li>
                ))}
              </ul>
            );
          } else {
            return (
              <ol key={block.items[0].id}>
                {block.items.map((li: any) => (
                  <li key={li.id}>
                    <RichText rich={li.numbered_list_item.rich_text} />
                  </li>
                ))}
              </ol>
            );
          }
        }

        const { id, type } = block as any;
        const b: any = block;

        switch (type) {
          case 'paragraph':
            return (
              <p key={id}>
                <RichText rich={b.paragraph.rich_text} />
              </p>
            );
          case 'heading_1':
            return (
              <h1 key={id}>
                <RichText rich={b.heading_1.rich_text} />
              </h1>
            );
          case 'heading_2':
            return (
              <h2 key={id}>
                <RichText rich={b.heading_2.rich_text} />
              </h2>
            );
          case 'heading_3':
            return (
              <h3 key={id}>
                <RichText rich={b.heading_3.rich_text} />
              </h3>
            );
          case 'quote':
            return (
              <blockquote key={id}>
                <RichText rich={b.quote.rich_text} />
              </blockquote>
            );
          case 'code':
            return (
              <pre
                key={id}
                className="overflow-x-auto rounded-xl p-4 bg-neutral-900 text-neutral-100"
              >
                <code>
                  {b.code.rich_text.map((r: any) => r.plain_text).join('')}
                </code>
              </pre>
            );
          case 'image':
            return <BlockImage key={id} block={b} />;
          case 'callout':
            return (
              <div
                key={id}
                className="rounded-xl border bg-neutral-50 dark:bg-neutral-900/50 p-4"
              >
                <RichText rich={b.callout.rich_text} />
              </div>
            );
          case 'toggle':
            return (
              <details key={id} className="rounded-lg border p-3">
                <summary className="cursor-pointer">
                  <RichText rich={b.toggle.rich_text} />
                </summary>
              </details>
            );
          case 'bookmark':
            return (
              <a
                key={id}
                href={b.bookmark.url}
                className="block rounded-xl border p-4 no-underline"
              >
                {b.bookmark.url}
              </a>
            );
          case 'embed': {
            const url = b.embed.url as string;
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
              return (
                <div key={id} className="not-prose my-6 aspect-video">
                  <iframe
                    src={url}
                    className="w-full h-full rounded-xl border"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              );
            }
            return (
              <a key={id} href={url} className="underline">
                {url}
              </a>
            );
          }
          case 'divider':
            return <hr key={id} />;
          default:
            return (
              <div key={id} className="text-sm opacity-60">
                Unsupported: {type}
              </div>
            );
        }
      })}
    </article>
  );
}
