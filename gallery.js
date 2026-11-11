/* Блок 9 «Галерея» — по мотивам «Atmospheric Depth Gallery» (codrops, Houmahani Kane):
   баннеры стоят друг за другом в глубину, камера сама, без прокрутки, плавно летит сквозь них —
   у каждого баннера замедляется, между ними ускоряется; ближний баннер проявляется, прошедший растворяется.
   Показ идёт один раз, без повторов: на последнем баннере камера останавливается.
   Фон — спокойный фирменный (CSS), без пятен и зерна; лишние тяжёлые эффекты убраны, чтобы ничего не тормозило.
   Подпись — название и вид работы текущего баннера. */
import * as THREE from 'three';

const sec = document.querySelector('[data-gallery]');
if (sec) init();

function init() {
  const canvas = sec.querySelector('.gal__canvas');
  const DATA = JSON.parse(sec.querySelector('.gal__data').textContent);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => window.innerWidth <= 768;

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { sec.classList.add('gal--nogl'); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

  /* ---------- баннеры в глубину ---------- */
  const GAP = 5, VIEW = 5;                 // расстояние между баннерами и от камеры до текущего
  const planes = [];
  const geometry = new THREE.PlaneGeometry(3, 3);
  const pointer = new THREE.Vector2(), pointerNow = new THREE.Vector2();
  const xSpread = () => (isMobile() ? 0.25 : 1);
  const baseScale = () => (isMobile() ? 0.65 : 1);
  window.addEventListener('pointermove', (e) => { pointer.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1)); }, { passive: true });

  /* ---------- плавное автоматическое движение ---------- */
  const PER = 4.6;                          // секунд на один баннер
  const last = DATA.length - 1;
  const ease = (u) => u - Math.sin(2 * Math.PI * u) / (2 * Math.PI) * 0.9;   // у баннера медленно, между — быстрее; без остановок и рывков
  let t = 0, done = false;
  const progressAt = (time) => {
    const raw = Math.min(time / PER, last);
    const i = Math.floor(raw), u = raw - i;
    return i >= last ? last : i + ease(u);
  };

  /* ---------- подпись ---------- */
  const label = sec.querySelector('.gal__label'), lName = label.querySelector('.gal__name'), lDesc = label.querySelector('.gal__desc'), lChip = label.querySelector('.gal__chip');
  let labelIndex = 0;
  const setLabel = (i) => {
    if (i === labelIndex) return;
    labelIndex = i;
    label.classList.add('is-swap');
    setTimeout(() => { lName.textContent = DATA[i].name; lDesc.textContent = DATA[i].desc; lChip.style.backgroundColor = DATA[i].accentColor; label.classList.remove('is-swap'); }, 220);
  };

  /* ---------- кадр ---------- */
  let ready = false, running = false, visible = false, raf = 0, lastT = 0;
  const layout = () => planes.forEach((p) => { p.userData.x = p.userData.base.x * xSpread(); });
  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false);
    if (ready) layout();
  };
  const render = (dt) => {
    if (!done) { t += reduce ? PER * dt / 0.4 : dt; if (t >= PER * last) { t = PER * last; done = true; } }
    const p = progressAt(t);
    camera.position.z = VIEW - p * GAP;
    pointerNow.lerp(pointer, 0.06);
    const s0 = baseScale();
    planes.forEach((pl, i) => {
      const d = p - i;                                   // 0 — баннер перед камерой; <0 — впереди; >0 — пройден
      /* следующий проявляется только на подлёте, прошедший быстро гаснет — баннеры не сливаются друг с другом */
      const op = d <= 0 ? THREE.MathUtils.smoothstep(d, -0.6, -0.12) : 1 - THREE.MathUtils.smoothstep(d, 0.04, 0.38);
      pl.material.opacity = op;
      pl.visible = op > 0.002;
      pl.position.set(pl.userData.x + pointerNow.x * 0.12 * op, pl.userData.base.y + pointerNow.y * 0.06 * op, -i * GAP);
      pl.rotation.set(-pointerNow.y * 0.03 * op, pointerNow.x * 0.03 * op, 0);
      const k = pl.userData.k;
      pl.scale.set(s0 * k * pl.userData.aspect, s0 * k, 1);
    });
    setLabel(Math.round(p));
    renderer.render(scene, camera);
  };
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (lastT || now)) / 1000); lastT = now;
    render(dt);
  };
  const start = () => { if (running || !ready || !visible) return; running = true; lastT = 0; raf = requestAnimationFrame(frame); };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  const build = (textures) => {
    DATA.forEach((d, i) => {
      const tex = textures[i], img = tex && tex.image;
      const aspect = img && img.width > 0 ? img.width / img.height : 1;
      const mat = new THREE.MeshBasicMaterial({ map: tex || null, color: tex ? '#ffffff' : '#2F4B52', transparent: true, depthWrite: false, opacity: i === 0 ? 1 : 0 });
      const mesh = new THREE.Mesh(geometry, mat);
      const wide = aspect > 1.2;                          // широкий баннер — по центру и чуть меньше, не наезжает на подписи
      mesh.userData.base = wide ? { x: 0, y: 0 } : d.position;
      mesh.userData.aspect = aspect; mesh.userData.k = wide ? 0.6 : 1;
      scene.add(mesh); planes.push(mesh);
    });
    layout();
    ready = true;
    render(0);
  };

  resize();
  window.addEventListener('resize', resize);
  /* фото грузятся заранее, когда до блока остаётся экран прокрутки */
  const loader = new THREE.TextureLoader();
  let loading = false;
  new IntersectionObserver((en) => {
    if (!en[0].isIntersecting || loading) return;
    loading = true;
    Promise.all(DATA.map((d) => loader.loadAsync(d.src).then((tx) => { tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; return tx; }).catch(() => null)))
      .then(async (tex) => {
        /* баннеры — на видеокарту по одному, в свободные минуты браузера: раньше все разом в первом кадре, и прокрутка подлагивала */
        const idle = () => new Promise((r) => (window.requestIdleCallback ? window.requestIdleCallback(r, { timeout: 300 }) : setTimeout(r, 30)));
        for (const t of tex) { if (t) { await idle(); renderer.initTexture(t); } }
        build(tex); resize(); start();
      });
  }, { rootMargin: '100% 0px' }).observe(sec);
  /* идёт, только пока блок на экране; досмотрели до конца и вернулись — заново с первого */
  new IntersectionObserver((en) => {
    visible = en[0].isIntersecting;
    if (visible) { if (done) { done = false; t = 0; } start(); } else stop();
  }, { threshold: 0.35 }).observe(sec);
}
