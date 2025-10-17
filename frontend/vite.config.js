import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vitest configuration keeps unit tests fast while enforcing coverage expectations.

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    teardownTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      lines: 0.8,
      functions: 0.8,
      statements: 0.8,
      branches: 0.7,
      include: ['src/**/*.{js,jsx}'],
  all: false,
      exclude: [
        'src/**/*.test.{js,jsx}',
        'src/components/RouteMap.jsx',
        'src/components/RequestsMap.jsx',
        'src/components/OptimizedRouteMap.jsx',
        'src/pages/AdminDashboard.jsx',
        'src/pages/CollectorDashboard.jsx',
        'src/pages/CollectorOptimize.jsx',
        'src/pages/UserDashboard.jsx',
      ],
    },
  },
})
