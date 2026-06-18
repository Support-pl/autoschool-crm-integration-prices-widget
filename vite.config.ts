import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cssInjectedByJs from 'vite-plugin-css-injected-by-js'

export default defineConfig({
  plugins: [react(), cssInjectedByJs()],
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.emit': '(()=>{})',
    global: 'globalThis',
  },
  build: {
    lib: {
      entry: 'src/widget.tsx',
      name: 'CalculatorWidget',
      formats: ['iife'],
      fileName: () => 'calculator-widget.js',
    },
  },
})
