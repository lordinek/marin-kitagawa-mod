// Noyan kız: Ali'nin örnek görselinden portre (portrait-data.ts, PW x PH piksel) + düşünce balonu.
// Çeyrek blok çizim: bir terminal hücresi 2x2 pikseldir, iki renkle (▘▝▖▗▚▞▛▜▙▟ …). Hücre dikeyde iki kat uzun
// olduğundan portre yatayda iki kat örneklenir; bu, yarım bloğa göre yatayda iki kat detay verir.
// Animasyon: göz kırpma, konuşan ağız, göz kırpışı (wink), nefes.

import type { KizMode } from '../types'
import { PH, PW, VARIANTS, type Variant } from './portrait-data'

export type Mode = KizMode

const BUBBLE_CELLS = 14
export const COLUMNS = PW / 2 + BUBBLE_CELLS
export const ROWS = PH / 2
const GW = COLUMNS * 2
const GH = ROWS * 2

const WHITE = 0xffffff
const PINK = 0xff2d95
const GREY = 0xc8c8d2
const INNER = 0x16161c
const DEFAULT = 0x01000000

// Çeyrek blok karakterleri, maske: sol üst=1, sağ üst=2, sol alt=4, sağ alt=8.
const QUAD = [
  0x20, 0x2598, 0x259d, 0x2580, 0x2596, 0x258c, 0x259e, 0x259b,
  0x2597, 0x259a, 0x2590, 0x259c, 0x2584, 0x2599, 0x259f, 0x2588,
]

/** Piksel ızgarası: renk (0xRRGGBB) ya da boş. */
type Grid = (number | null)[][]

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const B64_INDEX = new Map([...B64].map((c, i) => [c, i]))

function decode64(s: string): Uint8Array {
  const clean = s.replace(/=+$/, '')
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4))
  let o = 0
  for (let i = 0; i < clean.length; i += 4) {
    const n = [0, 1, 2, 3].reduce((acc, k) => (acc << 6) | (B64_INDEX.get(clean[i + k] ?? 'A') ?? 0), 0)
    if (o < out.length) out[o++] = (n >> 16) & 255
    if (o < out.length) out[o++] = (n >> 8) & 255
    if (o < out.length) out[o++] = n & 255
  }
  return out
}

function base64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0, b = bytes[i + 1] ?? 0, c = bytes[i + 2] ?? 0
    const n = (a << 16) | (b << 8) | c
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63]! : '='
    out += i + 2 < bytes.length ? B64[n & 63]! : '='
  }
  return out
}

// Varyasyonlar bir kez çözülür: PW x PH renk ızgarası.
const PORTRAITS = new Map<Variant, Grid>()
function portrait(v: Variant): Grid {
  let g = PORTRAITS.get(v)
  if (!g) {
    const rgba = decode64(VARIANTS[v])
    g = Array.from({ length: PH }, (_, y) =>
      Array.from({ length: PW }, (_, x) => {
        const i = (y * PW + x) * 4
        return (rgba[i + 3] ?? 0) < 128 ? null : ((rgba[i] ?? 0) << 16) | ((rgba[i + 1] ?? 0) << 8) | (rgba[i + 2] ?? 0)
      }),
    )
    PORTRAITS.set(v, g)
  }
  return g
}

const CLOUD = [
  '.WWWWWWWWW.',
  'WDDDDDDDDDW',
  'WDDDDDDDDDW',
  'WDDDDDDDDDW',
  '.WWWWWWWWW.',
]
const CLOUD_COLORS: Record<string, number> = { W: WHITE, D: INNER }

// Balon hücre sütunlarıyla çizilir: bir balon pikseli yatayda iki ızgara pikseli (kare görünsün diye).
function setCell(g: Grid, cx: number, y: number, c: number | null) {
  const line = g[y]
  if (!line) return
  for (const x of [cx * 2, cx * 2 + 1]) if (x >= 0 && x < GW) line[x] = c
}

const BX = PW / 2 // balonun başladığı hücre sütunu

function bubble(g: Grid, fill: (g: Grid) => void) {
  setCell(g, BX, 16, WHITE)
  setCell(g, BX + 1, 13, WHITE)
  setCell(g, BX + 2, 13, WHITE)
  CLOUD.forEach((row, dy) => [...row].forEach((c, dx) => c !== '.' && setCell(g, BX + 2 + dx, 4 + dy, CLOUD_COLORS[c] ?? null)))
  fill(g)
}

type Pose = { variant: Variant; bob: number; bubble: string }

function pose(mode: Mode, t: number): Pose {
  const blink = t % 28 < 2
  const talking = mode === 'responding'
  const mouthOpen = talking && Math.floor(t / 2) % 2 === 0
  const wink = talking && t % 40 >= 30 && t % 40 < 36
  const variant: Variant = blink
    ? mouthOpen ? 'blink' : 'blinkShut'
    : wink ? 'wink' : mouthOpen ? 'open' : 'shut'
  // Kayma yok: çeyrek blokta 1 piksellik kayma her hücrenin renk bölmesini değiştirir, resim titrer.
  const bob = 0
  const bubbleKey = mode === 'thinking' || mode === 'requesting' ? `d${Math.floor(t / 3) % 4}`
    : mode === 'tool-use' || mode === 'tool-input' ? `b${t % 11}` : ''
  return { variant, bob, bubble: bubbleKey }
}

function draw(p: Pose): Grid {
  const src = portrait(p.variant)
  const g: Grid = Array.from({ length: GH }, (_, y) =>
    Array.from({ length: GW }, (_, x) => (x < PW ? src[y - p.bob]?.[x] ?? null : null)),
  )
  const n = Number(p.bubble.slice(1))
  if (p.bubble.startsWith('d')) {
    bubble(g, (b) => {
      for (let i = 0; i < 3; i++) setCell(b, BX + 4 + i * 3, 6, i < n ? PINK : GREY)
    })
  } else if (p.bubble.startsWith('b')) {
    bubble(g, (b) => {
      for (let x = 0; x < 9; x++) setCell(b, BX + 3 + x, 6, Math.abs(x - n + 1) <= 1 ? PINK : INNER)
    })
  }
  return g
}

/** `t`: 8 fps sayaç. Aynı (mode, t) her zaman aynı kareyi verir. */
export const pixels = (mode: Mode, t: number): Grid => draw(pose(mode, t))

const avg = (cs: number[]) => {
  let r = 0, g = 0, b = 0
  for (const c of cs) { r += c >> 16; g += (c >> 8) & 255; b += c & 255 }
  const n = cs.length
  return (Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(b / n)
}

const dist = (a: number, b: number) => {
  const dr = (a >> 16) - (b >> 16), dg = ((a >> 8) & 255) - ((b >> 8) & 255), db = (a & 255) - (b & 255)
  return dr * dr + dg * dg + db * db
}

/** Bir hücrenin 4 pikselinden [karakter, ön renk, arka renk]: boşlar terminalin zemini, doluysa en iyi iki renkli bölme. */
function cell(px: (number | null)[]): [number, number, number] {
  const solid = px.map((c) => c !== null)
  if (!solid.some(Boolean)) return [0x20, DEFAULT, DEFAULT]
  if (!solid.every(Boolean)) {
    const mask = solid.reduce((m, s, i) => (s ? m | (1 << i) : m), 0)
    return [QUAD[mask]!, avg(px.filter((c): c is number => c !== null)), DEFAULT]
  }
  const cs = px as number[]
  let best: [number, number, number, number] = [Infinity, 15, avg(cs), avg(cs)]
  for (let m = 0; m < 8; m++) {
    const on = cs.filter((_, i) => (m >> i) & 1)
    const off = cs.filter((_, i) => !((m >> i) & 1))
    const c1 = on.length ? avg(on) : avg(off)
    const c0 = off.length ? avg(off) : c1
    const err = cs.reduce((e, c, i) => e + dist(c, (m >> i) & 1 ? c1 : c0), 0)
    if (err < best[0]) best = [err, m === 0 ? 15 : m, m === 0 ? c0 : c1, c0]
  }
  return [QUAD[best[1]]!, best[2], best[3]]
}

/** Izgarayı Raster hücrelerine çevirir: base64, hücre başına [kod noktası, ön, arka] u32 LE. */
export function encode(g: Grid): string {
  const words = new Uint32Array(COLUMNS * ROWS * 3)
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLUMNS; x++) {
      const at = (dx: number, dy: number) => g[y * 2 + dy]?.[x * 2 + dx] ?? null
      words.set(cell([at(0, 0), at(1, 0), at(0, 1), at(1, 1)]), (y * COLUMNS + x) * 3)
    }
  }
  return base64(new Uint8Array(words.buffer))
}

// Aynı poz tekrar tekrar gelir (kırpma, konuşma, balon döngüsü): kodlanmış kare saklanır.
const CACHE = new Map<string, string>()

/** Karenin kimliği: aynıysa çizim aynıdır, yeniden gönderilmez. */
export function frameKey(mode: Mode, t: number): string {
  const p = pose(mode, t)
  return `${p.variant}|${p.bob}|${p.bubble}`
}

export function frame(mode: Mode, t: number): string {
  const p = pose(mode, t)
  const key = frameKey(mode, t)
  let cells = CACHE.get(key)
  if (!cells) {
    cells = encode(draw(p))
    CACHE.set(key, cells)
  }
  return cells
}
