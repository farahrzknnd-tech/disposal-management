import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        chunkSizeWarningLimit: 2500,
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-accordion'],
                    'data-vendor': ['@tanstack/react-query', '@tanstack/react-table'],
                    'chart-vendor': ['recharts'],
                    'export-vendor': ['xlsx', 'jspdf', 'jspdf-autotable'],
                },
            },
        },
    },
});
