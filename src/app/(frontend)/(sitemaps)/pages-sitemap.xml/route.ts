import { getServerSideSitemap } from 'next-sitemap'
import { getPagesSitemap } from '../sitemap'

export async function GET() {
  const sitemap = await getPagesSitemap()
  return getServerSideSitemap(sitemap)
}
