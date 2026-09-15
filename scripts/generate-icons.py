#!/usr/bin/env python3
"""Ikon-generator a Szorzo Mano PWA-hoz (kulso fuggoseg nelkul, tiszta Python PNG iro)."""
import zlib, struct, math, os

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "icons")

def write_png(path, w, h, buf):
    raw = b"".join(b"\x00" + bytes(buf[y * w * 4:(y + 1) * w * 4]) for y in range(h))
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))

def lerp(a, b, t):
    return a + (b - a) * t

def seg_dist(px, py, x1, y1, x2, y2):
    vx, vy = x2 - x1, y2 - y1
    wx, wy = px - x1, py - y1
    L2 = vx * vx + vy * vy
    t = 0.0 if L2 == 0 else max(0.0, min(1.0, (wx * vx + wy * vy) / L2))
    dx, dy = px - (x1 + t * vx), py - (y1 + t * vy)
    return math.hypot(dx, dy)

def render(size, maskable=False, ss=3):
    W = size * ss
    buf = bytearray(size * size * 4)
    pad = 0.0 if maskable else 0.0
    radius = W * (0.5 if maskable else 0.235)
    inset = W * (0.19 if maskable else 0.0)  # maskable safe zone: kisebb jel
    c0 = (124, 92, 255)   # #7C5CFF
    c1 = (255, 107, 169)  # #FF6BA9
    cx = cy = W / 2.0
    half = (W - inset * 2) * 0.185
    thick = (W - inset * 2) * 0.085
    for y in range(size):
        for x in range(size):
            r = g = b = a = 0.0
            for sy in range(ss):
                for sx in range(ss):
                    fx = x * ss + sx + 0.5
                    fy = y * ss + sy + 0.5
                    # lekerekitett negyzet alfa
                    dx = max(abs(fx - W / 2) - (W / 2 - radius - pad), 0.0)
                    dy = max(abs(fy - W / 2) - (W / 2 - radius - pad), 0.0)
                    d = math.hypot(dx, dy) - radius
                    if maskable:
                        shape = 1.0
                    else:
                        shape = max(0.0, min(1.0, 0.5 - d))
                    if shape <= 0:
                        continue
                    t = max(0.0, min(1.0, (fx / W * 0.6 + fy / W * 0.6)))
                    br, bg, bb = lerp(c0[0], c1[0], t), lerp(c0[1], c1[1], t), lerp(c0[2], c1[2], t)
                    # fenyfolt
                    gl = math.hypot(fx - W * 0.28, fy - W * 0.24) / (W * 0.55)
                    glow = max(0.0, 1.0 - gl) ** 2 * 0.35
                    br = lerp(br, 255, glow); bg = lerp(bg, 255, glow); bb = lerp(bb, 255, glow)
                    # az X jel
                    d1 = seg_dist(fx, fy, cx - half, cy - half, cx + half, cy + half)
                    d2 = seg_dist(fx, fy, cx - half, cy + half, cx + half, cy - half)
                    dm = min(d1, d2) - thick / 2
                    mark = max(0.0, min(1.0, 0.5 - dm))
                    br = lerp(br, 255, mark); bg = lerp(bg, 255, mark); bb = lerp(bb, 255, mark)
                    r += br * shape; g += bg * shape; b += bb * shape; a += 255 * shape
            n = ss * ss
            i = (y * size + x) * 4
            buf[i] = int(r / n) if a else 0
            buf[i + 1] = int(g / n) if a else 0
            buf[i + 2] = int(b / n) if a else 0
            buf[i + 3] = int(a / n)
            if buf[i + 3] > 0:
                buf[i] = min(255, int(r / max(a / 255.0, 0.0001) / n * n / 255 * 255)) if False else buf[i]
    return buf

def save(name, size, maskable=False):
    buf = render(size, maskable)
    path = os.path.join(OUT, name)
    write_png(path, size, size, buf)
    print("ok:", path, os.path.getsize(path), "bajt")

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    save("icon-192.png", 192)
    save("icon-512.png", 512)
    save("icon-maskable-512.png", 512, maskable=True)
    save("apple-touch-icon.png", 180)
    save("favicon-64.png", 64)
