import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// The browser now sends the signed-in user's own Supabase token; the proxy
// must not inject any Authorization header.

const backendTarget = 'http://localhost:3000';

function configureGatewayProxy(proxy: {
  on: (
    event: string,
    listener: (proxyReq: {removeHeader: (name: string) => void}) => void,
  ) => void;
}) {
  proxy.on('proxyReq', (proxyReq) => {
    proxyReq.removeHeader('origin');
  });
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Backend (root server.js) runs on :3000; keep vite clear of it.
      proxy: {
        '/sessions': {
          target: backendTarget,
          changeOrigin: true,
          configure: configureGatewayProxy,
        },
        '/chat': {
          target: backendTarget,
          changeOrigin: true,
          configure: configureGatewayProxy,
        },
        '/providers': {
          target: backendTarget,
          changeOrigin: true,
          configure: configureGatewayProxy,
        },
        '/health': {
          target: backendTarget,
          changeOrigin: true,
          configure: configureGatewayProxy,
        },
        '^/me(/|$)': {
          target: backendTarget,
          changeOrigin: true,
          configure: configureGatewayProxy,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
