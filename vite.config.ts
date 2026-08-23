import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const isVercel = !!process.env.VERCEL

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    !isVercel && devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    tanstackStart({
      server: {
        preset: isVercel ? 'vercel' : undefined,
      },
    }),
    viteReact(),
  ],
})

export default config
