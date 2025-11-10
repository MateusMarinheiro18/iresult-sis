import './globals.css'
import type { ReactNode } from 'react'
import EmotionCacheProvider from '@/@core/providers/EmotionCacheProvider'

export const metadata = {
  title: 'SIS',
  description: 'Sistema de Informação de Saúde',
  icons: {
    icon: '/logos/LogoWhite.png',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/remixicon/fonts/remixicon.css"
          rel="stylesheet"
        />
        <link rel="icon" href="/logos/LogoWhite.png" sizes="any" />
      </head>

      <body>
        <EmotionCacheProvider>
          {children}
        </EmotionCacheProvider>
      </body>
    </html>
  )
}
