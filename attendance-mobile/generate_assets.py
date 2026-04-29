"""Genera icon.png (1024x1024) y splash.png (1284x2778) para TiempoYa."""
import math
from PIL import Image, ImageDraw, ImageFont

# ── Colores ───────────────────────────────────────────────────────────────────
BG        = (15,  23,  42)   # #0f172a
CARD      = (30,  41,  59)   # #1e293b
BLUE      = (37,  99, 235)   # #2563eb
BLUE_DARK = (29,  58, 95)    # reloj fondo
WHITE     = (241, 245, 249)  # #f1f5f9
GRAY      = (148, 163, 184)  # #94a3b8

def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))

def rounded_rect(draw, xy, radius, fill):
    x0, y0, x1, y1 = xy
    draw.rectangle([x0 + radius, y0, x1 - radius, y1], fill=fill)
    draw.rectangle([x0, y0 + radius, x1, y1 - radius], fill=fill)
    for cx, cy in [(x0+radius, y0+radius), (x1-radius, y0+radius),
                   (x0+radius, y1-radius), (x1-radius, y1-radius)]:
        draw.ellipse([cx-radius, cy-radius, cx+radius, cy+radius], fill=fill)

def gradient_bg(size):
    img = Image.new('RGB', size)
    w, h = size
    for y in range(h):
        t = y / h
        c = lerp_color((20, 30, 55), BG, t)
        for x in range(w):
            img.putpixel((x, y), c)
    return img

def clock_layer(draw, cx, cy, R, line_w):
    """Dibuja un reloj analógico centrado en (cx, cy) con radio R."""
    # Círculo exterior
    draw.ellipse([cx-R, cy-R, cx+R, cy+R], outline=BLUE, width=line_w)
    # Relleno interior oscuro
    inner = R - line_w
    draw.ellipse([cx-inner, cy-inner, cx+inner, cy+inner], fill=BLUE_DARK)
    # Marcas de hora (12, 3, 6, 9)
    for angle_deg in range(0, 360, 30):
        angle = math.radians(angle_deg - 90)
        r_out = inner - 4
        r_in  = r_out - (line_w * 2 if angle_deg % 90 == 0 else line_w)
        x1 = cx + r_out * math.cos(angle)
        y1 = cy + r_out * math.sin(angle)
        x2 = cx + r_in  * math.cos(angle)
        y2 = cy + r_in  * math.sin(angle)
        draw.line([x1, y1, x2, y2], fill=WHITE, width=max(2, line_w // 2))
    # Manecilla hora (apuntando a las 10)
    h_angle = math.radians(300 - 90)
    h_len   = inner * 0.5
    draw.line([cx, cy,
               cx + h_len * math.cos(h_angle),
               cy + h_len * math.sin(h_angle)],
              fill=WHITE, width=max(3, line_w))
    # Manecilla minutos (apuntando a las 2)
    m_angle = math.radians(60 - 90)
    m_len   = inner * 0.7
    draw.line([cx, cy,
               cx + m_len * math.cos(m_angle),
               cy + m_len * math.sin(m_angle)],
              fill=WHITE, width=max(2, line_w - 1))
    # Centro
    r_dot = max(4, line_w)
    draw.ellipse([cx-r_dot, cy-r_dot, cx+r_dot, cy+r_dot], fill=BLUE)

def checkmark(draw, cx, cy, size, color, width):
    """Dibuja un ✓ centrado."""
    x1 = cx - size * 0.45
    y1 = cy + size * 0.05
    xm = cx - size * 0.05
    ym = cy + size * 0.45
    x2 = cx + size * 0.45
    y2 = cy - size * 0.35
    draw.line([x1, y1, xm, ym], fill=color, width=width)
    draw.line([xm, ym, x2, y2], fill=color, width=width)

def get_font(size, bold=False):
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/Arial Bold.ttf" if bold else "C:/Windows/Fonts/Arial.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()

# ─── ICON 1024x1024 ──────────────────────────────────────────────────────────
def make_icon():
    S = 1024
    img = gradient_bg((S, S))
    draw = ImageDraw.Draw(img)

    # Reloj
    cx, cy = S // 2, S // 2 - 60
    R      = 280
    lw     = 18
    clock_layer(draw, cx, cy, R, lw)

    # Checkmark en la esquina inferior derecha del reloj
    ck_cx = cx + int(R * 0.62)
    ck_cy = cy + int(R * 0.62)
    ck_r  = 68
    draw.ellipse([ck_cx-ck_r, ck_cy-ck_r, ck_cx+ck_r, ck_cy+ck_r], fill=BLUE)
    checkmark(draw, ck_cx, ck_cy, ck_r * 0.9, WHITE, 8)

    # Texto "TiempoYa"
    font_big = get_font(102, bold=True)
    font_sub = get_font(44)
    text1 = "TiempoYa"
    text2 = "Control de asistencia"
    bb1 = draw.textbbox((0, 0), text1, font=font_big)
    bb2 = draw.textbbox((0, 0), text2, font=font_sub)
    w1 = bb1[2] - bb1[0]
    w2 = bb2[2] - bb2[0]
    ty = cy + R + 40
    draw.text(((S - w1) // 2, ty),      text1, font=font_big, fill=WHITE)
    draw.text(((S - w2) // 2, ty + 115), text2, font=font_sub, fill=GRAY)

    img.save("icon.png")
    print("OK icon.png generado (1024x1024)")

# ─── SPLASH 1284x2778 ─────────────────────────────────────────────────────────
def make_splash():
    W, H = 1284, 2778
    img  = gradient_bg((W, H))
    draw = ImageDraw.Draw(img)

    # Círculo decorativo fondo
    for i, (r, alpha) in enumerate([(620, 18), (500, 30), (400, 50)]):
        overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        od.ellipse([W//2 - r, H//2 - r - 120, W//2 + r, H//2 + r - 120],
                   outline=(*BLUE, alpha), width=2)
        img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

    draw = ImageDraw.Draw(img)

    # Reloj
    cx, cy = W // 2, H // 2 - 200
    R  = 320
    lw = 20
    clock_layer(draw, cx, cy, R, lw)

    # Checkmark
    ck_cx = cx + int(R * 0.62)
    ck_cy = cy + int(R * 0.62)
    ck_r  = 80
    draw.ellipse([ck_cx-ck_r, ck_cy-ck_r, ck_cx+ck_r, ck_cy+ck_r], fill=BLUE)
    checkmark(draw, ck_cx, ck_cy, ck_r * 0.9, WHITE, 10)

    # Textos
    font_name = get_font(130, bold=True)
    font_tag  = get_font(52)
    font_sub  = get_font(40)

    name = "TiempoYa"
    tag  = "Control de asistencia"
    sub  = "Registra tu jornada laboral"

    bb_n = draw.textbbox((0, 0), name, font=font_name)
    bb_t = draw.textbbox((0, 0), tag,  font=font_tag)
    bb_s = draw.textbbox((0, 0), sub,  font=font_sub)

    ty = cy + R + 60
    draw.text(((W - (bb_n[2]-bb_n[0])) // 2, ty),       name, font=font_name, fill=WHITE)
    draw.text(((W - (bb_t[2]-bb_t[0])) // 2, ty + 150),  tag,  font=font_tag,  fill=BLUE)
    draw.text(((W - (bb_s[2]-bb_s[0])) // 2, ty + 225),  sub,  font=font_sub,  fill=GRAY)

    # Línea decorativa inferior
    draw.line([(W//2 - 60, H - 180), (W//2 + 60, H - 180)], fill=BLUE_DARK, width=3)
    font_ver = get_font(34)
    ver = "v1.0"
    bb_v = draw.textbbox((0, 0), ver, font=font_ver)
    draw.text(((W - (bb_v[2]-bb_v[0])) // 2, H - 155), ver, font=font_ver, fill=(50, 65, 90))

    img.save("splash.png")
    print("OK splash.png generado (1284x2778)")

make_icon()
make_splash()
