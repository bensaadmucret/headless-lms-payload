import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'

export type SitemapEntry = { loc: string; lastmod: string }

const SITE_URL =
  process.env.NEXT_PUBLIC_SERVER_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  'https://example.com'

async function fetchCollectionSitemap(collection: 'pages' | 'posts'): Promise<SitemapEntry[]> {
  const payload = await getPayload({ config })

  const results = await payload.find({
    collection,
    overrideAccess: false,
    draft: false,
    depth: 0,
    limit: 1000,
    pagination: false,
    where: { _status: { equals: 'published' } },
    select: { slug: true, updatedAt: true },
  })

  const dateFallback = new Date().toISOString()
  const docs = results.docs || []

  if (collection === 'pages') {
    const defaults: SitemapEntry[] = [
      { loc: `${SITE_URL}/search`, lastmod: dateFallback },
      { loc: `${SITE_URL}/posts`, lastmod: dateFallback },
    ]

    const mapped: SitemapEntry[] = docs
      .filter((p: any) => Boolean(p?.slug))
      .map((p: any) => ({
        loc: p?.slug === 'home' ? `${SITE_URL}/` : `${SITE_URL}/${p?.slug}`,
        lastmod: p.updatedAt || dateFallback,
      }))

    return [...defaults, ...mapped]
  }

  // posts
  const mapped: SitemapEntry[] = docs
    .filter((p: any) => Boolean(p?.slug))
    .map((p: any) => ({
      loc: `${SITE_URL}/posts/${p?.slug}`,
      lastmod: p.updatedAt || dateFallback,
    }))

  return mapped
}

export const getPagesSitemap = unstable_cache(
  () => fetchCollectionSitemap('pages'),
  ['pages-sitemap'],
  { tags: ['pages-sitemap'] },
)

export const getPostsSitemap = unstable_cache(
  () => fetchCollectionSitemap('posts'),
  ['posts-sitemap'],
  { tags: ['posts-sitemap'] },
)
