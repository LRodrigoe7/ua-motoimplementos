'use client'

import { useEffect } from 'react'

// Registra el service worker y pide permiso para notificaciones push.
// Se monta una sola vez en el layout raíz.
export function NotificationManager() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    async function setup() {
      try {
        // Registrar service worker
        const reg = await navigator.serviceWorker.register('/sw.js')

        // Pedir permiso (si ya fue concedido, no muestra el diálogo)
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        // Suscribirse al push
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
        })

        // Guardar suscripción en el servidor
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub.toJSON()),
        })
      } catch (err) {
        // Falla silenciosa — las notificaciones son opcionales
        console.warn('Push setup failed:', err)
      }
    }

    setup()
  }, [])

  return null
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}
