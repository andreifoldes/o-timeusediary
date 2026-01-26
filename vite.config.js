import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Root directory for the project
  root: '.',

  // Public directory for static assets
  publicDir: 'public',

  build: {
    // Output directory
    outDir: 'dist',

    // Generate source maps for debugging
    sourcemap: true,

    // Minification settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console logs for debugging in production
        drop_debugger: true
      }
    },

    // CSS minification
    cssMinify: true,

    // Rollup options for multi-page app
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        instructions: resolve(__dirname, 'pages/instructions.html'),
        thankyou: resolve(__dirname, 'pages/thank-you.html')
      },
      output: {
        // Asset file naming with content hash for cache busting
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js'
      }
    },

    // Chunk size warning limit (in KB)
    chunkSizeWarningLimit: 500
  },

  // Development server settings
  server: {
    port: 8080,
    open: false,
    cors: true
  },

  // Preview server settings (for testing production build)
  preview: {
    port: 8080
  },

  // Optimize dependencies
  optimizeDeps: {
    include: []
  }
});
