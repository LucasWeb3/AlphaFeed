// Realistic mock signals for scaffolding. Real pipeline will replace this.
// Timestamps are relative to load so the feed always looks live.

const now = Date.now()
const mins = (n) => new Date(now - n * 60 * 1000).toISOString()

const mockSignals = [
  {
    id: 's_001',
    token: 'SOL',
    direction: 'bullish',
    confidence: 87,
    source: 'Dexscreener',
    sourceType: 'on-chain',
    headline: 'SOL/USDC volume up 340% in the last hour on Raydium',
    reason:
      'Sudden volume spike on the top pair with no news yet — usually a leading indicator.',
    url: 'https://dexscreener.com/solana',
    timestamp: mins(3),
  },
  {
    id: 's_002',
    token: 'ETH',
    direction: 'bullish',
    confidence: 74,
    source: 'CoinDesk',
    sourceType: 'news',
    headline: 'BlackRock files updated S-1 for spot Ethereum ETF with staking language',
    reason:
      'Staking approval would materially change ETF economics. Historical precedent: filings like this precede 5–15% moves in 48h.',
    url: 'https://www.coindesk.com/',
    timestamp: mins(12),
  },
  {
    id: 's_003',
    token: 'PEPE',
    direction: 'bullish',
    confidence: 62,
    source: 't.me/alphacallers',
    sourceType: 'telegram',
    headline: 'Multiple KOL channels calling out PEPE accumulation zone',
    reason:
      '3 tracked channels mentioned PEPE within 20 minutes. Cluster of mentions often precedes memecoin runs.',
    url: '#',
    timestamp: mins(18),
  },
  {
    id: 's_004',
    token: 'ARB',
    direction: 'bearish',
    confidence: 81,
    source: 'r/CryptoCurrency',
    sourceType: 'reddit',
    headline: 'Arbitrum foundation wallet moved 92M ARB to Binance',
    reason:
      'On-chain movement of this size to a CEX typically signals sell pressure. Announcement thread gaining traction.',
    url: 'https://reddit.com/r/CryptoCurrency',
    timestamp: mins(24),
  },
  {
    id: 's_005',
    token: 'HYPE',
    direction: 'bullish',
    confidence: 91,
    source: 'Dexscreener',
    sourceType: 'on-chain',
    headline: 'New HYPE/USDC pool crossed $12M liquidity in 6 hours',
    reason:
      'Liquidity growth curve matches early-phase pattern of top launches YTD. High-conviction.',
    url: 'https://dexscreener.com/',
    timestamp: mins(31),
  },
  {
    id: 's_006',
    token: 'BTC',
    direction: 'neutral',
    confidence: 55,
    source: 'The Block',
    sourceType: 'news',
    headline: 'FOMC minutes released — no direct crypto commentary',
    reason:
      'Markets muted immediately. Watch for follow-on volatility in next 6 hours.',
    url: 'https://www.theblock.co/',
    timestamp: mins(42),
  },
  {
    id: 's_007',
    token: 'JTO',
    direction: 'bullish',
    confidence: 68,
    source: 't.me/solana_alpha',
    sourceType: 'telegram',
    headline: 'Jito staking TVL crossed all-time high',
    reason:
      'TVL milestones on LSTs historically correlate with token appreciation over 7-day windows.',
    url: '#',
    timestamp: mins(58),
  },
  {
    id: 's_008',
    token: 'DOGE',
    direction: 'bearish',
    confidence: 47,
    source: 'r/CryptoMarkets',
    sourceType: 'reddit',
    headline: 'Sentiment thread: DOGE holders reporting exchange delays',
    reason:
      'Low-confidence signal — could be isolated. Flagging for review.',
    url: 'https://reddit.com/r/CryptoMarkets',
    timestamp: mins(74),
  },
  {
    id: 's_009',
    token: 'LINK',
    direction: 'bullish',
    confidence: 79,
    source: 'Cointelegraph',
    sourceType: 'news',
    headline: 'Chainlink CCIP integrated by two major stablecoin issuers',
    reason:
      'Enterprise integrations tend to be re-priced by market over 3–7 days. Solid fundamentals catalyst.',
    url: 'https://cointelegraph.com/',
    timestamp: mins(88),
  },
  {
    id: 's_010',
    token: 'WIF',
    direction: 'bullish',
    confidence: 71,
    source: 'Dexscreener',
    sourceType: 'on-chain',
    headline: 'WIF/SOL pair sees 8 whale buys > $50k in past hour',
    reason:
      'Cluster of large buys with no corresponding news often front-runs public catalysts.',
    url: 'https://dexscreener.com/',
    timestamp: mins(112),
  },
]

export default mockSignals

export const SOURCE_META = {
  'on-chain': { label: 'On-chain', color: 'var(--cyan)' },
  news: { label: 'News', color: 'var(--violet)' },
  reddit: { label: 'Reddit', color: 'var(--amber)' },
  telegram: { label: 'Telegram', color: 'var(--pink)' },
}
