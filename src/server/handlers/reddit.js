// Fetch new posts from a public subreddit.
// Reddit's JSON endpoint 403s a lot on generic UAs. Their public RSS
// (accessed with a browser-shaped UA) is more permissive, so we prefer it
// and fall back to JSON if RSS parsing fails.

import { XMLParser } from 'fast-xml-parser'

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
})

export async function fetchSubreddit(sub, { limit = 25 } = {}) {
  // Try RSS first — most reliable for unauthed reads.
  try {
    return await fetchViaRss(sub, limit)
  } catch (rssErr) {
    // Then try old.reddit's JSON, which is less aggressive than www.
    try {
      return await fetchViaJson(sub, limit)
    } catch (jsonErr) {
      throw new Error(`Reddit ${sub} failed: RSS=${rssErr.message} · JSON=${jsonErr.message}`)
    }
  }
}

async function fetchViaRss(sub, limit) {
  const url = `https://www.reddit.com/r/${encodeURIComponent(sub)}/new/.rss?limit=${limit}`
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/rss+xml, */*' } })
  if (!res.ok) throw new Error(`RSS ${res.status}`)
  const text = await res.text()
  const parsed = xml.parse(text)
  const entries = parsed?.feed?.entry
  const items = Array.isArray(entries) ? entries : entries ? [entries] : []

  return items.slice(0, limit).map((e) => ({
    id: e.id || '',
    title: textOf(e.title),
    author: textOf(e.author?.name).replace(/^\/u\//, ''),
    subreddit: sub,
    // RSS doesn't expose score/comment counts — leave 0. Confidence heuristic
    // downstream will just treat these as "unknown engagement".
    score: 0,
    numComments: 0,
    createdAt: e.updated || e.published || new Date().toISOString(),
    permalink: linkOf(e),
    selftext: stripHtml(textOf(e.content)).slice(0, 500),
    linkFlair: null,
  }))
}

async function fetchViaJson(sub, limit) {
  const url = `https://old.reddit.com/r/${encodeURIComponent(sub)}/new.json?limit=${limit}&raw_json=1`
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!res.ok) throw new Error(`JSON ${res.status}`)
  const data = await res.json()
  const children = data?.data?.children || []
  return children.map((c) => c.data).map((p) => ({
    id: p.id,
    title: p.title,
    author: p.author,
    subreddit: p.subreddit,
    score: p.score || 0,
    numComments: p.num_comments || 0,
    createdAt: new Date((p.created_utc || 0) * 1000).toISOString(),
    permalink: `https://www.reddit.com${p.permalink}`,
    selftext: (p.selftext || '').slice(0, 500),
    linkFlair: p.link_flair_text || null,
  }))
}

function textOf(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'object' && v['#text']) return String(v['#text'])
  return String(v)
}

function linkOf(entry) {
  if (typeof entry.link === 'string') return entry.link
  if (entry.link?.['@_href']) return entry.link['@_href']
  if (Array.isArray(entry.link)) {
    const alt = entry.link.find((l) => l['@_rel'] === 'alternate') || entry.link[0]
    return alt?.['@_href'] || ''
  }
  return ''
}

function stripHtml(s) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
