/* Блок 9 «Галерея» — продолжение блока 8: поле из макетов, которое «вздувается» под курсором.
   Порт «Image Grid» (Originkit; по уроку samueljarry/codrops-tutorial-grid) на three.js без React:
   ортографическая камера −1…1, растянутая на контейнер; у каждой карточки одно число — квадрат расстояния
   до курсора: оно же масштаб (ближе — крупнее), глубина (крупная поверх соседей) и уход в серое (дальше — бесцветнее).
   При появлении поле разворачивается из центральной линии: сначала по горизонтали, потом раскладывается по строкам.
   По нажатию работа открывается целиком на весь экран. */
import * as THREE from 'three';

const sec = document.querySelector('[data-gallery]');
if (sec) init();

function init() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gsap = window.gsap;
  const holder = sec.querySelector('.gal__grid');
  const WORKS = JSON.parse(sec.querySelector('.gal__data').textContent);   // работы: миниатюра, полный файл, название, вид

  /* настройки пресета: cell 164, cardSize 57, magnify 11, radius 40, drain 13, assemble */
  const MAX_CARDS = 420, PLATEAU = 0.55;
  const S = { cell: 164, fill: 0.57, magnify: 1 + 11 * 0.3, radius: 40, drain: 1.3 };
  const falloffAt = r => { if (r <= PLATEAU) return 1; if (r >= 1) return 0; const t = (r - PLATEAU) / (1 - PLATEAU); return 1 - t * t * (3 - 2 * t); };

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { sec.classList.add('gal--nogl'); return; }       // без WebGL — останется подпись и просмотр не нужен
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.className = 'gal__canvas';
  holder.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.z = 5;
  const geometry = new THREE.PlaneGeometry(1, 1);

  const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const FRAG = `
    uniform sampler2D uTexture; uniform float uDistance; uniform float uDrain; uniform vec2 uCover; uniform float uReady;
    varying vec2 vUv;
    void main(){
      vec2 uv = (vUv - 0.5) * uCover + 0.5;                      // квадратная карточка: фото обрезается по центру, не растягивается
      vec4 image = texture2D(uTexture, uv);
      float d = clamp(uDistance * uDrain, 0.0, 1.0);
      vec3 lum = vec3(dot(vec3(0.2126, 0.7152, 0.0722), image.rgb));
      vec3 color = mix(image.rgb, lum, d);
      color = mix(vec3(0.043, 0.094, 0.106), color, uReady);    // пока фото грузится — тёмная плашка цвета фона
      gl_FragColor = vec4(color, 1.0);
    }`;

  /* текстуры — по одной на работу */
  const textures = WORKS.map(() => null);
  const loader = new THREE.TextureLoader();
  let cards = [], columns = 1, rows = 1, width = 1, height = 1;
  const baseScale = new THREE.Vector3(1, 1, 1), maxScale = new THREE.Vector3(1, 1, 1), scratch = new THREE.Vector3();
  const mouse = new THREE.Vector2(), targetMouse = new THREE.Vector2();
  let hover = 0, targetHover = 0;

  const applyTexture = slot => {
    const tex = textures[slot]; if (!tex) return;
    const ia = (tex.image.width || 1) / (tex.image.height || 1);
    cards.forEach(c => { if (c.slot !== slot) return; c.mat.uniforms.uTexture.value = tex; c.mat.uniforms.uReady.value = 1; c.mat.uniforms.uCover.value.set(ia > 1 ? 1 / ia : 1, ia > 1 ? 1 : ia); });
  };
  WORKS.forEach((w, i) => loader.load(w.thumb, tex => { tex.minFilter = THREE.LinearMipmapLinearFilter; textures[i] = tex; applyTexture(i); }));

  /* какая работа в какой ячейке — от координат ячейки, чтобы при ресайзе поле не перемешивалось */
  const slotFor = (c, r) => Math.abs(((c * 73856093) ^ (r * 19349663)) >>> 0) % WORKS.length;

  const resolveScales = () => {
    const aspect = Math.max(1e-3, width / Math.max(1, height));
    const w = (2 / columns) * S.fill;
    baseScale.set(w, w * aspect, 1);
    maxScale.copy(baseScale).multiplyScalar(width < height ? S.magnify * 0.5 : S.magnify);
  };
  const resolveHomes = () => {
    const cw = 2 / columns, ch = 2 / rows;
    cards.forEach(c => c.home.set(-1 + (c.col + 0.5) * cw, -1 + (c.row + 0.5) * ch, 0));
  };
  const clearCards = () => { cards.forEach(c => { scene.remove(c.mesh); c.mat.dispose(); }); cards = []; };
  const cellPx = () => (width < 700 ? 92 : S.cell * Math.max(0.62, Math.min(1, width / 1920)));
  const build = (assemble) => {
    clearCards();
    const cell = cellPx();
    columns = Math.max(1, Math.floor(width / cell)); rows = Math.max(1, Math.floor(height / cell));
    while (columns * rows > MAX_CARDS) { if (columns >= rows) columns--; else rows--; }
    resolveScales();
    for (let i = 0; i < columns; i++) for (let j = 0; j < rows; j++) {
      const slot = slotFor(i, j);
      const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG,
        uniforms: { uTexture: { value: textures[slot] }, uDistance: { value: 0 }, uDrain: { value: S.drain }, uCover: { value: new THREE.Vector2(1, 1) }, uReady: { value: textures[slot] ? 1 : 0 } } });
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.scale.copy(baseScale);
      const card = { mesh, mat, col: i, row: j, slot, home: new THREE.Vector3(), target: new THREE.Vector3() };
      cards.push(card); scene.add(mesh);
    }
    resolveHomes();
    cards.forEach(c => { if (assemble && !reduce) c.mesh.position.set(0, 0, 0); else c.mesh.position.copy(c.home); });
    for (let i = 0; i < textures.length; i++) applyTexture(i);
  };
  const setSize = (assemble) => {
    width = Math.max(1, holder.clientWidth); height = Math.max(1, holder.clientHeight);
    renderer.setSize(width, height, false);
    const cell = cellPx();
    const c = Math.max(1, Math.floor(width / cell)), r = Math.max(1, Math.floor(height / cell));
    if (c !== columns || r !== rows || !cards.length) build(assemble); else { resolveScales(); resolveHomes(); }
  };

  /* курсор — в те же −1…1 */
  const toMouse = e => {
    const r = canvas.getBoundingClientRect(); if (!r.width || !r.height) return;
    targetMouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
  };
  canvas.addEventListener('pointermove', e => { toMouse(e); targetHover = 1; });
  canvas.addEventListener('pointerenter', () => { targetHover = 1; });
  canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') targetHover = 0; });
  canvas.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { toMouse(e); mouse.copy(targetMouse); targetHover = 1; } });

  /* ---------- кадр ---------- */
  let raf = 0, lastT = 0, running = false;
  const step = () => {
    const now = performance.now();
    let dt = (now - lastT) / 1000; lastT = now;
    if (!isFinite(dt) || dt < 0) dt = 0; if (dt > 0.05) dt = 0.05;
    mouse.lerp(targetMouse, 1 - Math.pow(0.0125, dt));
    hover += (targetHover - hover) * (1 - Math.exp(-dt * 5));
    const posRate = 1 - Math.pow(0.005 / columns, dt), scaleRate = 1 - Math.pow(0.0002, dt);
    for (const c of cards) {
      const m = c.mesh;
      const dx = (mouse.x - m.position.x) * 0.5 * width, dy = (mouse.y - m.position.y) * 0.5 * height;
      const reach = Math.sqrt(dx * dx + dy * dy) / S.radius;
      scratch.lerpVectors(baseScale, maxScale, falloffAt(reach) * hover);
      m.scale.lerp(scratch, scaleRate);
      const distance = reach * reach * hover + (1 - hover) * 0.45;   // без курсора поле приглушено; под курсором — цвет, вдали — серое
      m.position.z = -Math.min(reach * reach, 90);   // глубина не дальше дальней плоскости камеры — иначе дальние карточки пропадают
      c.mat.uniforms.uDistance.value = distance;
      const settledX = Math.abs(c.home.x - m.position.x) < 0.075;  // сначала разворачивается вбок, потом раскладывается по строкам
      c.target.set(c.home.x, settledX ? c.home.y : 0, m.position.z);
      m.position.lerp(c.target, posRate);
    }
    renderer.render(scene, camera);
  };
  const loop = () => { raf = requestAnimationFrame(loop); step(); };
  const start = () => { if (running) return; running = true; lastT = performance.now(); raf = requestAnimationFrame(loop); };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  /* поле строится при первом появлении блока — разворот видно; крутится, только пока блок на экране */
  let built = false;
  new IntersectionObserver(en => {
    if (en[0].isIntersecting) {
      if (!built) { built = true; setSize(true); if (gsap && !reduce) introText(); }
      start();
    } else stop();
  }, { threshold: 0.2 }).observe(sec);
  new ResizeObserver(() => { if (built) { setSize(false); if (!running) step(); } }).observe(holder);

  function introText() {
    gsap.from(sec.querySelector('.gal__sub'), { autoAlpha: 0, y: 14, duration: 0.7, ease: 'power3.out' });
    gsap.from(sec.querySelectorAll('.gal__head .story__reveal'), { yPercent: 110, autoAlpha: 0, duration: 1, delay: 0.1, ease: 'power3.out' });
    gsap.from(sec.querySelectorAll('.gal__kicker, .gal__hint'), { autoAlpha: 0, y: 14, duration: 0.7, delay: 0.35, stagger: 0.08, ease: 'power3.out' });
  }

  /* ---------- нажатие: работа под курсором — целиком на весь экран ---------- */
  const box = document.querySelector('.gal-box');
  const boxImg = box.querySelector('.gal-box__img'), boxName = box.querySelector('.gal-box__name'), boxKind = box.querySelector('.gal-box__kind');
  let cur = 0, lastFocus = null, downAt = null;
  const fill = i => { const w = WORKS[i]; boxImg.src = w.full; boxImg.alt = w.alt; boxName.textContent = w.name; boxKind.textContent = w.kind; };
  const open = i => {
    cur = i; fill(i); lastFocus = document.activeElement;
    box.hidden = false; document.documentElement.classList.add('gal-open');
    if (window.lenis) window.lenis.stop();
    if (gsap && !reduce) { gsap.fromTo(box, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 }); gsap.fromTo(boxImg, { scale: 0.94, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.55, ease: 'power3.out' }); }
    box.querySelector('.gal-box__close').focus();
  };
  const close = () => {
    const done = () => { box.hidden = true; document.documentElement.classList.remove('gal-open'); if (window.lenis) window.lenis.start(); if (lastFocus) lastFocus.focus(); };
    if (gsap && !reduce) gsap.to(box, { autoAlpha: 0, duration: 0.25, onComplete: done }); else done();
  };
  const go = dir => {
    cur = (cur + dir + WORKS.length) % WORKS.length;
    if (gsap && !reduce) gsap.to(boxImg, { autoAlpha: 0, x: -30 * dir, duration: 0.2, onComplete: () => { fill(cur); gsap.fromTo(boxImg, { autoAlpha: 0, x: 30 * dir }, { autoAlpha: 1, x: 0, duration: 0.4, ease: 'power3.out' }); } });
    else fill(cur);
  };
  /* какая карточка под точкой: ближайшая по экранному расстоянию */
  const pick = e => {
    const r = canvas.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * 2 - 1, my = -(((e.clientY - r.top) / r.height) * 2 - 1);
    let best = null, bd = Infinity;
    for (const c of cards) {
      const dx = (mx - c.mesh.position.x) * 0.5 * width, dy = (my - c.mesh.position.y) * 0.5 * height;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  };
  canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('click', e => {
    if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 8) return;   // это была прокрутка пальцем
    const c = pick(e); if (c) open(c.slot);
  });
  canvas.style.cursor = 'pointer';
  box.querySelector('.gal-box__close').addEventListener('click', close);
  box.querySelector('.gal-box__prev').addEventListener('click', () => go(-1));
  box.querySelector('.gal-box__next').addEventListener('click', () => go(1));
  box.addEventListener('click', e => { if (e.target === box || e.target.classList.contains('gal-box__stage')) close(); });
  document.addEventListener('keydown', e => {
    if (box.hidden) return;
    if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1);
  });
}
