/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO: remove any types
import 'server-only';
import {
  Client,
  isFullPage,
  isFullBlock,
  collectPaginatedAPI,
} from '@notionhq/client';
import { cache } from 'react';

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const SUBS_DB = process.env.NOTION_SUBS_DB_ID!;
const DATA_SOURCE_ID = process.env.NOTION_DATASOURCE_ID!;

// ---------- helpers
type RichText = { plain_text: string }[];
const plain = (arr?: RichText) => (arr ?? []).map((r) => r.plain_text).join('');

export type PostMeta = {
  id: string;
  title: string;
  slug: string;
  description?: string;
  tags: string[];
  publishedAt?: string;
  coverUrl?: string;
  likes?: number;
};

function pageToPostMeta(page: any): PostMeta {
  // page is narrowed to full PageObjectResponse by isFullPage before use
  const props: any = page.properties;
  const title = plain(props?.title?.title);
  const slug = plain(props?.slug?.rich_text);
  const description = plain(props?.description?.rich_text);
  const tags = (props?.tags?.multi_select ?? []).map((t: any) => t.name);
  const publishedAt = props?.publishedAt?.date?.start ?? undefined;
  const likes = props?.likes?.number ?? 0;

  // cover: Notion file URLs expire; refresh via ISR or proxy if needed.
  const coverUrl =
    (page.cover?.type === 'external' && page.cover.external?.url) ||
    (page.cover?.type === 'file' && page.cover.file?.url) ||
    undefined;

  return {
    id: page.id,
    title,
    slug,
    description,
    tags,
    publishedAt,
    coverUrl,
    likes,
  };
}

// ---------- data fetchers (cached + ISR-friendly)
export const getPosts = cache(async (): Promise<PostMeta[]> => {
  const response = await notion.dataSources.query({
    data_source_id: DATA_SOURCE_ID,
    filter: {
      property: 'status',
      select: {
        equals: 'PUBLISHED',
      },
    },
  });

  const out: PostMeta[] = [];
  for (const item of response.results) {
    // Narrow to full Page objects — skip partials
    if (!isFullPage(item)) continue;
    const meta = pageToPostMeta(item);
    if (meta.slug) out.push(meta);
  }
  return out;
});

export const getPostBySlug = cache(async (slug: string) => {
  const response = await notion.dataSources.query({
    data_source_id: DATA_SOURCE_ID,
    filter_properties: ['slug'],
    filter: {
      property: 'slug',
      rich_text: {
        equals: slug,
      },
    },
  });
  const hit = response.results[0];
  return isFullPage(hit) ? hit : null;
});

export const getBlocks = cache(async (pageId: string) => {
  // Use the SDK helper to collect all paginated results
  const blocks = await collectPaginatedAPI(notion.blocks.children.list, {
    block_id: pageId,
  });
  // Keep only full blocks (type-safe)
  return blocks.filter(isFullBlock);
});

// ---------- server actions helpers
export async function addSubscriber(email: string) {
  if (!SUBS_DB) throw new Error('No SUBS DB configured');
  return notion.pages.create({
    parent: { database_id: SUBS_DB },
    properties: {
      Email: { email },
      JoinedAt: { date: { start: new Date().toISOString() } },
    },
  });
}

export async function incrementLikes(pageId: string, current: number) {
  return notion.pages.update({
    page_id: pageId,
    properties: { Likes: { number: (current ?? 0) + 1 } },
  });
}
