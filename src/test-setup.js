import '@testing-library/jest-dom'
import { beforeEach } from 'vitest'

// Mock localStorage for tests
const localStorageMock = {
  getItem: (key) => localStorage._store?.[key] ?? null,
  setItem: (key, value) => {
    localStorage._store = { ...(localStorage._store ?? {}), [key]: value }
  },
  removeItem: (key) => {
    const { [key]: _, ...rest } = localStorage._store ?? {}
    localStorage._store = rest
  },
  clear: () => {
    localStorage._store = {}
  },
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})
