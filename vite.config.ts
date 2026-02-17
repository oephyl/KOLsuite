import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        serviceWorker: resolve(__dirname, 'src/background/serviceWorker.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
        sidepanel: resolve(__dirname, 'src/sidepanel/sidepanel.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'serviceWorker') {
            return 'background/serviceWorker.js';
          }
          if (chunkInfo.name === 'content') {
            return 'content/index.js';
          }
          if (chunkInfo.name === 'sidepanel') {
            return 'sidepanel/sidepanel.js';
          }
          return '[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    sourcemap: process.env.NODE_ENV === 'development',
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'src/manifest.json',
          dest: '.',
        },
        {
          src: 'src/sidepanel/sidepanel.html',
          dest: 'sidepanel',
        },
        {
          src: 'src/sidepanel/sidepanel.css',
          dest: 'sidepanel',
        },
        {
          src: 'src/content/overlay.css',
          dest: 'content',
        },
        {
          src: 'src/img/*',
          dest: 'img',
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  define: {
    'import.meta.env.BASE_URL': JSON.stringify(env.BASE_URL || env.VITE_BASE_URL || 'http://localhost:4000/api'),
    'import.meta.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY || ''),
  },
};
});
