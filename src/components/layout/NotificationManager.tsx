'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

export function NotificationManager() {
  const [hayActualizacion, setHayActualizacion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    async function setup() {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')

        // Detectar nueva versión del SW instalándose
        reg.addEventListener('updatefound', () => {
          const nuevoSW = reg.installing
          if (!nuevoSW) return
          nuevoSW.addEventListener('statechange', () => {
            // El nuevo SW está listo y hay un SW anterior activo → hay actualización
            if (nuevoSW.state === 'installed' && navigator.serviceWorker.controller) {
              setHayActualizacion(true)
            }
          })
        })

        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
        })

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub.toJSON()),
        })
      } catch (err) {
        console.warn('Push setup failed:', err)
      }
    }

    setup()

    // Recargar cuando el SW nuevo tome control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })
  }, [])

  if (!hayActualizacion) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 bg-blue-600 text-white px-4 py-3 shadow-lg">
      <div className="flex items-center gap-2 text-sm font-medium">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Nueva versión disponible
      </div>
      <button
        onClick={() => window.location.reload()}
        className="text-xs font-semibold bg-white text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
      >
        Actualizar ahora
      </button>
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}
