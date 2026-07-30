import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy:{
      '/':{
        target:"https://case-tracker-evo3.onrender.com",
        changeOrigin: true,
      }
    }
  }
})
