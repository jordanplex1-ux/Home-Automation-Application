import { defineConfig, externalizeDepsPlugin, loadEnv } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }

export default defineConfig(({ mode }) => {
  // Load .env / .env.local / .env.[mode] / .env.[mode].local — empty prefix
  // string means we don't require a `VITE_` prefix on variable names.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    main: {
      plugins: [externalizeDepsPlugin({ exclude: ['electron-store'] })],
      // Inject build-time constants into the main bundle. These let secrets
      // (Google OAuth client id/secret) live in .env.local — gitignored —
      // rather than being hardcoded into source control.
      define: {
        __GOOGLE_CLIENT_ID__: JSON.stringify(env.GOOGLE_CLIENT_ID ?? ''),
        __GOOGLE_CLIENT_SECRET__: JSON.stringify(env.GOOGLE_CLIENT_SECRET ?? '')
      }
    },
    preload: {
      plugins: [externalizeDepsPlugin()],
      build: {
        rollupOptions: {
          input: './src/main/preload.ts'
        }
      }
    },
    renderer: {
      plugins: [react(), tailwindcss()],
      define: {
        __APP_VERSION__: JSON.stringify(pkg.version)
      },
      build: {
        rollupOptions: {
          input: './src/renderer/index.html'
        }
      }
    }
  }
})
