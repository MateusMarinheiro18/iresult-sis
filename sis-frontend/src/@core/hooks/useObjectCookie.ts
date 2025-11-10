// React Imports
import { useMemo } from 'react'

// Third-party Imports
import { useCookie } from 'react-use'

export const useObjectCookie = <T>(key: string, fallback?: T | null): [T, (newVal: T) => void] => {
  // Hooks
  const [valStr, updateCookie] = useCookie(key)

  const value = useMemo<T>(() => {
    if (valStr) {
      try {
        return JSON.parse(valStr)
      } catch (error) {
        console.warn('Failed to parse cookie value:', error)
        return fallback as T
      }
    }
    return fallback as T
  }, [valStr, fallback])

  const updateValue = (newVal: T) => {
    updateCookie(JSON.stringify(newVal))
  }

  return [value, updateValue]
}
