import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || ""),
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY || ""),
      'process.env.VITE_LLAVE_IA_PERSONAL': JSON.stringify(process.env.VITE_LLAVE_IA_PERSONAL || env.VITE_LLAVE_IA_PERSONAL || ""),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
