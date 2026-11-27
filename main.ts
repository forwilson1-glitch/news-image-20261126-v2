// 26 November 2026 — The World in One Day (v4)
// Draws a 1024x1024 news summary image from scratch with Node 22+ stdlib only.
// No network, no fonts on disk, no randomness: two runs write identical bytes.
//
// Usage: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// PNG encoder (truecolour with alpha, filter 0 per scanline)
// ---------------------------------------------------------------------------

const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePNG(width: number, height: number, rgba: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type 6 = RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(
      raw,
      y * (1 + width * 4) + 1,
    );
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Canvas: a plain RGBA raster with flat-vector drawing primitives
// ---------------------------------------------------------------------------

type RGB = [number, number, number];

const W = 1024;
const H = 1024;

class Canvas {
  readonly w = W;
  readonly h = H;
  readonly buf = new Uint8Array(W * H * 4);

  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
    this.buf[i + 3] = 255;
  }

  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c);
  }

  // Filled ellipse.
  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
    for (let yy = cy - ry; yy <= cy + ry; yy++) {
      const dy = (yy - cy) / ry;
      if (Math.abs(dy) > 1) continue;
      const dx = Math.sqrt(1 - dy * dy) * rx;
      for (let xx = Math.ceil(cx - dx); xx <= Math.floor(cx + dx); xx++) this.set(xx, yy, c);
    }
  }

  circle(cx: number, cy: number, r: number, c: RGB): void {
    this.ellipse(cx, cy, r, r, c);
  }

  // Ring (circle outline) of given thickness.
  ring(cx: number, cy: number, r: number, t: number, c: RGB): void {
    for (let yy = cy - r - t; yy <= cy + r + t; yy++) {
      for (let xx = cx - r - t; xx <= cx + r + t; xx++) {
        const d = Math.sqrt((xx - cx) * (xx - cx) + (yy - cy) * (yy - cy));
        if (d <= r + t / 2 && d >= r - t / 2) this.set(xx, yy, c);
      }
    }
  }

  // Thick line via Bresenham with a square brush.
  line(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 1): void {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    const half = Math.floor(t / 2);
    for (let guard = 0; guard < 4096; guard++) {
      for (let oy = -half; oy <= half; oy++)
        for (let ox = -half; ox <= half; ox++) this.set(x + ox, y + oy, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  // Filled polygon (scanline fill).
  polygon(pts: [number, number][], c: RGB): void {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of pts) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[(i + 1) % pts.length];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
          xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
        }
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        for (let x = Math.ceil(xs[i]); x <= Math.floor(xs[i + 1]); x++) this.set(x, y, c);
      }
    }
  }

  // Wave band: fills from a sine top edge down to yBottom.
  wave(x0: number, x1: number, yBase: number, amp: number, yBottom: number, c: RGB): void {
    const pts: [number, number][] = [];
    for (let x = x0; x <= x1; x += 4) {
      pts.push([x, Math.round(yBase + Math.sin((x - x0) / 34) * amp)]);
    }
    pts.push([x1, yBottom]);
    pts.push([x0, yBottom]);
    this.polygon(pts, c);
  }
}

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

const BG: RGB = [12, 26, 46];
const PANEL: RGB = [19, 39, 63];
const GOLD: RGB = [242, 183, 5];
const WHITE: RGB = [242, 246, 251];
const MUTED: RGB = [159, 180, 204];
const RED: RGB = [228, 87, 46];
const GREEN: RGB = [47, 168, 102];
const BLUE: RGB = [78, 143, 209];
const SKY: RGB = [126, 156, 194];
const CLOUD: RGB = [94, 127, 168];
const RAIN: RGB = [127, 178, 229];
const BOLT: RGB = [255, 210, 63];
const WAVE1: RGB = [46, 107, 138];
const WAVE2: RGB = [58, 134, 176];
const WAVE3: RGB = [87, 168, 216];
const NAVY: RGB = [11, 61, 145];
const SAFFRON: RGB = [255, 153, 51];
const FLAGREEN: RGB = [19, 136, 8];
const BROWN: RGB = [139, 90, 43];
const DARK: RGB = [27, 42, 65];

// ---------------------------------------------------------------------------
// 5x7 bitmap font, drawn by hand for this entry (uppercase + digits + marks)
// ---------------------------------------------------------------------------

const FONT: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
};
const FONT2: Record<string, string[]> = {
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "..##.", ".#...", "#....", "#####"],
  "3": ["#####", "...#.", "..#..", "...#.", "....#", "#...#", ".###."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".##..", ".##..", ".#..."],
  "-": [".....", ".....", ".....", ".###.", ".....", ".....", "....."],
  "'": ["..#..", "..#..", ".#...", ".....", ".....", ".....", "....."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  ";": [".....", ".##..", ".##..", ".....", ".##..", ".##..", ".#..."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "..##.", "..#..", ".....", "..#.."],
  "/": ["....#", "...#.", "...#.", "..#..", ".#...", ".#...", "#...."],
  "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
  ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
  "&": [".##..", "#..#.", "#.#..", ".#...", "#.#.#", "#..#.", ".##.#"],
  "%": ["##..#", "##.#.", "...#.", "..#..", ".#...", "#.###", "#..##"],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "=": [".....", ".....", "#####", ".....", "#####", ".....", "....."],
  "•": [".....", ".....", ".###.", ".###.", ".###.", ".....", "....."],
  "×": [".....", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "....."],
};

const FONT3: Record<string, string[]> = {
  a: [".....", ".###.", "....#", ".####", "#...#", "#...#", ".###."],
  b: ["#....", "#....", "####.", "#...#", "#...#", "#...#", "####."],
  c: [".....", ".###.", "#....", "#....", "#....", "#....", ".###."],
  d: ["....#", "....#", ".####", "#...#", "#...#", "#...#", ".###."],
  e: [".....", ".###.", "#...#", "#####", "#....", "#...#", ".###."],
  f: ["..##.", ".#...", ".#...", "#####", ".#...", ".#...", ".#..."],
  g: [".....", ".####", "#...#", "#...#", ".####", "....#", ".###."],
  h: ["#....", "#....", "####.", "#...#", "#...#", "#...#", "#...#"],
  i: [".....", "..#..", ".....", ".##..", "..#..", "..#..", ".###."],
  j: [".....", "...#.", ".....", "..##.", "...#.", "...#.", ".##.."],
  k: ["#....", "#....", "#..#.", "#.#..", "##...", "#.#..", "#..#."],
  l: [".##..", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  m: [".....", ".....", "##.#.", "#.#.#", "#.#.#", "#...#", "#...#"],
  n: [".....", ".....", "####.", "#...#", "#...#", "#...#", "#...#"],
  o: [".....", ".###.", "#...#", "#...#", "#...#", "#...#", ".###."],
  p: [".....", ".....", "####.", "#...#", "#...#", "####.", "#...."],
  q: [".....", ".....", ".####", "#...#", "#...#", ".####", "....#"],
  r: [".....", ".....", "#.##.", "##..#", "#....", "#....", "#...."],
  s: [".....", ".####", "#....", ".###.", "....#", "#...#", ".###."],
  t: [".#...", ".#...", "#####", ".#...", ".#...", ".#...", "..##."],
  u: [".....", ".....", "#...#", "#...#", "#...#", "#...#", ".###."],
  v: [".....", ".....", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  w: [".....", ".....", "#...#", "#.#.#", "#.#.#", "#.#.#", ".#.#."],
  x: [".....", ".....", "#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  y: [".....", ".....", "#...#", "#...#", ".####", "....#", ".###."],
  z: [".....", ".....", "#####", "...#.", "..#..", ".#...", "#####"],
};

const GLYPHS: Record<string, string[]> = { ...FONT, ...FONT2, ...FONT3 };

function glyph(ch: string): string[] {
  return GLYPHS[ch] ?? GLYPHS["?"];
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}

function drawText(cv: Canvas, s: string, x: number, y: number, scale: number, c: RGB): void {
  let cx = x;
  for (const ch of s) {
    const g = glyph(ch);
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (g[row][col] === "#") {
          cv.rect(cx + col * scale, y + row * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}

function drawTextCentered(cv: Canvas, s: string, cx: number, y: number, scale: number, c: RGB): void {
  drawText(cv, s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, c);
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

function panel(cv: Canvas, x: number, y: number, w: number, h: number, border: RGB): void {
  cv.rect(x, y, w, h, PANEL);
  cv.rect(x, y, w, 3, border);
  cv.rect(x, y + h - 3, w, 3, border);
  cv.rect(x, y, 3, h, border);
  cv.rect(x + w - 3, y, 3, h, border);
}

function drawHeadlineArt(cv: Canvas): void {
  // Waves at the foot of the band.
  cv.wave(24, 372, 330, 5, 376, WAVE1);
  cv.wave(24, 372, 344, 5, 376, WAVE2);
  cv.wave(24, 372, 358, 5, 376, WAVE3);
  // Storm cloud.
  cv.ellipse(150, 205, 105, 30, CLOUD);
  cv.ellipse(100, 190, 60, 24, CLOUD);
  cv.ellipse(205, 190, 65, 24, CLOUD);
  cv.ellipse(150, 196, 92, 22, SKY);
  // Rain.
  for (const rx of [58, 82, 106, 130, 154, 178, 202, 226]) {
    cv.line(rx, 238, rx - 8, 268, RAIN, 3);
  }
  // Lightning bolt.
  cv.polygon(
    [
      [158, 240],
      [132, 294],
      [148, 294],
      [128, 340],
      [172, 274],
      [154, 274],
      [176, 240],
    ],
    BOLT,
  );
  // Parade balloon, grounded by the storm.
  cv.ellipse(305, 200, 30, 38, RED);
  cv.ellipse(305, 200, 10, 38, WHITE);
  cv.line(295, 238, 299, 252, BROWN, 2);
  cv.line(315, 238, 311, 252, BROWN, 2);
  cv.rect(297, 252, 16, 12, BROWN);
}

function drawChessPanel(cv: Canvas, x: number, y: number): void {
  panel(cv, x, y, 488, 240, GREEN);
  drawText(cv, "WORLD CHAMPIONSHIP • GENEVA", x + 18, y + 18, 2, GOLD);
  // Checkerboard, top right.
  const bx = x + 376;
  const by = y + 16;
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      cv.rect(bx + c * 16, by + r * 16, 16, 16, (r + c) % 2 === 0 ? WHITE : DARK);
    }
  }
  cv.rect(bx - 2, by - 2, 100, 2, GOLD);
  cv.rect(bx - 2, by + 96, 100, 2, GOLD);
  cv.rect(bx - 2, by - 2, 2, 100, GOLD);
  cv.rect(bx + 96, by - 2, 2, 100, GOLD);
  drawText(cv, "1.5-1.5", x + 18, y + 50, 6, WHITE);
  drawText(cv, "CHESS TITLE TIED", x + 18, y + 108, 3, WHITE);
  cv.rect(x + 18, y + 134, 90, 4, RED);
  drawText(cv, "GUKESH V SINDAROV", x + 18, y + 152, 2, MUTED);
  drawText(cv, "60-MOVE DRAW • GAME 3", x + 18, y + 178, 2, MUTED);
  drawText(cv, "BERLIN DEFENCE • RIO VARIATION", x + 18, y + 204, 2, MUTED);
}

function drawEuropaPanel(cv: Canvas, x: number, y: number): void {
  panel(cv, x, y, 488, 240, BLUE);
  drawText(cv, "EUROPE • MATCHDAY 5", x + 18, y + 18, 2, GOLD);
  // Football, top right.
  const cx = x + 418;
  const cy = y + 60;
  cv.circle(cx, cy, 34, WHITE);
  const pent: [number, number][] = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    pent.push([Math.round(cx + Math.cos(a) * 13), Math.round(cy + Math.sin(a) * 13)]);
  }
  cv.polygon(pent, DARK);
  for (const a of [0.6, 2.7, 4.8]) {
    cv.circle(Math.round(cx + Math.cos(a) * 26), Math.round(cy + Math.sin(a) * 26), 6, DARK);
  }
  drawText(cv, "EUROPA LEAGUE", x + 18, y + 50, 3, WHITE);
  cv.rect(x + 18, y + 78, 90, 4, RED);
  drawText(cv, "BOURNEMOUTH 2-1 CELTA • 10 MEN", x + 18, y + 100, 2, MUTED);
  drawText(cv, "MILAN 4-2 OLYMPIACOS", x + 18, y + 126, 2, MUTED);
  drawText(cv, "PLZEN 4-0 BENFICA", x + 18, y + 152, 2, MUTED);
  drawText(cv, "JUVENTUS 4-1 OMONIA", x + 18, y + 178, 2, MUTED);
  drawText(cv, "BOURNEMOUTH 5 WINS FROM 5", x + 18, y + 208, 2, GOLD);
}

function drawIndiaPanel(cv: Canvas, x: number, y: number): void {
  panel(cv, x, y, 488, 240, GOLD);
  // Indian flag.
  const fx = x + 18;
  const fy = y + 18;
  cv.rect(fx, fy, 210, 30, SAFFRON);
  cv.rect(fx, fy + 30, 210, 30, WHITE);
  cv.rect(fx, fy + 60, 210, 30, FLAGREEN);
  const ccx = fx + 105;
  const ccy = fy + 45;
  cv.ring(ccx, ccy, 13, 3, NAVY);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    cv.line(ccx, ccy, Math.round(ccx + Math.cos(a) * 12), Math.round(ccy + Math.sin(a) * 12), NAVY, 1);
  }
  cv.circle(ccx, ccy, 2, NAVY);
  // Big 77, right of the flag.
  drawText(cv, "77", x + 254, y + 24, 8, GOLD);
  drawText(cv, "YEARS", x + 256, y + 88, 2, GOLD);
  drawText(cv, "CONSTITUTION DAY", x + 18, y + 132, 3, WHITE);
  cv.rect(x + 18, y + 160, 90, 4, RED);
  drawText(cv, "INDIA MARKS 77 YEARS", x + 18, y + 178, 2, MUTED);
  drawText(cv, "ADOPTED 26 NOV 1949", x + 18, y + 204, 2, MUTED);
}

function drawUkPanel(cv: Canvas, x: number, y: number): void {
  panel(cv, x, y, 488, 240, RED);
  drawText(cv, "UNITED KINGDOM • ONS", x + 18, y + 18, 2, GOLD);
  drawText(cv, "77,000", x + 18, y + 44, 7, GOLD);
  // Falling bars + down arrow, top right.
  cv.rect(x + 376, y + 52, 18, 70, RED);
  cv.rect(x + 406, y + 77, 18, 45, RED);
  cv.rect(x + 436, y + 102, 18, 20, RED);
  cv.line(x + 368, y + 40, x + 448, y + 110, RED, 7);
  cv.polygon(
    [
      [x + 448, y + 110],
      [x + 424, y + 100],
      [x + 436, y + 126],
    ],
    RED,
  );
  drawText(cv, "UK NET MIGRATION", x + 18, y + 112, 3, WHITE);
  cv.rect(x + 18, y + 140, 90, 4, RED);
  drawText(cv, "LOWEST IN NEARLY 30 YEARS", x + 18, y + 158, 2, MUTED);
  drawText(cv, "YEAR TO JUNE 2026 • DOWN FROM 204,000", x + 18, y + 184, 2, MUTED);
}

function draw(): Canvas {
  const cv = new Canvas();
  cv.rect(0, 0, W, H, BG);

  // Masthead.
  drawTextCentered(cv, "26 NOVEMBER 2026", 512, 30, 7, GOLD);
  drawTextCentered(cv, "THE WORLD IN ONE DAY", 512, 92, 3, WHITE);
  cv.rect(48, 124, 928, 3, GOLD);

  // Headline band: the Thanksgiving bomb cyclone.
  panel(cv, 16, 136, 992, 240, GOLD);
  drawHeadlineArt(cv);
  drawText(cv, "UNITED STATES • THANKSGIVING", 392, 152, 2, GOLD);
  drawText(cv, "BOMB CYCLONE", 392, 182, 5, WHITE);
  drawText(cv, "SLAMS EAST COAST", 392, 222, 5, WHITE);
  cv.rect(392, 264, 120, 5, RED);
  drawText(cv, "SURGES TOP SANDY LEVELS • GUSTS TO 75 MPH", 392, 280, 2, MUTED);
  drawText(cv, "CAPE MAY 9.4 FT • WACHAPREAGUE 9.9 FT", 392, 304, 2, MUTED);
  drawText(cv, "MACY'S PARADE MOVED TO SAT 28 NOV, 8:30 ET", 392, 328, 2, WHITE);
  drawText(cv, "FIRST POSTPONEMENT IN 100 YEARS", 392, 352, 2, GOLD);

  // 2x2 grid.
  drawChessPanel(cv, 16, 392);
  drawEuropaPanel(cv, 520, 392);
  drawIndiaPanel(cv, 16, 648);
  drawUkPanel(cv, 520, 648);

  // Footer.
  cv.rect(48, 904, 928, 3, GOLD);
  drawTextCentered(cv, "Thursday 26 November 2026", 512, 924, 3, GOLD);
  cv.rect(48, 958, 928, 2, GOLD);

  return cv;
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";
mkdirSync(outDir, { recursive: true });
const png = encodePNG(W, H, draw().buf);
const outPath = join(outDir, "entry.png");
writeFileSync(outPath, png);
console.log(`wrote ${outPath} (${png.length} bytes)`);
