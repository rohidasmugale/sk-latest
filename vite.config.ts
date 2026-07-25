import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// http://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "SK Project",
        short_name: "SK",
        description: "Facility Management System",
        theme_color: "#1e293b",
        background_color: "#0f172a",
        display: "standalone",
        start_url: "/",
        icons: [],
      },
      workbox: {
        // ✅ Increased limit to 20MB to handle large bundles
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        
        // ✅ Glob patterns for caching
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        
        // ✅ Exclude large index files from precaching
        globIgnores: ["**/index-*.js"],
        
        // ✅ Navigate fallback for SPA
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],
        
        // ✅ Runtime caching strategy for better performance
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/sk-backend-btbj\.onrender\.com\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
          {
            urlPattern: /\.(js|css)$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-resources",
              expiration: {
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            urlPattern: /\.(png|jpg|jpeg|svg|gif|ico|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
        ],
      },
    })
  ].filter(Boolean),
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  
  // ✅ Build optimization configuration
  build: {
    // ✅ Increase chunk size warning limit
    chunkSizeWarningLimit: 20000, // 20MB in KB
    
    // ✅ Minify for production
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    
    // ✅ Rollup optimization
    rollupOptions: {
      output: {
        // ✅ Manual chunk splitting for better caching
        manualChunks: {
          // React core
          react: ['react', 'react-dom', 'react-router-dom'],
          
          // UI libraries
          ui: [
            '@radix-ui/react-dialog', 
            '@radix-ui/react-select', 
            '@radix-ui/react-toast',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs'
          ],
          
          // Charts
          charts: ['recharts'],
          
          // Utilities
          utils: ['axios', 'date-fns', 'sonner', 'framer-motion'],
          
          // Form handling
          forms: ['react-hook-form', '@hookform/resolvers'],
        },
        
        // ✅ Asset file naming for cache busting
        assetFileNames: 'assets/[name].[hash][extname]',
        chunkFileNames: 'chunks/[name].[hash].js',
        entryFileNames: 'entries/[name].[hash].js',
      },
    },
    
    // ✅ Source map for debugging (optional)
    sourcemap: mode === "development",
    
    // ✅ Target modern browsers
    target: "es2020",
  },
  
  // ✅ Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'date-fns',
      'sonner',
      'framer-motion',
    ],
    exclude: ['@vercel/analytics'],
  },
}));