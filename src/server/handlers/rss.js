// Fetch and parse an RSS/Atom feed into a compact JSON list.
// Uses fast-xml-parser (small, no deps).

import { XMLParser } from 'fast-xml-parser'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
})

export async function fetchRss(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'alphafeed/0.1', 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
  })
  if (!res.ok) throw new Error(`RSS ${url} failed: ${res.status}`)
  const xml = await res.text()
  const data = parser.parse(xml)

  // Handle both RSS 2.0 (channel/item) and Atom (feed/entry).
  const rssItems = data?.rss?.channel?.item
  const atomEntries = data?.feed?.entry
  const items = Array.isArray(rssItems)
    ? rssItems
    : rssItems
      ? [rssItems]
      : Array.isArray(atomEntries)
        ? atomEntries
        : atomEntries
          ? [atomEntries]
          : []

  return items.slice(0, 25).map((item) => ({
    title: textOf(item.title),
    link: linkOf(item),
    description: stripHtml(textOf(item.description || item.summary || item['content:encoded'])),
    publishedAt: dateOf(item.pubDate || item.published || item.updated),
  }))
}

function textOf(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'object' && v['#text']) return String(v['#text'])
  return String(v)
}

function linkOf(item) {
  // RSS: <link>url</link>. Atom: <link href="url"/> or an array of link elements.
  if (typeof item.link === 'string') return item.link
  if (item.link?.['@_href']) return item.link['@_href']
  if (Array.isArray(item.link)) {
    const alt = item.link.find((l) => l['@_rel'] === 'alternate') || item.link[0]
    return alt?.['@_href'] || ''
  }
  return item.guid?.['#text'] || item.guid || ''
}

function dateOf(v) {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

function stripHtml(s) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400)
}
