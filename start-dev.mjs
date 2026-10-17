import { createServer } from 'vite'

const server = await createServer({
  root: '/Users/luccelillja/Desktop/Coding/OWN PROJECTS/AlphaFeed',
  configFile: '/Users/luccelillja/Desktop/Coding/OWN PROJECTS/AlphaFeed/vite.config.js',
  server: { host: true, port: 5180 },
})
await server.listen()
server.printUrls()
