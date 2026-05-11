/**
 * Genera icon.png (1024x1024) y splash.png (1242x2436) para TiempoYa Mobile.
 * Diseño: fondo oscuro #0f172a, reloj blanco centrado.
 * Uso: node generate-assets.cjs
 */
const zlib = require('zlib')
const fs   = require('fs')
const path = require('path')

// ── PNG builder ───────────────────────────────────────────────────────────────
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

function buildPng(pixels, W, H) {
  const sig = Buffer.from([137,80,78,71,13,10,26,10])
  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  const raw = Buffer.allocUnsafe(H * (1 + W * 3))
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0
    for (let x = 0; x < W; x++) {
      const [r, g, b] = pixels[y * W + x] || [0, 0, 0]
      const off = y * (1 + W * 3) + 1 + x * 3
      raw[off] = r; raw[off+1] = g; raw[off+2] = b
    }
  }
  const compressed = zlib.deflateSync(raw, { level: 6 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))])
}

// ── Drawing helpers ───────────────────────────────────────────────────────────
function drawCircle(pixels, W, H, px, py, radius, r, g, b, aa = 1.5) {
  const ir = Math.floor(px - radius - 2), er = Math.ceil(px + radius + 2)
  const iy = Math.floor(py - radius - 2), ey = Math.ceil(py + radius + 2)
  for (let y = iy; y <= ey; y++) {
    for (let x = ir; x <= er; x++) {
      if (x < 0 || x >= W || y < 0 || y >= H) continue
      const d = Math.sqrt((x - px) ** 2 + (y - py) ** 2)
      const alpha = Math.max(0, Math.min(1, (radius + aa - d) / aa))
      if (alpha <= 0) continue
      const idx = y * W + x
      pixels[idx] = [
        Math.round(pixels[idx][0] * (1 - alpha) + r * alpha),
        Math.round(pixels[idx][1] * (1 - alpha) + g * alpha),
        Math.round(pixels[idx][2] * (1 - alpha) + b * alpha),
      ]
    }
  }
}

function drawLine(pixels, W, H, x1, y1, x2, y2, thick, r, g, b) {
  const steps = Math.ceil(Math.sqrt((x2-x1)**2 + (y2-y1)**2) * 2)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    drawCircle(pixels, W, H, x1+(x2-x1)*t, y1+(y2-y1)*t, thick/2, r, g, b)
  }
}

// ── Draw clock on canvas ──────────────────────────────────────────────────────
function drawClock(pixels, W, H, cx, cy, clockR, bgR, bgG, bgB) {
  // Outer ring
  drawCircle(pixels, W, H, cx, cy, clockR, 255, 255, 255)
  // Inner fill (same as background)
  drawCircle(pixels, W, H, cx, cy, clockR - W * 0.025, bgR, bgG, bgB)

  // Tick marks
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2
    const r1 = clockR - W * 0.03
    const r2 = clockR - W * 0.07
    drawLine(pixels, W, H,
      cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1,
      cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2,
      W * 0.018, 255, 255, 255)
  }

  // Minute hand (10 position)
  const m1 = -Math.PI / 2 + Math.PI * 0.12
  drawLine(pixels, W, H, cx, cy,
    cx + Math.cos(m1) * (clockR * 0.72),
    cy + Math.sin(m1) * (clockR * 0.72),
    W * 0.022, 255, 255, 255)

  // Hour hand (8 position)
  const h1 = -Math.PI / 2 - Math.PI * 0.15
  drawLine(pixels, W, H, cx, cy,
    cx + Math.cos(h1) * (clockR * 0.52),
    cy + Math.sin(h1) * (clockR * 0.52),
    W * 0.030, 255, 255, 255)

  // Center dot
  drawCircle(pixels, W, H, cx, cy, W * 0.022, 255, 255, 255)
}

// ── BG color #0f172a ──────────────────────────────────────────────────────────
const BG = [0x0f, 0x17, 0x2a]

// ─────────────────────────────────────────────────────────────────────────────
// 1. ICON  1024×1024
// ─────────────────────────────────────────────────────────────────────────────
function generateIcon() {
  const W = 1024, H = 1024
  const cx = W / 2, cy = H / 2
  const corner = W * 0.18

  const pixels = new Array(W * H)

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const rx = Math.abs(x - cx), ry = Math.abs(y - cy)
      const inRect =
        (rx < W/2 - corner && ry < H/2) ||
        (ry < H/2 - corner && rx < W/2) ||
        Math.sqrt((rx-(W/2-corner))**2 + (ry-(H/2-corner))**2) < corner
      pixels[y * W + x] = inRect ? [...BG] : [0, 0, 0]
    }
  }

  drawClock(pixels, W, H, cx, cy, W * 0.30, ...BG)

  const png = buildPng(pixels, W, H)
  fs.writeFileSync(path.join(__dirname, 'icon.png'), png)
  console.log(`✓ icon.png generado (${Math.round(png.length/1024)} KB)`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SPLASH  1242×2436 (portrait iPhone)
// ─────────────────────────────────────────────────────────────────────────────
function generateSplash() {
  const W = 1242, H = 2436
  const cx = W / 2, cy = H / 2

  const pixels = new Array(W * H)
  for (let i = 0; i < W * H; i++) pixels[i] = [...BG]

  // Reloj centrado
  const clockR = W * 0.26
  drawClock(pixels, W, H, cx, cy, clockR, ...BG)

  // Texto "TiempoYa" debajo del reloj (puntos blancos formando letras es complejo,
  // lo hacemos con una barra decorativa sencilla)
  const barY = cy + clockR + W * 0.12
  const barW = W * 0.35
  const barH = W * 0.012
  for (let y = Math.floor(barY); y < Math.floor(barY + barH); y++) {
    for (let x = Math.floor(cx - barW/2); x < Math.floor(cx + barW/2); x++) {
      if (x >= 0 && x < W && y >= 0 && y < H)
        pixels[y * W + x] = [255, 255, 255]
    }
  }

  const png = buildPng(pixels, W, H)
  fs.writeFileSync(path.join(__dirname, 'splash.png'), png)
  console.log(`✓ splash.png generado (${Math.round(png.length/1024)} KB)`)
}

generateIcon()
generateSplash()
console.log('Listo.')
