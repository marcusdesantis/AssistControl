'use client'
import { useEffect } from 'react'

export default function RedirectIfAuth() {
  useEffect(() => {
    try {
      const raw = localStorage.getItem('attendance-auth')
      if (!raw) return
      const { state } = JSON.parse(raw)
      if (state?.isAuthenticated) {
        window.location.replace('/dashboard')
      }
    } catch {}
  }, [])
  return null
}
