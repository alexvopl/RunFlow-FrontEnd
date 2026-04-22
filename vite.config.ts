import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function getDevPort(env: Record<string, string>) {
  if (env.VITE_DEV_PORT) {
    const parsed = Number.parseInt(env.VITE_DEV_PORT, 10)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  if (env.FRONTEND_PORT) {
    const parsed = Number.parseInt(env.FRONTEND_PORT, 10)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  if (env.VITE_APP_URL) {
    try {
      const parsed = new URL(env.VITE_APP_URL)
      if (parsed.port) {
        return Number.parseInt(parsed.port, 10)
      }
    } catch {
      return undefined
    }
  }

  return undefined
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = getDevPort(env)

  return {
    plugins: [react()],
    server: {
      host: true,
      port,
    },
  }
})
