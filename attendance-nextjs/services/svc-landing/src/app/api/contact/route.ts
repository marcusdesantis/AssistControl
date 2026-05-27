const BASE_LINK = process.env.CONTACT_LINK ?? ''

export async function GET(req: Request) {
  if (!BASE_LINK) return Response.json({ error: 'Not configured' }, { status: 404 })

  const text       = new URL(req.url).searchParams.get('text') ?? 'Me interesa registrarme en TiempoYa'
  const encoded    = encodeURIComponent(text)
  const webUrl     = `${BASE_LINK}&text=${encoded}`
  // Esquema nativo — en móvil abre la app sin mostrar URL en el navegador
  const appUrl     = webUrl.replace('https://api.whatsapp.com/send', 'whatsapp://send')

  const html = `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex,nofollow">
  <title>Contacto</title>
  <style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0fdf4;gap:12px}
  .icon{width:56px;height:56px;background:#25D366;border-radius:50%;display:flex;align-items:center;justify-content:center}
  p{color:#4b5563;font-size:15px;margin:0}</style>
</head><body>
  <div class="icon"><svg viewBox="0 0 24 24" width="28" height="28" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.532 5.843L.053 23.27a.75.75 0 00.917.917l5.427-1.479A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.897 0-3.674-.497-5.217-1.367l-.374-.215-3.878 1.055 1.055-3.878-.215-.374A9.956 9.956 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg></div>
  <p>Abriendo WhatsApp…</p>
<script>
(function(){
  var app = ${JSON.stringify(appUrl)};
  var web = ${JSON.stringify(webUrl)};

  // Si la app abre, el tab se oculta — cancelamos el fallback
  var fallback = setTimeout(function(){
    window.location.replace(web);
  }, 1500);

  document.addEventListener('visibilitychange', function(){
    if (document.hidden) clearTimeout(fallback);
  });

  window.location.href = app;
})();
</script>
</body></html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
