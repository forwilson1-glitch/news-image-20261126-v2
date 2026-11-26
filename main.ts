// news-image-20261126 — v3 final entry.
// Draws a 1024x1024 PNG summing up the world news of Thursday 26 November 2026.
// Node 22, standard library only, no network. Output is fully deterministic:
// fixed geometry, fixed colours, no timestamps, no randomness, so two runs
// produce byte-identical files.
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
type RGB = [number, number, number];
const BG: RGB = [10, 20, 36]; // deep navy page background
const PANEL: RGB = [18, 35, 61]; // panel fill
const SKY: RGB = [11, 27, 48]; // space cell sky
const GOLD: RGB = [242, 183, 5];
const CREAM: RGB = [245, 242, 233];
const MIST: RGB = [201, 212, 227]; // light grey body text
const RED: RGB = [214, 69, 69];
const GREEN: RGB = [47, 163, 107];
const BLUE: RGB = [62, 146, 204];
const SAFFRON: RGB = [255, 153, 51];
const INDIA_GREEN: RGB = [19, 136, 8];
const NAVY: RGB = [27, 58, 140];
const CLOUD: RGB = [84, 103, 138];
const CLOUD_LT: RGB = [107, 127, 166];
const RAIN: RGB = [127, 168, 208];
const BOLT: RGB = [255, 210, 63];
const CITY: RGB = [8, 17, 32];
const STONE: RGB = [107, 124, 147];
const ORANGE: RGB = [240, 120, 40];
const FLAME_Y: RGB = [255, 200, 60];

// ---------------------------------------------------------------- canvas
const img = new Uint8Array(W * H * 3);

function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  img[i] = c[0];
  img[i + 1] = c[1];
  img[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPx(xx, yy, c);
  }
}

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) setPx(x, y, c);
    }
  }
}

function fillEllipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  for (let y = cy - ry; y <= cy + ry; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPx(x, y, c);
    }
  }
}

function drawLine(x0: number, y0: number, x1: number, y1: number, w: number, c: RGB): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    const px = Math.round(x0 + dx * t);
    const py = Math.round(y0 + dy * t);
    fillRect(px - Math.floor(w / 2), py - Math.floor(w / 2), w, w, c);
  }
}

function fillPolygon(pts: Array<[number, number]>, c: RGB): void {
  let minY = pts[0][1];
  let maxY = pts[0][1];
  for (const p of pts) {
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        const t = (y - a[1]) / (b[1] - a[1]);
        xs.push(Math.round(a[0] + t * (b[0] - a[0])));
      }
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      for (let x = xs[i]; x <= xs[i + 1]; x++) setPx(x, y, c);
    }
  }
}

function drawBorder(x: number, y: number, w: number, h: number, t: number, c: RGB): void {
  fillRect(x, y, w, t, c);
  fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c);
  fillRect(x + w - t, y, t, h, c);
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph is 7 rows of 5 cells; "#" is ink, "." is blank.
const FONT: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#"],
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
  "0": [".###.", "#..##", "#.#.#", "##..#", "#...#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "...#.", "..#..", "..#..", "..#.."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".##..", ".##..", ".#..."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  "/": ["....#", "....#", "...#.", "...#.", "..#..", "..#..", ".#..."],
  "'": ["..#..", "..#..", "..#..", ".....", ".....", ".....", "....."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "(": ["...##", "..#..", ".#...", ".#...", ".#...", "..#..", "...##"],
  ")": ["##...", "..#..", "...#.", "...#.", "...#.", "..#..", "##..."],
  "\u2022": [".....", ".....", ".###.", ".###.", ".###.", ".....", "....."],
  a: [".....", ".....", ".###.", "....#", ".####", "#...#", ".###."],
  b: ["#....", "#....", "####.", "#...#", "#...#", "#...#", "####."],
  d: ["....#", "....#", ".####", "#...#", "#...#", "#...#", ".###."],
  e: [".....", ".....", ".###.", "#...#", "#####", "#....", ".###."],
  h: ["#....", "#....", "####.", "#...#", "#...#", "#...#", "#...#"],
  m: [".....", ".....", "##.#.", "#.#.#", "#.#.#", "#.#.#", "#.#.#"],
  o: [".....", ".....", ".###.", "#...#", "#...#", "#...#", ".###."],
  r: [".....", ".....", "#.##.", "##..#", "#....", "#....", "#...."],
  s: [".....", ".....", ".####", "#....", ".###.", "....#", "####."],
  u: [".....", ".....", "#...#", "#...#", "#...#", "#...#", ".###."],
  v: [".....", ".....", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  y: [".....", ".....", "#...#", "#...#", ".####", "....#", ".###."],
};

function textWidth(text: string, scale: number): number {
  return text.length * 6 * scale - scale;
}

function drawGlyph(ch: string, x: number, y: number, scale: number, c: RGB): void {
  const g = FONT[ch];
  if (!g) return;
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (g[r][col] === "#") {
        fillRect(x + col * scale, y + r * scale, scale, scale, c);
      }
    }
  }
}

function drawText(
  text: string,
  x: number,
  y: number,
  scale: number,
  c: RGB,
  align: "left" | "center" = "left",
): void {
  let startX = x;
  if (align === "center") startX = x - Math.floor(textWidth(text, scale) / 2);
  let cx = startX;
  for (const ch of text) {
    drawGlyph(ch, cx, y, scale, c);
    cx += 6 * scale;
  }
}

// ---------------------------------------------------------------- scene
function drawSkyline(x0: number, yBase: number, yTop: number): void {
  const buildings: Array<[number, number, number]> = [
    [28, 60, 100],
    [96, 50, 130],
    [154, 70, 90],
    [232, 55, 115],
    [295, 60, 85],
    [360, 50, 105],
  ];
  for (const [bx, bw, bh] of buildings) {
    fillRect(bx, yBase - bh, bw, bh, CITY);
    for (let wy = yBase - bh + 12; wy < yBase - 10; wy += 22) {
      for (let wx = bx + 8; wx < bx + bw - 8; wx += 18) {
        if ((wx + wy) % 36 === 0) fillRect(wx, wy, 6, 8, GOLD);
      }
    }
  }
  void yTop;
}

function drawHeadline(): void {
  const x = 16;
  const y = 140;
  const w = 992;
  const h = 268;
  fillRect(x, y, w, h, PANEL);
  drawBorder(x, y, w, h, 3, GOLD);

  // Storm illustration, left half.
  drawSkyline(x, 396, 150);
  fillEllipse(200, 195, 150, 52, CLOUD);
  fillEllipse(120, 178, 88, 38, CLOUD);
  fillEllipse(292, 172, 88, 38, CLOUD);
  fillEllipse(200, 182, 82, 28, CLOUD_LT);
  const rain: Array<[number, number, number, number]> = [
    [80, 244, 70, 282],
    [130, 244, 120, 282],
    [180, 248, 170, 286],
    [230, 248, 220, 286],
    [280, 244, 270, 282],
    [330, 240, 320, 278],
    [370, 240, 360, 278],
    [105, 268, 97, 300],
  ];
  for (const [rx0, ry0, rx1, ry1] of rain) drawLine(rx0, ry0, rx1, ry1, 3, RAIN);
  // Lightning bolt, thickened one notch so it reads clearly at small sizes.
  fillPolygon(
    [
      [108, 236],
      [142, 236],
      [120, 266],
      [146, 266],
      [100, 322],
      [114, 272],
      [94, 272],
    ],
    BOLT,
  );

  // Headline text, right half.
  drawText("UNITED STATES \u2022 THANKSGIVING", 440, 160, 3, GOLD, "left");
  drawText("STORM HITS", 440, 196, 7, CREAM, "left");
  drawText("THANKSGIVING", 440, 252, 7, CREAM, "left");
  fillRect(440, 308, 130, 6, RED);
  drawText("A BOMB CYCLONE SLAMS THE", 440, 330, 3, MIST, "left");
  drawText("EAST COAST ON THANKSGIVING DAY", 440, 356, 3, MIST, "left");
  // Gold rule under the headline panel: separates the banner from the 2x2 grid.
  fillRect(x, y + h + 4, w, 4, GOLD);
}

function drawCell(x0: number, y0: number, accent: RGB): void {
  const w = 488;
  const h = 264;
  fillRect(x0, y0, w, h, PANEL);
  drawBorder(x0, y0, w, h, 3, accent);
}

function drawConstitution(x0: number, y0: number): void {
  drawCell(x0, y0, GOLD);
  // Indian tricolour with the Ashoka Chakra.
  fillRect(x0 + 14, y0 + 14, 460, 30, SAFFRON);
  fillRect(x0 + 14, y0 + 44, 460, 30, CREAM);
  fillRect(x0 + 14, y0 + 74, 460, 30, INDIA_GREEN);
  const cx = x0 + 244;
  const cy = y0 + 59;
  fillCircle(cx, cy, 26, NAVY);
  fillCircle(cx, cy, 20, CREAM);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    drawLine(
      cx,
      cy,
      Math.round(cx + 19 * Math.cos(a)),
      Math.round(cy + 19 * Math.sin(a)),
      2,
      NAVY,
    );
  }
  fillCircle(cx, cy, 4, NAVY);
  drawText("CONSTITUTION DAY", x0 + 244, y0 + 136, 4, CREAM, "center");
  fillRect(x0 + 214, y0 + 170, 60, 5, GOLD);
  drawText("INDIA MARKS 77 YEARS", x0 + 244, y0 + 184, 3, MIST, "center");
  drawText("CONSTITUTION ADOPTED 1949", x0 + 244, y0 + 210, 3, MIST, "center");
}

function drawChess(x0: number, y0: number): void {
  drawCell(x0, y0, GREEN);
  // Checkerboard, 8x8 squares of 13 px.
  const bx = x0 + 16;
  const by = y0 + 14;
  const s = 13;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const col = (r + c) % 2 === 0 ? CREAM : [27, 42, 68] as RGB;
      fillRect(bx + c * s, by + r * s, s, s, col);
    }
  }
  // Two pieces: a white king and a black knight, as simple discs.
  fillCircle(bx + 1 * s + 6, by + 1 * s + 6, 8, CREAM);
  fillCircle(bx + 1 * s + 6, by + 1 * s + 6, 4, PANEL);
  fillCircle(bx + 6 * s + 6, by + 6 * s + 6, 8, [8, 17, 32]);
  fillCircle(bx + 6 * s + 6, by + 6 * s + 6, 4, CREAM);
  drawText("1-1", x0 + 160, y0 + 30, 9, CREAM, "left");
  drawText("GAME 3", x0 + 340, y0 + 52, 4, GOLD, "left");
  drawText("GENEVA", x0 + 340, y0 + 88, 3, MIST, "left");
  drawText("CHESS TITLE TIED", x0 + 244, y0 + 136, 4, CREAM, "center");
  fillRect(x0 + 214, y0 + 170, 60, 5, GREEN);
  drawText("GUKESH V SINDAROV", x0 + 244, y0 + 184, 3, MIST, "center");
  drawText("GAME 3 IN GENEVA", x0 + 244, y0 + 210, 3, MIST, "center");
}

function drawMumbai(x0: number, y0: number): void {
  drawCell(x0, y0, RED);
  // Big 18, Gateway of India arch, and a remembrance candle.
  drawText("18", x0 + 24, y0 + 34, 9, GOLD, "left");
  fillRect(x0 + 168, y0 + 40, 8, 78, STONE);
  fillRect(x0 + 314, y0 + 40, 8, 78, STONE);
  fillCircle(x0 + 245, y0 + 62, 20, STONE);
  fillCircle(x0 + 172, y0 + 64, 8, STONE);
  fillCircle(x0 + 318, y0 + 64, 8, STONE);
  fillRect(x0 + 180, y0 + 70, 130, 48, STONE);
  fillRect(x0 + 225, y0 + 88, 40, 30, PANEL);
  fillCircle(x0 + 245, y0 + 88, 20, PANEL);
  fillRect(x0 + 160, y0 + 118, 170, 6, STONE);
  // Candle.
  fillRect(x0 + 400, y0 + 72, 24, 46, CREAM);
  fillEllipse(x0 + 412, y0 + 58, 8, 14, ORANGE);
  fillEllipse(x0 + 412, y0 + 60, 4, 8, FLAME_Y);
  drawText("MUMBAI REMEMBERS", x0 + 244, y0 + 136, 4, CREAM, "center");
  fillRect(x0 + 214, y0 + 170, 60, 5, RED);
  drawText("18 YEARS SINCE THE 26/11", x0 + 244, y0 + 184, 3, MIST, "center");
  drawText("ATTACKS ON MUMBAI.", x0 + 244, y0 + 210, 3, MIST, "center");
}

function drawSpace(x0: number, y0: number): void {
  drawCell(x0, y0, BLUE);
  fillRect(x0 + 14, y0 + 14, 460, 104, SKY);
  const stars: Array<[number, number, RGB]> = [
    [30, 26, CREAM],
    [60, 96, GOLD],
    [130, 22, CREAM],
    [150, 90, CREAM],
    [180, 30, GOLD],
    [330, 24, CREAM],
    [360, 96, CREAM],
    [420, 28, GOLD],
    [445, 80, CREAM],
    [250, 20, CREAM],
  ];
  for (const [sx, sy, sc] of stars) fillRect(x0 + sx, y0 + sy, 3, 3, sc);
  // Rocket, upright on the left.
  fillPolygon(
    [
      [x0 + 56, y0 + 34],
      [x0 + 90, y0 + 34],
      [x0 + 73, y0 + 12],
    ],
    RED,
  );
  fillRect(x0 + 56, y0 + 34, 34, 62, CREAM);
  fillCircle(x0 + 73, y0 + 56, 9, BLUE);
  fillCircle(x0 + 73, y0 + 56, 5, [160, 210, 240]);
  fillPolygon(
    [
      [x0 + 56, y0 + 80],
      [x0 + 40, y0 + 104],
      [x0 + 56, y0 + 96],
    ],
    RED,
  );
  fillPolygon(
    [
      [x0 + 90, y0 + 80],
      [x0 + 106, y0 + 104],
      [x0 + 90, y0 + 96],
    ],
    RED,
  );
  fillPolygon(
    [
      [x0 + 62, y0 + 96],
      [x0 + 84, y0 + 96],
      [x0 + 73, y0 + 118],
    ],
    ORANGE,
  );
  fillPolygon(
    [
      [x0 + 67, y0 + 96],
      [x0 + 79, y0 + 96],
      [x0 + 73, y0 + 110],
    ],
    FLAME_Y,
  );
  // Tiangong station, right.
  fillRect(x0 + 150, y0 + 48, 66, 30, BLUE);
  drawLine(x0 + 172, y0 + 48, x0 + 172, y0 + 78, 2, CREAM);
  drawLine(x0 + 194, y0 + 48, x0 + 194, y0 + 78, 2, CREAM);
  fillRect(x0 + 220, y0 + 58, 130, 10, [154, 167, 184]);
  fillRect(x0 + 272, y0 + 46, 26, 34, [200, 210, 220]);
  fillRect(x0 + 354, y0 + 48, 66, 30, BLUE);
  drawLine(x0 + 376, y0 + 48, x0 + 376, y0 + 78, 2, CREAM);
  drawLine(x0 + 398, y0 + 48, x0 + 398, y0 + 78, 2, CREAM);
  drawLine(x0 + 285, y0 + 46, x0 + 285, y0 + 34, 2, CREAM);
  fillCircle(x0 + 285, y0 + 32, 3, GOLD);
  // Earth rising at the bottom-right of the sky panel.
  fillCircle(x0 + 436, y0 + 112, 30, BLUE);
  fillEllipse(x0 + 430, y0 + 108, 16, 9, GREEN);
  fillEllipse(x0 + 444, y0 + 118, 10, 6, GREEN);
  drawText("ZEESHAN ALI", x0 + 244, y0 + 136, 4, CREAM, "center");
  fillRect(x0 + 214, y0 + 170, 60, 5, BLUE);
  drawText("PAKISTAN'S ASTRONAUT JOINS", x0 + 244, y0 + 184, 3, MIST, "center");
  drawText("TIANGONG ON SHENZHOU-24", x0 + 244, y0 + 210, 3, MIST, "center");
}

function drawScene(): void {
  fillRect(0, 0, W, H, BG);
  // Masthead.
  drawText("26 NOVEMBER 2026", 512, 26, 8, GOLD, "center");
  drawText("THE WORLD IN ONE DAY", 512, 96, 3, CREAM, "center");
  fillRect(64, 126, 896, 3, GOLD);
  // Headline + 2x2 grid.
  drawHeadline();
  drawConstitution(16, 424);
  drawChess(520, 424);
  drawMumbai(16, 704);
  drawSpace(520, 704);
  // Footer.
  fillRect(64, 974, 896, 2, GOLD);
  drawText("Thursday 26 November 2026", 512, 986, 3, GOLD, "center");
}

// ---------------------------------------------------------------- PNG encode
const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table.push(c >>> 0);
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  const crc = crc32(Buffer.concat([Buffer.from(type, "ascii"), data]));
  out.writeUInt32BE(crc, 8 + data.length);
  return out;
}

function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    Buffer.from(img.buffer, y * W * 3, W * 3).copy(raw, y * (1 + W * 3) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- main
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? ".";
drawScene();
const png = encodePNG();
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "entry.png"), png);
