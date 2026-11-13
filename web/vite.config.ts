import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The sandbox preview proxies a public hostname to this dev server, so Vite's
// host check must allow it. Only applied when BASE44_PREVIEW_MODE is exactly "1";
// every other environment keeps Vite's default behaviour.
const previewMode = process.env.BASE44_PREVIEW_MODE === '1';
const publicSuffix = process.env.BASE44_PUBLIC_HOST_SUFFIX;
const sandboxDomain = process.env.BASE44_SANDBOX_HOST_DOMAIN;
const allowedHosts =
  previewMode && publicSuffix
    ? [`3000-${publicSuffix}`, `.${publicSuffix}`, ...(sandboxDomain ? [`.${sandboxDomain}`] : [])]
    : undefined;

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts,
    // Single origin: the browser only talks to :3000 and Vite forwards API calls
    // to the Hono server in the same container. Keeps session cookies same-site.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: false,
      },
    },
    watch: { usePolling: true, interval: 400 },
  },
});
