import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages serves the built app under the repo's name; the dev server stays at the root.
  base: command === 'build' ? '/stock-signals/' : '/',
  // 5173 is reqMgmt's client and 5174 the credit form; this app runs next to them.
  server: { port: 5175, strictPort: true },
  test: { include: ['src/**/*.test.{ts,tsx}'] },
}))
