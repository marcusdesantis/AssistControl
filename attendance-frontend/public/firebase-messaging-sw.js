importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

// Activar inmediatamente sin esperar a que los tabs se cierren
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(clients.claim()))

firebase.initializeApp({
  apiKey:            'AIzaSyBhPSEhtLvW5cEE-f-92PyuhAi5xGN942o',
  authDomain:        'tiempoya-admin.firebaseapp.com',
  projectId:         'tiempoya-admin',
  storageBucket:     'tiempoya-admin.firebasestorage.app',
  messagingSenderId: '233883273670',
  appId:             '1:233883273670:web:6d57b881befc9674770ac7',
})

const messaging = firebase.messaging()

// Push recibido cuando el navegador está en background / cerrado
messaging.onBackgroundMessage(payload => {
  const { title = 'TiempoYa', body = '' } = payload.notification ?? {}
  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.webp',
    badge: '/icons/icon-48.webp',
    data: payload.data ?? {},
  })
})
