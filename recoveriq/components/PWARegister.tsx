'use client'
import { useEffect } from 'react'

// Registers the service worker for installable / offline PWA support.
// Renders nothing.
export function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {})
    }
  }, [])
  return null
}
