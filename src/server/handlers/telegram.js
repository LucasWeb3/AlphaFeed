// Fetch recent messages from PUBLIC Telegram channels via t.me web preview.
//
// Approach: Telegram exposes an unauthenticated public HTML page at
// `https://t.me/s/{channel}` that lists recent messages. Scraping this page
// avoids needing a bot token AND avoids needing to add the bot to each
// channel (bots can't read channels they aren't added to).
//
// Downsides: brittle to Telegram HTML changes. If they break the layout,
// we'd need to swap to the Bot API path (user creates bot via BotFather,
// bot joins channels it needs to read). For MVP this is much simpler.

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

export async function fetchTelegramChannel(channel) {
  const url = `https://t.me/s/${encodeURIComponent(channel)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
  })
  if (!res.ok) throw new Error(`Telegram ${channel} failed: ${res.status}`)
  const html = await res.text()
  return parseTelegramPreview(html, channel)
}

// Extract messages from the public t.me/s/ preview HTML. Each message lives
// in a `<div class="tgme_widget_message ...">` with a nested text block and
// a data-post attribute like "channel_name/12345".
function parseTelegramPreview(html, channel) {
  const messages = []
  const msgRegex = /<div\b[^>]*class="[^"]*tgme_widget_message\b[^"]*"[^>]*data-post="([^"]+)"[\s\S]*?<time[^>]*datetime="([^"]+)"[^>]*>[\s\S]*?<\/time>/g
  const textRegex = /<div\b[^>]*class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g

  const postMatches = []
  let m
  while ((m = msgRegex.exec(html)) !== null) {
    postMatches.push({ post: m[1], datetime: m[2], startIndex: m.index })
  }

  const textMatches = []
  let t
  while ((t = textRegex.exec(html)) !== null) {
    textMatches.push({ raw: t[1], startIndex: t.index })
  }

  // Zip: for each post, find the closest text block after its start index.
  for (const post of postMatches) {
    const textEntry = textMatches.find(
      (tx) => tx.startIndex >= post.startIndex && tx.startIndex - post.startIndex < 5000
    )
    if (!textEntry) continue
    const text = stripHtml(textEntry.raw)
    if (!text || text.length < 6) continue
    messages.push({
      channel,
      messageId: post.post,
      text: text.slice(0, 500),
      url: `https://t.me/${post.post}`,
      publishedAt: post.datetime,
    })
  }

  return messages.slice(-25).reverse() // newest first
}

function stripHtml(s) {
  return String(s || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}
