import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Same path as production Netlify proxy — report calls work when VITE_API_BASE_URL is unset (localhost origin).
      '/api': {
        target: 'https://pu.playtonight.fun',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
