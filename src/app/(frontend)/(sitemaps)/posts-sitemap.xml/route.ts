import { getServerSideSitemap } from 'next-sitemap'
import { getPostsSitemap } from '../sitemap'

export async function GET() {
  const sitemap = await getPostsSitemap()
  return getServerSideSitemap(sitemap)
}
