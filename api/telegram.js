import { fetchTelegramChannel } from '../src/server/handlers/telegram.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  try {
    const channel = (req.query && req.query.channel) || new URL(req.url, 'http://x').searchParams.get('channel')
    if (!channel) {
      res.status(400).json({ error: 'channel required' })
      return
    }

    const messages = await fetchTelegramChannel(channel)
    res.setHeader('Cache-Control', 's-maxage=90, stale-while-revalidate=300')
    res.status(200).json({ messages })
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
}
