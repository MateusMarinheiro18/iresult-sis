// Theme Types
export type Mode = 'light' | 'dark' | 'system'
export type Skin = 'default' | 'bordered'
export type Layout = 'vertical' | 'collapsed' | 'horizontal'
export type LayoutComponentPosition = 'fixed' | 'static'
export type LayoutComponentWidth = 'compact' | 'wide'

export type NavLink = {
  label: string
  href: string
  icon?: string
  target?: '_blank' | '_self'
}

export type NavGroup = {
  label: string
  icon?: string
  children: (NavLink | NavGroup)[]
}

export type VerticalMenuDataType = (NavLink | NavGroup)[]
