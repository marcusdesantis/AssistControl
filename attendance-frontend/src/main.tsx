import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { Toaster } from 'sonner'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { router } from './app/router'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 * 5 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors closeButton duration={3000} />
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>
)

// Marcar plataforma iOS en el body para CSS condicional (safe-area-inset solo en iOS)
if (Capacitor.getPlatform() === 'ios') {
  document.body.classList.add('platform-ios')
}

// Ocultar splash cuando React haya montado la app
if (Capacitor.isNativePlatform()) {
  SplashScreen.hide({ fadeOutDuration: 500 })
}
