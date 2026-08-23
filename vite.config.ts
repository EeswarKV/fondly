import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Force Nitro to use the Vercel preset when building on Vercel.
// Without this, Nitro outputs to .output/ (node-server) instead of
// .vercel/output/ which Vercel requires to route requests correctly.
if (process.env.VERCEL) {
  process.env.NITRO_PRESET = 'vercel'
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    process.env.NODE_ENV !== 'production' && devtools(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
