import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Function form (not object form): the object form colors shared deps
        // (e.g. clsx, used by both recharts and app code) into the charts
        // chunk, which drags the 411KB charts bundle into the entry graph.
        // Matching exact package boundaries keeps charts out of first paint.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          // Recharts + its private dep stack — only reachable from the
          // lazy-loaded Overview/Analytics route chunks.
          if (
            /[\\/]node_modules[\\/](recharts|recharts-scale|victory-vendor|react-smooth|d3-[^\\/]+)[\\/]/.test(id)
          ) {
            return 'charts'
          }
          if (/[\\/]node_modules[\\/](react-router|react-router-dom|@remix-run)[\\/]/.test(id)) return 'router'
          if (/[\\/]node_modules[\\/]@tanstack[\\/]/.test(id)) return 'query'
          // clsx/react-is are shared by both entry code and recharts — pin
          // them here or Rollup colors them into the charts chunk, dragging
          // it back into the entry graph.
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|clsx|react-is)[\\/]/.test(id)) return 'react'
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
