import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyPrefix = env.VITE_QWENPAW_PROXY_PREFIX || '/qwenpaw-api';
  const target = env.VITE_QWENPAW_TARGET || 'http://127.0.0.1:8088';

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@proto-shared': fileURLToPath(new URL('../shared', import.meta.url)),
      },
    },
    server: {
      host: '0.0.0.0',
      fs: {
        allow: [fileURLToPath(new URL('..', import.meta.url))],
      },
      proxy: {
        [proxyPrefix]: {
          target,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(new RegExp(`^${escapeForRegExp(proxyPrefix)}`), ''),
        },
      },
    },
  };
});
