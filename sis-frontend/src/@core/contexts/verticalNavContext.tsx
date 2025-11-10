'use client'

// React Imports
import { createContext, useState, ReactNode } from 'react'

// Type definition
type VerticalNavState = {
  isCollapsed?: boolean
  isHovered?: boolean
  width?: number
}

// Context Props type
type VerticalNavContextProps = {
  isCollapsed: boolean
  isHovered: boolean
  updateVerticalNavState: (values: Partial<VerticalNavState>) => void
  collapseVerticalNav: (collapsed: boolean) => void
  isBreakpointReached: boolean
  toggleVerticalNav: () => void
}

type Props = {
  children: ReactNode
}

// Initial Context
export const VerticalNavContext = createContext<VerticalNavContextProps | null>(null)

// VerticalNav Provider
export const VerticalNavProvider = ({ children }: Props) => {
  // States
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
  const [isHovered, setIsHovered] = useState<boolean>(false)
  const [isBreakpointReached, setIsBreakpointReached] = useState<boolean>(false)

  const updateVerticalNavState = (values: Partial<VerticalNavState>) => {
    if (values.isCollapsed !== undefined) {
      setIsCollapsed(values.isCollapsed)
    }
    if (values.isHovered !== undefined) {
      setIsHovered(values.isHovered)
    }
  }

  const collapseVerticalNav = (collapsed: boolean) => {
    setIsCollapsed(collapsed)
  }

  const toggleVerticalNav = () => {
    setIsCollapsed(prev => !prev)
  }

  return (
    <VerticalNavContext.Provider
      value={{
        isCollapsed,
        isHovered,
        updateVerticalNavState,
        collapseVerticalNav,
        isBreakpointReached,
        toggleVerticalNav
      }}
    >
      {children}
    </VerticalNavContext.Provider>
  )
}
