/**
 * Genera el icono PNG 1024x1024 para TiempoYa Admin.
 * Diseño: fondo degradado azul, reloj blanco, texto "TA".
 * Uso: node generate-icon.js
 */
const zlib = require('zlib')
const fs   = require('fs')
const path = require('path')

const SIZE = 1024

// ── helpers PNG ──────────────────────────────────────────────────────────────
function crc32(buf) {
  const table = (() => {
    const t = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[i] = c
    }
    return t
  })()
  let c = 0xffffffff
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length)
  const body = Buffer.concat([typeBytes, data])
  const crc  = Buffer.allocUnsafe(4); crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function buildPng(pixels) {
  const sig = Buffer.from([137,80,78,71,13,10,26,10])

  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(SIZE, 0)
  ihdr.writeUInt32BE(SIZE, 4)
  ihdr[8]  = 8   // bit depth
  ihdr[9]  = 2   // color type RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  // Raw scanlines: filter byte (0) + RGB bytes per row
  const raw = Buffer.allocUnsafe(SIZE * (1 + SIZE * 3))
  for (let y = 0; y < SIZE; y++) {
    raw[y * (1 + SIZE * 3)] = 0 // filter none
    for (let x = 0; x < SIZE; x++) {
      const [r, g, b] = pixels[y * SIZE + x]
      const off = y * (1 + SIZE * 3) + 1 + x * 3
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 6 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))])
}

// ── dibujo ───────────────────────────────────────────────────────────────────
const pixels = new Array(SIZE * SIZE)

const cx = SIZE / 2, cy = SIZE / 2
const R  = SIZE / 2

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const dx = x - cx, dy = y - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    const norm = dist / R   // 0 = center, 1 = edge

    // Fondo: círculo azul con esquinas redondeadas (rect redondeado)
    const rx = Math.abs(x - cx), ry = Math.abs(y - cy)
    const corner = SIZE * 0.18
    const inRect = rx < SIZE/2 - corner && ry < SIZE/2 ||
                   ry < SIZE/2 - corner && rx < SIZE/2 ||
                   Math.sqrt(Math.pow(rx - (SIZE/2 - corner), 2) + Math.pow(ry - (SIZE/2 - corner), 2)) < corner

    if (!inRect) { pixels[y * SIZE + x] = [0, 0, 0, 0]; continue }

    // Degradado azul: #1e40af → #3b82f6
    const t = (y / SIZE)
    const r = Math.round(0x1e + (0x3b - 0x1e) * t)
    const g = Math.round(0x40 + (0x82 - 0x40) * t)
    const b = Math.round(0xaf + (0xf6 - 0xaf) * t)
    pixels[y * SIZE + x] = [r, g, b]
  }
}

// ── reloj ────────────────────────────────────────────────────────────────────
function drawCircle(px, py, radius, r, g, b, aa = 1.5) {
  const ir = Math.floor(px - radius - 2), er = Math.ceil(px + radius + 2)
  const iy = Math.floor(py - radius - 2), ey = Math.ceil(py + radius + 2)
  for (let y = iy; y <= ey; y++) {
    for (let x = ir; x <= er; x++) {
      if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) continue
      const d = Math.sqrt((x - px) ** 2 + (y - py) ** 2)
      const alpha = Math.max(0, Math.min(1, radius + aa - d) / aa)
      if (alpha <= 0) continue
      const idx = y * SIZE + x
      if (!pixels[idx]) continue
      pixels[idx] = [
        Math.round(pixels[idx][0] * (1 - alpha) + r * alpha),
        Math.round(pixels[idx][1] * (1 - alpha) + g * alpha),
        Math.round(pixels[idx][2] * (1 - alpha) + b * alpha),
      ]
    }
  }
}

function drawLine(x1, y1, x2, y2, thick, r, g, b) {
  const steps = Math.ceil(Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) * 2)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const px = x1 + (x2 - x1) * t
    const py = y1 + (y2 - y1) * t
    drawCircle(px, py, thick / 2, r, g, b)
  }
}

const cR = SIZE * 0.30   // radio del reloj
drawCircle(cx, cy, cR, 255, 255, 255)
drawCircle(cx, cy, cR - SIZE * 0.025, 0x2c, 0x55, 0xbf)  // interior

// tic marks
for (let i = 0; i < 12; i++) {
  const angle = (i / 12) * Math.PI * 2 - Math.PI / 2
  const r1 = cR - SIZE * 0.03
  const r2 = cR - SIZE * 0.07
  drawLine(
    cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1,
    cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2,
    SIZE * 0.018, 255, 255, 255
  )
}

// minutero (hacia arriba-derecha, 10:10)
const m1 = -Math.PI / 2 + Math.PI * 0.12
drawLine(cx, cy, cx + Math.cos(m1) * (cR * 0.72), cy + Math.sin(m1) * (cR * 0.72), SIZE * 0.022, 255, 255, 255)
const h1 = -Math.PI / 2 - Math.PI * 0.15
drawLine(cx, cy, cx + Math.cos(h1) * (cR * 0.52), cy + Math.sin(h1) * (cR * 0.52), SIZE * 0.030, 255, 255, 255)

// centro
drawCircle(cx, cy, SIZE * 0.022, 255, 255, 255)

// ── guardar ──────────────────────────────────────────────────────────────────
const assetsDir = path.join(__dirname, 'assets')
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir)

const png = buildPng(pixels.map(p => p || [0, 0, 0]))
const outPath = path.join(assetsDir, 'icon.png')
fs.writeFileSync(outPath, png)
console.log(`✓ Icono generado: ${outPath}  (${Math.round(png.length / 1024)} KB)`)
