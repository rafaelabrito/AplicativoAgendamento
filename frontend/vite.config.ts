import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  void mode
  const defaultPort = 5143

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: Number(process.env.VITE_PORT) || defaultPort,
      strictPort: true,
    },
  }
})
