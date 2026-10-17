import { createServer } from 'vite'

const ROOT = '/Users/luccelillja/Desktop/Coding/OWN PROJECTS/AlphaFeed'

// Match cwd to the project root so vite's loadEnv in vite.config.js
// finds .env.local even when this launcher is invoked from elsewhere.
process.chdir(ROOT)

const server = await createServer({
  root: ROOT,
  configFile: `${ROOT}/vite.config.js`,
  server: { host: true, port: 5180 },
})
await server.listen()
server.printUrls()
