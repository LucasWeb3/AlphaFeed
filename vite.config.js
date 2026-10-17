import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { apiPlugin } from './src/server/api-plugin.js'

export default defineConfig(({ mode }) => {
  // Load every env (not just VITE_*) so the dev plugin can read server-side
  // secrets like GEMINI_API_KEY from .env.local without any prefix.
  const env = loadEnv(mode, process.cwd(), '')
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] === undefined) process.env[k] = v
  }

  return {
    plugins: [react(), apiPlugin()],
  }
})
