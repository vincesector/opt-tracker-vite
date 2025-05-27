import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3003,
    strictPort: true, // Force the specified port
    open: true,
    headers: {
      'Content-Security-Policy': `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net;
        style-src 'self' 'unsafe-inline' fonts.googleapis.com;
        font-src 'self' fonts.gstatic.com data:;
        img-src 'self' data: blob: https:;
        connect-src 'self' ws: wss: https://*.supabase.co https://puvchshnfeynjhysqdoi.supabase.co;
        frame-ancestors 'none';
      `.replace(/\s+/g, ' ').trim()
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'esnext',
    rollupOptions: {
      output: {
        format: 'es'
      }
    }
  },
})
