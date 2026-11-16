/* «Мой подход» — блокнот на кольцах вместо квадрата со сценой.
   Перелистывание — библиотека LeafThrough (dmtrbrl, MIT): настоящая бумага на three.js, которая гнётся,
   ловит свет и отбрасывает тень; по краям видна толща страниц, как на присланном видео.
   Каждый разворот — одна сцена: слева — что не так (то, что было на большом квадрате), справа — «Как решаю я»,
   анимация и решение (то, что было на обороте). Всё написано от руки — шрифт StudioScript.
   Анимации нарисованы прямо на бумаге и живут, пока их разворот открыт: «Цель» из частиц, статуэтка
   в стеклянной ёмкости, кубик Рубика из фирменных цветов, часы.
   Сцену выбирает main.js (прокрутка, стрелки, клик по странице) через window.approachBook. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { LeafThrough } from './vendor/leafthrough/index.js?v=1';

const section = document.querySelector('.approach');
const host = section && section.querySelector('[data-book]');
if (host) init();

function init() {
  const stacked = window.matchMedia('(max-width: 1000px), (max-aspect-ratio: 7/5)').matches;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rings = section.querySelector('.apx__rings');
  const scenes = Array.prototype.map.call(section.querySelectorAll('.apx__scene'), (li) => ({
    phrase: li.querySelector('.apx__phrase').textContent.trim(),
    note: li.querySelector('.apx__note').textContent.trim(),
    label: li.querySelector('.apx__solution-label').textContent.trim(),
    solution: li.querySelector('.apx__solution').textContent.trim(),
    anim: li.dataset.anim,
  }));
  if (!scenes.length) return;

  /* страница: высота ÷ ширина; на телефоне — по одной странице */
  const ASPECT = 1.36;
  const PW = stacked ? 760 : 1024, PH = Math.round(PW * ASPECT);
  const LEAD = 12, TAIL = 18;                                   // чистые листы до и после — толща блокнота по краям
  const leftOf = (i) => 1 + LEAD + 2 * i, rightOf = (i) => 2 + LEAD + 2 * i;
  const pageOfStep = (s) => (stacked ? 1 + LEAD + s : leftOf(s));
  const PAGES = 1 + LEAD + 2 * scenes.length + TAIL;

  /* цвета: бумага — тёплая молочная, заголовки — медь, текст — глубокая бирюза */
  const PAPER = '#FBF7F0', INK = '#1A2C30', ACCENT = '#A9502C', SOFT = '#6A5F51';
  const FONT = '"Studio Script", "Great Vibes", cursive';
  const HOLE_Y = [0.2, 0.8], HOLE_X = 0.085;                 // отверстия под кольца: доля высоты и отступ от корешка

  /* ---------- бумага и текст ---------- */
  const paper = (ctx, spine) => {
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, PW, PH);
    /* чуть темнее у корешка — лист слегка уходит в переплёт */
    const g = ctx.createLinearGradient(spine === 'right' ? PW : 0, 0, spine === 'right' ? PW - PW * 0.12 : PW * 0.12, 0);
    g.addColorStop(0, 'rgba(106, 95, 81, .10)'); g.addColorStop(1, 'rgba(106, 95, 81, 0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, PW, PH);
    /* отверстия под кольца */
    const hx = spine === 'right' ? PW * (1 - HOLE_X) : PW * HOLE_X, r = PW * 0.016;
    HOLE_Y.forEach((f) => {
      const hy = PH * f;
      ctx.fillStyle = 'rgba(26, 20, 14, .55)'; ctx.beginPath(); ctx.arc(hx, hy, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, .7)'; ctx.lineWidth = PW * 0.003; ctx.beginPath(); ctx.arc(hx, hy + r * 0.12, r * 1.05, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    });
  };
  /* перенос по словам; неразрывный пробел держит слова вместе (предлоги не висят) */
  const wrap = (ctx, text, maxW) => {
    const words = text.split(' '), lines = [];
    let line = '';
    words.forEach((w) => {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t.replace(/ /g, ' ')).width > maxW && line) { lines.push(line); line = w; } else line = t;
    });
    if (line) lines.push(line);
    return lines.map((l) => l.replace(/ /g, ' '));
  };
  const text = (ctx, str, { x, y, maxW, size, color, lh = 1.12, align = 'left' }) => {
    ctx.font = `400 ${size}px ${FONT}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    const lines = wrap(ctx, str, maxW);
    lines.forEach((l, k) => ctx.fillText(l, x, y + k * size * lh));
    return y + (lines.length - 1) * size * lh;                 // базовая линия последней строки
  };
  const M = PW * 0.14;                                         // поля страницы
  /* акценты фирменными цветами — как в живом блокноте: цветной скотч, подчёркивание от руки, маркер,
     линия поля, стрелка-пометка. У каждого разворота свой цвет скотча */
  const TAPE = ['#2F4B52', '#A9502C', '#6F7B74', '#C9A27A'];
  const MARK = ['#C9A27A', '#C8BDAB', '#C9A27A', '#6F7B74'];
  const seeded = (n) => { let x = Math.sin(n * 91.7) * 43758.5453; return x - Math.floor(x); };
  const tape = (ctx, x, y, w, h, angle, color, seed) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    const teeth = 7, tw = h / teeth;
    ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(w / 2, -h / 2);
    for (let k = 0; k < teeth; k++) ctx.lineTo(w / 2 + (k % 2 ? 0 : tw * 0.45), -h / 2 + tw * (k + 1));
    ctx.lineTo(-w / 2, h / 2);
    for (let k = teeth - 1; k >= 0; k--) ctx.lineTo(-w / 2 - (k % 2 ? 0 : tw * 0.45), -h / 2 + tw * k);
    ctx.closePath();
    ctx.globalAlpha = 0.82; ctx.fillStyle = color; ctx.fill();
    ctx.clip();                                                  // лёгкие полосы и блик — фактура бумажного скотча
    ctx.globalAlpha = 0.12; ctx.fillStyle = '#FFFFFF';
    for (let k = -w; k < w; k += h * 0.5) ctx.fillRect(k, -h / 2, h * 0.16, h);
    ctx.globalAlpha = 0.18; ctx.fillRect(-w / 2, -h / 2, w, h * 0.22);
    ctx.restore();
  };
  const underline = (ctx, x, y, w, color, seed) => {
    ctx.save(); ctx.strokeStyle = color; ctx.lineCap = 'round';
    ctx.globalAlpha = 0.85; ctx.lineWidth = PW * 0.007;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + w * 0.3, y - PW * 0.012, x + w * 0.65, y + PW * 0.014, x + w, y - PW * 0.006);
    ctx.stroke();
    ctx.globalAlpha = 0.5; ctx.lineWidth = PW * 0.0035;            // второй штрих — как рукой провели дважды
    ctx.beginPath(); ctx.moveTo(x + w * 0.08, y + PW * 0.016);
    ctx.bezierCurveTo(x + w * 0.4, y + PW * 0.004, x + w * 0.7, y + PW * 0.026, x + w * 0.94, y + PW * 0.012);
    ctx.stroke(); ctx.restore();
  };
  const marker = (ctx, x, y, w, h, color) => {
    ctx.save(); ctx.globalAlpha = 0.42; ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(x - h * 0.2, y + h * 0.1); ctx.lineTo(x + w, y - h * 0.08); ctx.lineTo(x + w + h * 0.15, y + h * 0.85); ctx.lineTo(x - h * 0.1, y + h);
    ctx.closePath(); ctx.fill(); ctx.restore();
  };
  const marginLine = (ctx, x) => {
    ctx.save(); ctx.strokeStyle = '#A9502C'; ctx.globalAlpha = 0.28; ctx.lineWidth = PW * 0.0025;
    ctx.beginPath(); ctx.moveTo(x, PH * 0.06); ctx.lineTo(x, PH * 0.94); ctx.stroke(); ctx.restore();
  };
  const arrow = (ctx, x0, y0, x1, y1, color) => {
    ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha = 0.7; ctx.lineWidth = PW * 0.004; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + (x1 - x0) * 0.9, y0, x1, y1); ctx.stroke();
    const a = Math.atan2(y1 - y0, (x1 - x0) * 0.1), L = PW * 0.03;
    ctx.beginPath(); ctx.moveTo(x1 - Math.cos(a - 0.5) * L, y1 - Math.sin(a - 0.5) * L); ctx.lineTo(x1, y1); ctx.lineTo(x1 - Math.cos(a + 0.5) * L, y1 - Math.sin(a + 0.5) * L); ctx.stroke();
    ctx.restore();
  };
  const leftPage = (ctx, s, i) => {
    paper(ctx, 'right');
    marginLine(ctx, M * 0.62);
    tape(ctx, PW * 0.3, PH * 0.045, PW * 0.3, PW * 0.085, -0.09, TAPE[i % 4], i);
    const maxW = PW - M * 2 - PW * 0.04, size = PW * 0.115;
    let y = PH * 0.3;
    y = text(ctx, s.phrase, { x: M, y, maxW, size, color: ACCENT, lh: 1.08 });
    ctx.font = `400 ${size}px ${FONT}`;
    const lines = wrap(ctx, s.phrase, maxW), lw = Math.min(maxW, ctx.measureText(lines[lines.length - 1]).width);
    underline(ctx, M, y + size * 0.3, lw * 0.92, TAPE[i % 4], i);
    text(ctx, s.note, { x: M, y: y + PW * 0.18, maxW, size: PW * 0.072, color: INK, lh: 1.25 });
  };
  /* правая страница: подпись вверху, место под анимацию, решение внизу */
  const AREA = { x: PW * 0.16, y: PH * 0.2, w: PW * 0.74, h: PH * 0.47 };
  const rightStatic = (ctx, s, i) => {
    paper(ctx, 'left');
    tape(ctx, PW * 0.78, PH * 0.04, PW * 0.26, PW * 0.08, 0.12, TAPE[(i + 2) % 4], i + 7);
    const size = PW * 0.08;
    ctx.font = `400 ${size}px ${FONT}`;
    const lw = ctx.measureText(s.label).width;
    marker(ctx, PW * 0.15, PH * 0.14 - size * 0.62, lw + PW * 0.03, size * 0.72, MARK[i % 4]);
    text(ctx, s.label, { x: PW * 0.16, y: PH * 0.14, maxW: PW * 0.74, size, color: ACCENT });
    /* стрелка-пометка от рисунка к решению */
    arrow(ctx, PW * 0.1, PH * 0.66, PW * 0.135, PH * 0.735, '#6F7B74');
    text(ctx, s.solution, { x: PW * 0.16, y: PH * 0.76, maxW: PW * 0.72, size: PW * 0.07, color: INK, lh: 1.25 });
  };

  /* ---------- анимации на правой странице ---------- */
  const rand = (a, b) => a + Math.random() * (b - a);

  /* «Цель» из частиц — как крупное «МОЙ ПОДХОД»: частицы слетаются в буквы, оставляя тающие следы, и кружат */
  const goal = () => {
    const W = Math.round(AREA.w), H = Math.round(AREA.h);
    const layer = document.createElement('canvas'); layer.width = W; layer.height = H;
    const c = layer.getContext('2d');
    let parts = [];
    const build = () => {
      const off = document.createElement('canvas'); off.width = W; off.height = H;
      const o = off.getContext('2d');
      let size = W * 0.42;
      o.font = `400 ${size}px ${FONT}`;
      const k = Math.min(1, W * 0.86 / o.measureText('Цель').width); size *= k;
      o.font = `400 ${size}px ${FONT}`; o.fillStyle = '#000'; o.textAlign = 'center'; o.textBaseline = 'middle';
      o.fillText('Цель', W / 2, H * 0.52);
      const step = Math.max(2, Math.round(size / 70));
      const d = o.getImageData(0, 0, W, H).data, pts = [];
      for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (d[(y * W + x) * 4 + 3] > 140) pts.push([x, y]);
      for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
      const s = W / 700;
      parts = pts.slice(0, stacked ? 1100 : 1500).map((t) => ({ x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, tx: t[0], ty: t[1], a: rand(0, 6.283), r: rand(1, 4) * s,
        sp: rand(0.02, 0.06) * (Math.random() < 0.5 ? -1 : 1), maxSpeed: rand(3, 9) * s, maxForce: rand(0.3, 0.8) * s, size: rand(1.4, 3) * s }));
    };
    const scatter = () => {
      parts.forEach((p) => { p.x = p.px = rand(0, W); p.y = p.py = rand(0, H); p.vx = rand(-6, 6); p.vy = rand(-6, 6); });
      c.clearRect(0, 0, W, H);
    };
    const step = () => {
      c.globalCompositeOperation = 'destination-out'; c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'source-over';
      c.strokeStyle = SOFT; c.fillStyle = SOFT; c.lineCap = 'round'; c.lineWidth = 1.4 * W / 700; c.globalAlpha = 0.55;
      c.beginPath();
      for (const p of parts) {
        p.a += p.sp * 2;
        const gx = p.tx + Math.cos(p.a) * p.r, gy = p.ty + Math.sin(p.a) * p.r;
        const dx = gx - p.x, dy = gy - p.y, d = Math.hypot(dx, dy) || 1;
        const want = d < 40 ? p.maxSpeed * d / 40 : p.maxSpeed;
        let sx = dx / d * want - p.vx, sy = dy / d * want - p.vy;
        const sm = Math.hypot(sx, sy); if (sm > p.maxForce) { sx = sx / sm * p.maxForce; sy = sy / sm * p.maxForce; }
        p.vx += sx; p.vy += sy;
        const v = Math.hypot(p.vx, p.vy); if (v > p.maxSpeed) { p.vx = p.vx / v * p.maxSpeed; p.vy = p.vy / v * p.maxSpeed; }
        if (d < 40) { p.vx *= 0.9; p.vy *= 0.9; }
        p.x += p.vx * 2; p.y += p.vy * 2;
        c.moveTo(p.px, p.py); c.lineTo(p.x, p.y); p.px = p.x; p.py = p.y;
      }
      c.stroke();
      c.globalAlpha = 0.9;
      for (const p of parts) c.fillRect(p.x - p.size * 0.6, p.y - p.size * 0.6, p.size * 1.2, p.size * 1.2);
      c.globalAlpha = 1;
    };
    build(); scatter();
    /* до первого показа — уже собранное слово (на перелистывании видна готовая страница) */
    for (let i = 0; i < 160; i++) step();
    return {
      enter() { scatter(); },
      tick() { step(); },
      draw(ctx) { ctx.drawImage(layer, AREA.x, AREA.y); },
    };
  };

  /* статуэтка в стеклянной ёмкости: ёмкость медленно покачивается — видна глубина, блик скользит по стеклу */
  const portal = () => {
    const img = new Image(); img.decoding = 'async'; img.src = 'img/approach/award.webp';
    let dark = null;
    img.onload = () => {                                          // слои глубины — та же фигура, темнее
      dark = document.createElement('canvas'); dark.width = img.naturalWidth; dark.height = img.naturalHeight;
      const d = dark.getContext('2d'); d.drawImage(img, 0, 0);
      d.globalCompositeOperation = 'source-atop'; d.fillStyle = 'rgba(70, 48, 18, .55)'; d.fillRect(0, 0, dark.width, dark.height);
    };
    let t = 0;
    const cx = AREA.x + AREA.w / 2, cy = AREA.y + AREA.h * 0.5;
    const bw = AREA.h * 0.27, bh = AREA.h * 0.46, bd = AREA.h * 0.27;   // полуразмеры ёмкости
    const F = AREA.h * 3.2;                                       // перспектива
    const project = (x, y, z, ry, rx) => {
      const cY = Math.cos(ry), sY = Math.sin(ry);
      let X = x * cY + z * sY, Z = -x * sY + z * cY;
      const cX = Math.cos(rx), sX = Math.sin(rx);
      const Y = y * cX - Z * sX; Z = y * sX + Z * cX;
      const k = F / (F + Z);
      return [cx + X * k, cy + Y * k, Z];
    };
    return {
      enter() { t = 0; },
      tick(dt) { t += dt; },
      draw(ctx) {
        const ry = (Math.sin(t * 0.55) * 17) * Math.PI / 180, rx = (Math.sin(t * 0.37 + 1.2) * 6) * Math.PI / 180;
        /* мягкая тень под ёмкостью */
        const sh = ctx.createRadialGradient(cx, cy + bh * 1.02, 0, cx, cy + bh * 1.02, bw * 1.5);
        sh.addColorStop(0, 'rgba(26, 44, 48, .22)'); sh.addColorStop(1, 'rgba(26, 44, 48, 0)');
        ctx.fillStyle = sh; ctx.fillRect(cx - bw * 1.6, cy + bh * 0.8, bw * 3.2, bh * 0.5);
        const V = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]
          .map(([x, y, z]) => project(x * bw, y * bh, z * bd, ry, rx));
        const faces = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 4, 7, 3], [1, 5, 6, 2], [0, 1, 5, 4], [3, 2, 6, 7]];
        const depth = (f) => f.reduce((s, i) => s + V[i][2], 0) / 4;
        const poly = (f) => { ctx.beginPath(); f.forEach((i, k) => (k ? ctx.lineTo(V[i][0], V[i][1]) : ctx.moveTo(V[i][0], V[i][1]))); ctx.closePath(); };
        const sorted = faces.slice().sort((a, b) => depth(b) - depth(a));
        /* задние стенки */
        sorted.slice(0, 3).forEach((f) => { poly(f); ctx.fillStyle = 'rgba(47, 75, 82, .07)'; ctx.fill(); ctx.strokeStyle = 'rgba(26, 44, 48, .22)'; ctx.lineWidth = 2; ctx.stroke(); });
        /* свечение и статуэтка: стопка слоёв — у фигуры видна толщина */
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, bh * 0.9);
        glow.addColorStop(0, 'rgba(201, 162, 122, .35)'); glow.addColorStop(1, 'rgba(201, 162, 122, 0)');
        ctx.fillStyle = glow; ctx.fillRect(cx - bh, cy - bh, bh * 2, bh * 2);
        if (img.complete && img.naturalWidth) {
          const ih = bh * 1.72, iw = ih * img.naturalWidth / img.naturalHeight;
          const sx = Math.max(0.35, Math.cos(ry));
          for (let i = 12; i >= 0; i--) {
            const z = -i * AREA.h * 0.0016;
            const p = project(0, 0, z * 10, ry, rx);
            const src = i && dark ? dark : img;
            ctx.save(); ctx.translate(p[0], p[1] + bh * 0.06); ctx.scale(sx, 1);
            ctx.drawImage(src, -iw / 2, -ih / 2, iw, ih); ctx.restore();
          }
        }
        /* передние стенки и блик */
        sorted.slice(3).forEach((f) => { poly(f); ctx.fillStyle = 'rgba(255, 255, 255, .10)'; ctx.fill(); ctx.strokeStyle = 'rgba(26, 44, 48, .35)'; ctx.lineWidth = 2.4; ctx.stroke(); });
        const front = faces[1], fv = front.map((i) => V[i]);
        const sheen = 0.5 - ry * 2.2;
        const sg = ctx.createLinearGradient(fv[0][0], fv[0][1], fv[2][0], fv[2][1]);
        sg.addColorStop(Math.max(0, Math.min(1, sheen - 0.12)), 'rgba(255,255,255,0)');
        sg.addColorStop(Math.max(0, Math.min(1, sheen)), 'rgba(255,255,255,.45)');
        sg.addColorStop(Math.max(0, Math.min(1, sheen + 0.12)), 'rgba(255,255,255,0)');
        poly(front); ctx.fillStyle = sg; ctx.fill();
      },
    };
  };

  /* кубик Рубика из фирменных цветов: сам поворачивает слои с упругим доводом и медленно вращается */
  const rubik = () => {
    const S = Math.round(Math.min(AREA.w, AREA.h));
    let renderer = null;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch (e) { return { enter() {}, tick() {}, draw() {} }; }
    renderer.setPixelRatio(1); renderer.setSize(S, S, false); renderer.outputColorSpace = THREE.SRGBColorSpace;
    const COLORS = ['#A9502C', '#C9A27A', '#E8DCC8', '#2F4B52', '#6F7B74', '#6A5F51'].map((x) => new THREE.Color(x));
    const BLANK = new THREE.Color('#070F10');
    const FACE = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    const GRID = 3, side = (2 / GRID) * 0.99;
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    const group = new THREE.Group(), pivot = new THREE.Group();
    const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(0.4, 0.7, 1); camera.add(key);
    scene.add(new THREE.AmbientLight(0xffffff, 1.15), camera, group); group.add(pivot);
    camera.position.set(0, 0, 9.5); camera.lookAt(0, 0, 0);
    const centre = (i) => -1 + (2 * i + 1) / GRID;
    const index = (c) => Math.max(0, Math.min(GRID - 1, Math.round((c * GRID + GRID - 1) / 2)));
    const snap = (c) => centre(index(c));
    const material = new THREE.MeshLambertMaterial({ vertexColors: true });
    const cubies = [];
    for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) for (let k = 0; k < GRID; k++) {
      if (!(i === 0 || i === GRID - 1 || j === 0 || j === GRID - 1 || k === 0 || k === GRID - 1)) continue;
      const geo = new RoundedBoxGeometry(side, side, side, 3, side * 0.0735);
      const outer = [i === GRID - 1, i === 0, j === GRID - 1, j === 0, k === GRID - 1, k === 0];
      const n = geo.getAttribute('normal'), col = new THREE.BufferAttribute(new Float32Array(n.count * 3), 3);
      for (let v = 0; v < n.count; v++) {
        let face = 0, best = -Infinity;
        for (let f = 0; f < 6; f++) { const d = n.getX(v) * FACE[f][0] + n.getY(v) * FACE[f][1] + n.getZ(v) * FACE[f][2]; if (d > best) { best = d; face = f; } }
        const c = outer[face] ? COLORS[face] : BLANK; col.setXYZ(v, c.r, c.g, c.b);
      }
      geo.setAttribute('color', col);
      const mesh = new THREE.Mesh(geo, material); mesh.position.set(centre(i), centre(j), centre(k));
      group.add(mesh); cubies.push(mesh);
    }
    const AX = ['x', 'y', 'z'];
    let turn = null, last = null, ax = 0.5, ay = 0.6;
    const pick = () => {
      let m, tries = 0;
      do { m = { axis: Math.floor(Math.random() * 3), layer: Math.floor(Math.random() * GRID), dir: Math.random() < 0.5 ? 1 : -1 }; tries++; }
      while (tries < 8 && last && m.axis === last.axis && m.layer === last.layer && m.dir === -last.dir);
      const a = AX[m.axis]; pivot.rotation.set(0, 0, 0);
      cubies.forEach((c) => { if (index(c.position[a]) === m.layer) pivot.attach(c); });
      turn = { ...m, a, target: m.dir * Math.PI / 2, x: 0, v: 0 }; last = m;
    };
    const commit = () => {
      pivot.rotation.set(0, 0, 0); pivot.rotation[turn.a] = turn.target; pivot.updateMatrixWorld(true);
      for (let i = pivot.children.length - 1; i >= 0; i--) { const c = pivot.children[i]; group.attach(c); c.position.set(snap(c.position.x), snap(c.position.y), snap(c.position.z)); }
      pivot.rotation.set(0, 0, 0); turn = null;
    };
    const render = () => { group.rotation.set(ax, ay, 0); renderer.render(scene, camera); };
    render();
    return {
      enter() {},
      tick(dt) {
        ay += 11 * 0.06 * dt;
        if (!turn) pick();
        const sub = 4, h = dt / sub;
        for (let i = 0; i < sub; i++) { const f = -200 * (turn.x - 1) - 20 * turn.v; turn.v += f * h; turn.x += turn.v * h; }
        pivot.rotation[turn.a] = turn.target * turn.x;
        if (Math.abs(turn.x - 1) < 0.002 && Math.abs(turn.v) < 0.02) commit();
        render();
      },
      draw(ctx) {
        const x = AREA.x + (AREA.w - S) / 2, y = AREA.y + (AREA.h - S) / 2;
        const sh = ctx.createRadialGradient(x + S / 2, y + S * 0.9, 0, x + S / 2, y + S * 0.9, S * 0.4);
        sh.addColorStop(0, 'rgba(26, 44, 48, .18)'); sh.addColorStop(1, 'rgba(26, 44, 48, 0)');
        ctx.fillStyle = sh; ctx.fillRect(x, y + S * 0.75, S, S * 0.3);
        ctx.drawImage(renderer.domElement, x, y, S, S);
      },
    };
  };

  /* часы в фирменных цветах, без марки: текущее время посетителя, секундная стрелка идёт плавно */
  const clock = () => {
    const R = Math.min(AREA.w, AREA.h) * 0.46, cx = AREA.x + AREA.w / 2, cy = AREA.y + AREA.h / 2;
    const hand = (ctx, deg, len, back, w, fill, shadow) => {
      ctx.save(); ctx.rotate(deg * Math.PI / 180);
      if (shadow) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.roundRect(-w / 2 + 1.2, -len + 1.6, w, len + back, w / 2); ctx.fill(); }
      ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(-w / 2, -len, w, len + back, w / 2); ctx.fill();
      ctx.restore();
    };
    return {
      enter() {},
      tick() {},
      draw(ctx) {
        const k = R / 96;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
        /* тень на бумаге */
        const sh = ctx.createRadialGradient(4, 8, 80, 4, 8, 108); sh.addColorStop(0, 'rgba(26,44,48,.28)'); sh.addColorStop(1, 'rgba(26,44,48,0)');
        ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(4, 8, 108, 0, Math.PI * 2); ctx.fill();
        const face = ctx.createRadialGradient(-10, -18, 0, 0, 0, 120);
        face.addColorStop(0, '#21363B'); face.addColorStop(0.65, '#16262A'); face.addColorStop(1, '#0B1517');
        ctx.fillStyle = face; ctx.beginPath(); ctx.arc(0, 0, 96, 0, Math.PI * 2); ctx.fill();
        const gold = ctx.createLinearGradient(-96, -96, 96, 96);
        gold.addColorStop(0, '#E8D3AE'); gold.addColorStop(0.5, '#C9A27A'); gold.addColorStop(1, '#9C7550');
        ctx.strokeStyle = 'rgba(232,220,200,.42)'; ctx.lineWidth = 0.35; ctx.lineCap = 'round'; ctx.beginPath();
        for (let i = 0; i < 180; i++) {
          const h = Math.round(i / 15); if (i % 15 === 0 || Math.abs(i - h * 15) <= 1) continue;   // под метками штрихов нет
          const a = i / 180 * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
          ctx.moveTo(s * 62, -c * 62); ctx.lineTo(s * 88, -c * 88);
        }
        ctx.stroke();
        for (let h = 0; h < 12; h++) {
          if (h % 3 === 0) continue;
          ctx.save(); ctx.rotate(h * 30 * Math.PI / 180); ctx.fillStyle = gold; ctx.beginPath(); ctx.roundRect(-1.6, -86, 3.2, 23, 0.6); ctx.fill(); ctx.restore();
        }
        ctx.font = '300 24px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.strokeStyle = gold; ctx.lineWidth = 1.1;
        [['12', 0, -74], ['3', 74, 0], ['6', 0, 74], ['9', -74, 0]].forEach((n) => ctx.strokeText(n[0], n[1], n[2] + 8.6));
        const d = new Date();
        const s = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s / 60, hr = (d.getHours() % 12) + m / 60;
        hand(ctx, hr * 30, 46, 9, 4.2, gold, true);
        hand(ctx, m * 6, 72, 11, 3, gold, true);
        ctx.save(); ctx.rotate(s * 6 * Math.PI / 180);
        ctx.fillStyle = '#A9502C'; ctx.beginPath(); ctx.roundRect(-0.6, -79.6, 1.2, 100, 0.6); ctx.fill();
        ctx.beginPath(); ctx.arc(0, 16, 4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(0, 0, 3.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#A9502C'; ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      },
    };
  };
  const MAKERS = { goal, portal, rubik, clock };

  /* ---------- страницы ---------- */
  const mk = () => {
    const canvas = document.createElement('canvas'); canvas.width = PW; canvas.height = PH;
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    return { canvas, ctx: canvas.getContext('2d'), tex };
  };
  let blank = null, pages = null, live = null, book = null;

  const build = () => {
    blank = mk(); paper(blank.ctx, 'left');
    const blankL = mk(); paper(blankL.ctx, 'right');
    live = scenes.map((s, i) => {
      const L = mk(); leftPage(L.ctx, s, i);
      const R = mk(); const base = document.createElement('canvas'); base.width = PW; base.height = PH;
      rightStatic(base.getContext('2d'), s, i);
      const anim = MAKERS[s.anim] ? MAKERS[s.anim]() : null;
      const paint = () => { R.ctx.drawImage(base, 0, 0); if (anim) anim.draw(R.ctx); R.tex.needsUpdate = true; };
      paint();
      return { L, R, anim, paint };
    });
    /* порядок: обложка, чистые листы, развороты сцен, чистые листы. Левая страница разворота — нечётная */
    pages = [];
    for (let p = 0; p < PAGES; p++) {
      const k = p - (1 + LEAD);
      if (k >= 0 && k < scenes.length * 2) {
        const s = scenes[k >> 1], e = live[k >> 1];
        pages.push(k % 2 === 0
          ? { src: e.L.tex, alt: 'Что не так', text: s.phrase + '\n\n' + s.note }
          : { src: e.R.tex, alt: s.label, text: s.solution });
      } else pages.push({ src: p % 2 ? blankL.tex : blank.tex, alt: '' });
    }
  };

  /* ---------- кольца на корешке ---------- */
  const placeRings = () => {
    if (!rings || !book) return;
    const hit = host.querySelector('[data-leafthrough-hit-area]');
    if (!hit || stacked) return;
    /* по смещениям, а не по экранным рамкам: блокнот повёрнут, рамки на экране — уже не его стороны */
    const hr = { left: host.offsetLeft + hit.offsetLeft, top: host.offsetTop + hit.offsetTop, width: hit.offsetWidth, height: hit.offsetHeight }, pr = { left: 0, top: 0 };
    if (!hr.width) return;
    const pageW = hr.width / 2;
    rings.style.cssText = `left:${hr.left - pr.left + pageW - pageW * HOLE_X - 2}px;top:${hr.top - pr.top}px;width:${pageW * HOLE_X * 2 + 4}px;height:${hr.height}px`;
    rings.classList.add('is-on');
    stack.style.cssText = `left:${hr.left - pr.left}px;top:${hr.top - pr.top}px;width:${hr.width}px;height:${hr.height}px`;
  };
  if (rings) rings.innerHTML = HOLE_Y.map((f) => `<span class="apx__ring" style="top:${f * 100}%"></span>`).join('');
  /* толща блокнота по внешним краям: слева — перелистанные листы, справа — ещё не прочитанные */
  const stack = document.createElement('div'); stack.className = 'apx__stack'; stack.setAttribute('aria-hidden', 'true');
  stack.innerHTML = '<span class="apx__stack-l"></span><span class="apx__stack-r"></span>';
  host.parentElement.insertBefore(stack, host);
  const LAYERS = 9;
  const edges = (n, dir) => { const out = []; for (let k = 1; k <= LAYERS; k++) { const on = k <= n; out.push((dir * k * 1.7).toFixed(1) + 'px ' + (k * 1.1).toFixed(1) + 'px 0 ' + (on ? (k % 2 ? '#EFE8DD' : '#D9D0C2') : 'rgba(217,208,194,0)')); } return out.join(', '); };
  const setStack = (sc) => {
    const left = 2 + 2 * sc, right = 2 + 2 * (scenes.length - 1 - sc);
    stack.firstChild.style.boxShadow = edges(Math.min(LAYERS, left), -1);
    stack.lastChild.style.boxShadow = edges(Math.min(LAYERS, right), 1);
  };
  setStack(0);

  /* ---------- блокнот ---------- */
  let ringT = 0;
  let step = 0, inView = false, raf = 0, lastT = 0, acc = 0, shown = -1;
  const sceneOf = (st) => (stacked ? st >> 1 : st);
  const animating = () => {
    if (!book || reduce) return -1;
    const st = step, sc = sceneOf(st);
    if (stacked && st % 2 === 0) return -1;                    // на телефоне видна левая страница — анимация не нужна
    return sc;
  };
  const loop = (now) => {
    raf = 0;
    if (!inView || document.hidden) return;
    raf = requestAnimationFrame(loop);
    const dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0; lastT = now;
    acc += dt;
    if (acc < 1 / 30) return;                                  // 30 кадров в секунду — глазу незаметно, видеокарте легче
    const sc = animating(); const e = sc >= 0 ? live[sc] : null;
    if (!e || !e.anim) { acc = 0; return; }
    if (shown !== sc) { shown = sc; e.anim.enter(); }
    e.anim.tick(acc); acc = 0;
    e.paint();
    book.needsRender = true;                                   // библиотека рисует кадр, только если что-то сдвинулось — просим и сейчас
  };
  const wake = () => { if (!raf && inView) { lastT = 0; raf = requestAnimationFrame(loop); } };

  const start = () => {
    build();
    book = new LeafThrough(host, {
      pages,
      startPage: pageOfStep(step),
      layout: stacked ? 'single' : 'spread',
      bleed: stacked,                                          // компьютер: всё внутри своей области — блокнот можно повернуть, геометрия не сбивается
      pageAspect: ASPECT,
      loop: false,
      label: 'Блокнот «Мой подход»',
      formatPageLabel: (d) => 'Сцена ' + (sceneOf(Math.max(0, Math.min(scenes.length * (stacked ? 2 : 1) - 1, stacked ? d.page - 1 - LEAD : (d.page - 1 - LEAD) >> 1))) + 1) + ' из ' + scenes.length,
      paper: { backColor: PAPER, showThrough: 0.02, bulge: 0.6, wrinkles: 0.4 },
      lighting: { floorShadow: 0.22, ambient: { sky: '#ffffff', ground: '#d8cfc2', intensity: 2.05 }, sun: { intensity: 2.1 } },
      motion: { speed: 0.85, jitter: true },
      interaction: { drag: false, click: false, hold: false, hover: false, keyboard: false },
      preload: Infinity,
    });
    book.addEventListener('ready', () => { placeRings(); section.classList.add('is-book-ready'); });
    book.addEventListener('pagechange', placeRings);
    window.addEventListener('resize', () => setTimeout(placeRings, 60));
    new IntersectionObserver((en) => { inView = en[0].isIntersecting; if (inView) { placeRings(); wake(); } }, { threshold: 0 }).observe(host);
  };

  /* main.js задаёт шаг: на компьютере шаг — сцена (разворот), на телефоне — страница */
  window.approachBook = {
    show(st) {
      step = st;
      if (book) book.goTo(pageOfStep(st), { animate: !reduce });
      setStack(sceneOf(st));
      /* пока лист переворачивается, кольца прячутся — лист проходит сквозь них */
      if (rings && !stacked) { rings.classList.add('is-turning'); clearTimeout(ringT); ringT = setTimeout(() => rings.classList.remove('is-turning'), reduce ? 0 : 1250); }
      const li = section.querySelectorAll('.apx__scene');
      li.forEach((el, k) => el.classList.toggle('is-current', k === sceneOf(st)));
    },
    steps: () => (stacked ? scenes.length * 2 : scenes.length),
    sceneOf,
  };

  /* шрифт от руки — до первой отрисовки страниц */
  const font = new FontFace('Studio Script', 'url(fonts/studio-script.ttf)');
  font.load().then((f) => { document.fonts.add(f); }).catch(() => {}).then(() => {
    /* блокнот строится заранее, в первую свободную минуту после загрузки сайта: тяжёлая подготовка
       не совпадает ни с первым экраном, ни с прокруткой (иначе прокрутка к блоку могла бы споткнуться) */
    let done = false;
    const go = () => { if (done) return; done = true; io.disconnect(); start(); };
    const idle = (fn) => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 200));
    const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) go(); }, { rootMargin: '60% 0px' });   // запасной путь — если до блока долистали раньше
    io.observe(section);
    const early = () => setTimeout(() => idle(go), 1200);
    if (document.readyState === 'complete') early(); else window.addEventListener('load', early);
  });
}
