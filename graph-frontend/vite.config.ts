import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  const gatewayToken = env.GATEWAY_API_TOKEN || '';

  const withGatewayAuth = (proxy: any) => {
    proxy.on('proxyReq', (proxyReq: any) => {
      proxyReq.removeHeader('origin');
      if (gatewayToken) {
        proxyReq.setHeader('Authorization', `Bearer ${gatewayToken}`);
      }
    });
  };

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/sessions': { target: 'http://127.0.0.1:3000', changeOrigin: false, configure: withGatewayAuth },
        '/chat': { target: 'http://127.0.0.1:3000', changeOrigin: false, configure: withGatewayAuth },
        '/health': { target: 'http://127.0.0.1:3000', changeOrigin: false, configure: withGatewayAuth },
        '/providers': { target: 'http://127.0.0.1:3000', changeOrigin: false, configure: withGatewayAuth },
      },
    },
  };
});
