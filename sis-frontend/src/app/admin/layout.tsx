'use client'

// React Imports
import { ReactNode } from 'react'

// MUI Imports
import Box from '@mui/material/Box'

// Component Imports
import Navigation from '@/components/layout/vertical/Navigation'
import { SettingsProvider } from '@core/contexts/settingsContext'
import { VerticalNavProvider } from '@menu/contexts/verticalNavContext'

export default function AdminLayout({
  children
}: {
  children: ReactNode
}) {
  // Dictionary mock - substitua isso depois
  const dictionary = {
    navigation: {
      dashboards: 'Dashboards',
      frontPages: 'Front Pages',
      appsPages: 'Apps & Pages'
    }
  }

  return (
    <SettingsProvider settingsCookie={null} mode="light">
      <VerticalNavProvider>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh'
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flex: 1
            }}
          >
            {/* Sidebar Lateral */}
            <Box sx={{ width: 260 }}>
              <Navigation dictionary={dictionary} mode="light" />
            </Box>

            {/* Conteúdo Principal */}
            <Box
              component="main"
              sx={{
                flex: 1,
                padding: '24px',
                overflow: 'auto'
              }}
            >
              {children}
            </Box>
          </Box>
        </Box>
      </VerticalNavProvider>
    </SettingsProvider>
  )
}