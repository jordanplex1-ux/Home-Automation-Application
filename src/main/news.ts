import { ipcMain } from 'electron'
import Parser from 'rss-parser'
import { IPC } from '../shared/ipc-channels'

export interface NewsHeadline {
  title: string
  source: string
  link: string
  pubDate: number // epoch ms, 0 if missing
}

export interface NewsSource {
  id: string
  label: string
  url: string
}

// Built-in feeds. The renderer asks for a subset by id.
// GB News doesn't publish a reliable public RSS feed, so we use Google News
// filtered to their domain as a proxy — same approach works for any outlet
// whose direct feed is flaky.
const SOURCES: NewsSource[] = [
  { id: 'bbc',      label: 'BBC News',    url: 'http://feeds.bbci.co.uk/news/rss.xml' },
  { id: 'guardian', label: 'The Guardian', url: 'https://www.theguardian.com/uk/rss' },
  { id: 'sky',      label: 'Sky News',    url: 'https://feeds.skynews.com/feeds/rss/home.xml' },
  {
    id: 'gbnews',
    label: 'GB News',
    url: 'https://news.google.com/rss/search?q=site%3Agbnews.com&hl=en-GB&gl=GB&ceid=GB%3Aen'
  }
]

// Google News appends " - Source Name" to every title. Strip it to match the
// style of direct RSS feeds so the ticker looks uniform.
function cleanTitle(title: string, sourceLabel: string): string {
  const suffix = ` - ${sourceLabel}`
  if (title.endsWith(suffix)) return title.slice(0, -suffix.length).trim()
  // Google sometimes uses a slightly different spelling — also strip any
  // trailing " - <Anything>" that looks like an outlet tag
  const genericSuffix = title.match(/ - [A-Z][A-Za-z0-9 .&]+$/)
  if (genericSuffix && genericSuffix.index !== undefined) {
    return title.slice(0, genericSuffix.index).trim()
  }
  return title
}

const parser = new Parser({
  timeout: 10_000,
  headers: {
    // Some feeds reject requests with no UA or a default Node UA
    'User-Agent': 'HomePlanner/1.0 (+https://github.com/jordanplex1-ux/Home-Automation-Application)'
  }
})

async function fetchOne(source: NewsSource): Promise<NewsHeadline[]> {
  try {
    const feed = await parser.parseURL(source.url)
    const items = feed.items ?? []
    return items
      .map((item) => ({
        title: cleanTitle((item.title ?? '').trim(), source.label),
        source: source.label,
        link: item.link ?? '',
        pubDate: item.isoDate ? Date.parse(item.isoDate) : item.pubDate ? Date.parse(item.pubDate) : 0
      }))
      .filter((h) => h.title.length > 0)
  } catch (err) {
    console.warn(`[news] Failed to fetch ${source.label}:`, (err as Error).message)
    return []
  }
}

export function setupNewsIPC(): void {
  ipcMain.handle(IPC.NEWS_FETCH, async (_e, requestedIds: string[] | undefined) => {
    // If no ids specified, return all. Otherwise intersect with known sources.
    const active = Array.isArray(requestedIds) && requestedIds.length > 0
      ? SOURCES.filter((s) => requestedIds.includes(s.id))
      : SOURCES

    const batches = await Promise.all(active.map(fetchOne))
    const merged = batches.flat()

    // Sort newest first, cap at 40 items — plenty for a ticker and keeps the
    // DOM light when the widget duplicates the list for the seamless loop.
    merged.sort((a, b) => b.pubDate - a.pubDate)
    return merged.slice(0, 40)
  })

  ipcMain.handle(IPC.NEWS_SOURCES, () => SOURCES)
}
