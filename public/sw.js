// Service Worker — MotoTaller v2
// Maneja notificaciones push cuando la app está en segundo plano o cerrada

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

// Recibir notificación push y mostrarla
self.addEventListener('push', event => {
  if (!event.data) return

  const data = event.data.json()

  event.waitUntil(
    self.registration.showNotification(data.title || 'MotoTaller', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'mensaje',
      renotify: true,
      data: { url: data.url || '/mensajes' },
      vibrate: [200, 100, 200],
      requireInteraction: false,
    })
  )
})

// Al hacer click en la notificación → abrir la app en /mensajes
self.addEventListener('notificationclick', event => {
  event.notification.close()

  const url = event.notification.data?.url || '/mensajes'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Si la app ya está abierta, enfocala y navegá
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // Si no está abierta, abrí una ventana nueva
      return self.clients.openWindow(url)
    })
  )
})
