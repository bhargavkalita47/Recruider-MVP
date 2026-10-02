import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], build: { sourcemap: false, rollupOptions: { output: { manualChunks(id) { if (id.includes('node_modules')) { if (id.includes('@supabase')) return 'supabase'; if (id.includes('react') || id.includes('scheduler')) return 'react'; } } } } } });
