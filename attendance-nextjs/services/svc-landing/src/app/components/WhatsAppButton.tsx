'use client'
import { useState } from 'react'

const OPTIONS = [
  'Tengo problemas para crear mi cuenta',
  'Quiero conocer los planes y precios',
  'Necesito una demo para mi empresa',
]

export default function WhatsAppButton({ page }: { page: string }) {
  const [open, setOpen]     = useState(false)
  const [custom, setCustom] = useState('')

  function contact(option: string) {
    if (!option.trim()) return
    const device = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
    fetch('/api/track', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ page, option, device }),
    }).catch(() => {})
    window.open(`/api/contact?text=${encodeURIComponent(option)}`, '_blank')
    setOpen(false)
    setCustom('')
  }

  return (
    <>
      {/* Overlay para cerrar */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

        {/* Menú de opciones */}
        {open && (
          <div className="bg-white rounded-2xl shadow-2xl w-72 overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="bg-[#25D366] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.532 5.843L.053 23.27a.75.75 0 00.917.917l5.427-1.479A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.897 0-3.674-.497-5.217-1.367l-.374-.215-3.878 1.055 1.055-3.878-.215-.374A9.956 9.956 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold leading-tight">TiempoYa</p>
                  <p className="text-white/80 text-xs">¿En qué podemos ayudarte?</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Opciones */}
            <div className="p-3 space-y-2">
              {OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => contact(opt)}
                  className="w-full text-left text-sm px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-green-50 hover:text-green-700 border border-gray-100 hover:border-green-200 transition-colors">
                  {opt}
                </button>
              ))}

              {/* Campo personalizado */}
              <div className="flex gap-2 mt-1">
                <input
                  value={custom}
                  onChange={e => setCustom(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && contact(custom)}
                  placeholder="Escribe tu consulta..."
                  className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-300"
                />
                <button
                  onClick={() => contact(custom)}
                  disabled={!custom.trim()}
                  className="p-2 bg-[#25D366] text-white rounded-xl hover:bg-[#1ebe5d] disabled:opacity-40 transition-colors">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Botón flotante */}
        <button
          onClick={() => setOpen(v => !v)}
          className="w-14 h-14 bg-[#25D366] hover:bg-[#1ebe5d] rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.532 5.843L.053 23.27a.75.75 0 00.917.917l5.427-1.479A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.897 0-3.674-.497-5.217-1.367l-.374-.215-3.878 1.055 1.055-3.878-.215-.374A9.956 9.956 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
        </button>
      </div>
    </>
  )
}
