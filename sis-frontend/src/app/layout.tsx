// src/app/layout.tsx
import './globals.css'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'SIS',
  description: 'Sistema de Informação de Saúde',
  icons: {
    icon: '/logos/LogoWhite.png', // ✅ caminho correto relativo à pasta /public
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/remixicon/fonts/remixicon.css"
          rel="stylesheet"
        />
        <link rel="icon" href="/logos/LogoWhite.png" sizes="any" />
      </head>
      <body>{children}</body>
    </html>
  )
}
