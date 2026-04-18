import { parse, type HTMLElement } from 'node-html-parser'

export interface BinCollection {
  type: string
  collectionDate: string // ISO yyyy-mm-dd
}

const URL = 'https://waste.barnsley.gov.uk/ViewCollection/SelectAddress'

const HEADERS: Record<string, string> = {
  accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'accept-language': 'en-GB,en;q=0.9',
  'cache-control': 'no-cache',
  'content-type': 'application/x-www-form-urlencoded',
  origin: 'https://waste.barnsley.gov.uk',
  pragma: 'no-cache',
  referer: URL,
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
}

function parseBinDate(raw: string): string | null {
  const trimmed = raw.trim()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (/^today$/i.test(trimmed)) {
    return iso(today)
  }
  if (/^tomorrow$/i.test(trimmed)) {
    const t = new Date(today)
    t.setDate(t.getDate() + 1)
    return iso(t)
  }

  // Format: "Monday, January 15, 2026"
  const parsed = new Date(trimmed)
  if (!isNaN(parsed.getTime())) {
    return iso(parsed)
  }
  return null
}

function iso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function expandTypes(typeStr: string, dateIso: string): BinCollection[] {
  return typeStr
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => ({
      type: `${t} bin`,
      collectionDate: dateIso
    }))
}

function extractCookies(setCookieHeader: string | string[] | null): string {
  if (!setCookieHeader) return ''
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
  return headers
    .map((h) => h.split(';')[0].trim())
    .filter(Boolean)
    .join('; ')
}

export async function fetchBarnsleyBins(
  uprn: string,
  postcode: string
): Promise<BinCollection[]> {
  // Step 1: GET the form page to capture session cookies
  const initialRes = await fetch(URL, {
    method: 'GET',
    headers: { 'user-agent': HEADERS['user-agent'] },
    redirect: 'manual'
  })

  // Collect Set-Cookie headers (undici exposes via getSetCookie)
  // @ts-expect-error – getSetCookie exists on Headers in undici
  const setCookies: string[] = initialRes.headers.getSetCookie?.() ?? []
  const cookieHeader = extractCookies(setCookies)

  const body = new URLSearchParams({
    'personInfo.person1.HouseNumberOrName': '',
    'personInfo.person1.Postcode': postcode,
    'personInfo.person1.UPRN': uprn,
    person1_SelectAddress: 'Select address'
  }).toString()

  // Step 2: POST with cookies, follow redirects manually so cookies persist
  let currentUrl = URL
  let res = await fetch(currentUrl, {
    method: 'POST',
    headers: { ...HEADERS, ...(cookieHeader ? { cookie: cookieHeader } : {}) },
    body,
    redirect: 'manual'
  })

  // Follow up to 5 redirects manually, persisting cookies
  let cookies = cookieHeader
  for (let i = 0; i < 5 && res.status >= 300 && res.status < 400; i++) {
    // @ts-expect-error
    const newCookies: string[] = res.headers.getSetCookie?.() ?? []
    if (newCookies.length) {
      const merged = extractCookies(newCookies)
      cookies = cookies ? `${cookies}; ${merged}` : merged
    }
    const location = res.headers.get('location')
    if (!location) break
    currentUrl = new globalThis.URL(location, currentUrl).toString()
    res = await fetch(currentUrl, {
      method: 'GET',
      headers: { ...HEADERS, ...(cookies ? { cookie: cookies } : {}) },
      redirect: 'manual'
    })
  }

  if (!res.ok) {
    throw new Error(`Barnsley council returned ${res.status}`)
  }

  const html = await res.text()
  const root = parse(html)
  const fieldsets = root.querySelectorAll('fieldset')

  if (fieldsets.length < 1) {
    throw new Error('Unexpected page layout — check UPRN/postcode')
  }

  const bins: BinCollection[] = []
  const usedTypes = new Set<string>()

  // Next collection (highlight)
  const highlight = fieldsets[0].querySelector('.highlight-content')
  const nextDateRaw = highlight?.querySelector('em.ui-bin-next-date')?.text.trim() ?? ''
  const nextTypeRaw = highlight?.querySelector('p.ui-bin-next-type')?.text.trim() ?? ''
  const nextDate = parseBinDate(nextDateRaw)
  if (nextDate && nextTypeRaw) {
    for (const b of expandTypes(nextTypeRaw, nextDate)) {
      bins.push(b)
      usedTypes.add(b.type)
    }
  }

  // Upcoming collections table
  if (fieldsets.length >= 2) {
    const rows = fieldsets[1].querySelectorAll('tbody tr')
    for (const row of rows) {
      const tds = row.querySelectorAll('td') as HTMLElement[]
      if (tds.length < 2) continue
      const dateRaw = tds[0].text.trim()
      const typeRaw = tds[1].text.trim()
      const dateIso = parseBinDate(dateRaw)
      if (!dateIso || !typeRaw) continue
      for (const b of expandTypes(typeRaw, dateIso)) {
        if (!usedTypes.has(b.type)) {
          bins.push(b)
          usedTypes.add(b.type)
        }
      }
    }
  }

  // Sort by date ascending
  bins.sort((a, b) => a.collectionDate.localeCompare(b.collectionDate))
  return bins
}
