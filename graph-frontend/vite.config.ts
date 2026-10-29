import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import dotenv from 'dotenv';

// Backend env (gateway token etc.) lives in the repo root .env.
dotenv.config({path: path.resolve(__dirname, '../.env')});

const backendTarget = 'http://localhost:3000';
const gatewayAuth = {
  Authorization: `Bearer ${process.env.GATEWAY_API_TOKEN || ''}`,
};

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
          headers: gatewayAuth,
          changeOrigin: true,
          configure: configureGatewayProxy,
        },
        '/chat': {
          target: backendTarget,
          headers: gatewayAuth,
          changeOrigin: true,
          configure: configureGatewayProxy,
        },
        '/providers': {
          target: backendTarget,
          headers: gatewayAuth,
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
