import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        serviceWorker: resolve(__dirname, 'src/background/serviceWorker.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
        options: resolve(__dirname, 'src/options/options.ts'),
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
          if (chunkInfo.name === 'options') {
            return 'options/options.js';
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
          src: 'src/options/options.html',
          dest: 'options',
        },
        {
          src: 'src/options/options.css',
          dest: 'options',
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
});
