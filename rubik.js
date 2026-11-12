/* «Мой подход», третья карточка → «Как решаю я»: вместо фото — кубик Рубика из фирменных цветов
   (по мотивам «Metal Rubics», Originkit; переписано без React и библиотеки motion). Настоящий 3D-кубик 3×3:
   скруглённые кубики с тонкими зазорами, сам поворачивает слои на четверть оборота с упругим доводом
   и медленно вращается целиком; его можно покрутить мышью или пальцем. Работает, только пока карточка открыта и видна. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const host = document.querySelector('[data-rubik]');
if (host) init();

function init() {
  const back = host.closest('.apx__back');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* грани +x, −x, +y, −y, +z, −z — шесть фирменных цветов; внутренние грани — почти чёрные, как у настоящего кубика */
  const COLORS = ['#A9502C', '#C9A27A', '#E8DCC8', '#2F4B52', '#6F7B74', '#6A5F51'].map((c) => new THREE.Color(c));
  const BLANK = new THREE.Color('#070F10');
  const FACE = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const GRID = 3, GAP = 1, ROUND = 0.0735, PERSPECTIVE = 0.15, SIZE = 80;   // кубик чуть меньше — ровные отступы до подписи и текста
  const SPIN = { x: 0, y: 11, z: 0 };                       // собственное вращение (как в образце)
  const SPRING = { k: 200, c: 20, m: 1 };                   // упругий поворот слоя: жёсткость, затухание, масса

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const el = renderer.domElement;
  el.className = 'rubik__canvas';
  host.appendChild(el);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000);
  const group = new THREE.Group(), pivot = new THREE.Group();
  const ambient = new THREE.AmbientLight(0xffffff, 1.15), key = new THREE.DirectionalLight(0xffffff, 0.9);   // светлее — фирменные цвета читаются ярко
  key.position.set(0.4, 0.7, 1);
  camera.add(key);
  scene.add(ambient, camera, group);
  group.add(pivot);

  const centre = (i) => -1 + (2 * i + 1) / GRID;
  const index = (c) => Math.max(0, Math.min(GRID - 1, Math.round((c * GRID + GRID - 1) / 2)));
  const snap = (c) => centre(index(c));

  /* кубики оболочки: у каждого свои цвета граней в атрибуте вершин — цвет едет вместе с кубиком */
  const side = (2 / GRID) * (1 - GAP / 100);
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const cubies = [];
  for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) for (let k = 0; k < GRID; k++) {
    if (!(i === 0 || i === GRID - 1 || j === 0 || j === GRID - 1 || k === 0 || k === GRID - 1)) continue;
    const geo = new RoundedBoxGeometry(side, side, side, 3, side * ROUND);
    const outer = [i === GRID - 1, i === 0, j === GRID - 1, j === 0, k === GRID - 1, k === 0];
    const n = geo.getAttribute('normal'), col = new THREE.BufferAttribute(new Float32Array(n.count * 3), 3);
    for (let v = 0; v < n.count; v++) {
      let face = 0, best = -Infinity;
      for (let f = 0; f < 6; f++) { const d = n.getX(v) * FACE[f][0] + n.getY(v) * FACE[f][1] + n.getZ(v) * FACE[f][2]; if (d > best) { best = d; face = f; } }
      const c = outer[face] ? COLORS[face] : BLANK;
      col.setXYZ(v, c.r, c.g, c.b);
    }
    geo.setAttribute('color', col);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(centre(i), centre(j), centre(k));
    group.add(mesh); cubies.push(mesh);
  }

  /* камера — та же раскладка кадра, что в образце */
  const resize = () => {
    const w = host.clientWidth || 300, h = host.clientHeight || 300;
    renderer.setSize(w, h, false);
    const aspect = w / h, distance = 1 / PERSPECTIVE;
    const minExtent = (1 / 0.26) * (100 / SIZE);
    const visible = aspect < 1 ? minExtent / aspect : minExtent;
    camera.aspect = aspect; camera.position.set(0, 0, distance); camera.lookAt(0, 0, 0);
    camera.fov = 2 * Math.atan(visible / 2 / distance) * 180 / Math.PI;
    camera.near = Math.max(0.1, distance - 10); camera.far = distance + 10;
    camera.updateProjectionMatrix();
  };
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(host);

  /* поворот слоя: кубики слоя — на шарнир, шарнир доводится пружиной на четверть оборота */
  const AX = ['x', 'y', 'z'];
  let turn = null, last = null;
  const pick = () => {
    let m, tries = 0;
    do { m = { axis: Math.floor(Math.random() * 3), layer: Math.floor(Math.random() * GRID), dir: Math.random() < 0.5 ? 1 : -1 }; tries++; }
    while (tries < 8 && last && m.axis === last.axis && m.layer === last.layer && m.dir === -last.dir);   // не отменять прошлый ход
    const a = AX[m.axis];
    pivot.rotation.set(0, 0, 0);
    cubies.forEach((c) => { if (index(c.position[a]) === m.layer) pivot.attach(c); });
    turn = { ...m, a, target: m.dir * Math.PI / 2, x: 0, v: 0 };
    last = m;
  };
  const commit = () => {
    pivot.rotation.set(0, 0, 0); pivot.rotation[turn.a] = turn.target; pivot.updateMatrixWorld(true);
    for (let i = pivot.children.length - 1; i >= 0; i--) {
      const c = pivot.children[i]; group.attach(c);
      c.position.set(snap(c.position.x), snap(c.position.y), snap(c.position.z));   // без накопления погрешности
    }
    pivot.rotation.set(0, 0, 0);
    turn = null;
  };

  /* перетаскивание мышью или пальцем */
  let ax = 0.5, ay = 0.6, az = 0, dragging = false, lx = 0, ly = 0;
  el.addEventListener('pointerdown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; el.setPointerCapture(e.pointerId); el.classList.add('is-drag'); });
  el.addEventListener('pointermove', (e) => { if (!dragging) return; const s = 3 * 0.008; ay += (e.clientX - lx) * s; ax += (e.clientY - ly) * s; lx = e.clientX; ly = e.clientY; });
  const up = (e) => { dragging = false; el.classList.remove('is-drag'); if (el.hasPointerCapture && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId); };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);

  let raf = 0, lastT = 0, inView = false;
  const isOpen = () => back && back.style.visibility !== 'hidden' && (parseFloat(back.style.opacity) || 0) > 0.02;
  const step = (now) => {
    raf = 0;
    if (!inView || !isOpen()) return;
    raf = requestAnimationFrame(step);
    let dt = lastT ? (now - lastT) / 1000 : 0; lastT = now;
    if (dt > 0.05) dt = 0.05;
    if (!dragging && !reduce) { const kk = 0.06; ax += SPIN.x * kk * dt; ay += SPIN.y * kk * dt; az += SPIN.z * kk * dt; }
    group.rotation.set(ax, ay, az);
    if (!reduce) {
      if (!turn) pick();
      /* пружина: доводит слой с лёгким перелётом и успокаивается — как spring в образце */
      const sub = 4, h = dt / sub;
      for (let i = 0; i < sub; i++) { const f = -SPRING.k * (turn.x - 1) - SPRING.c * turn.v; turn.v += f / SPRING.m * h; turn.x += turn.v * h; }
      pivot.rotation[turn.a] = turn.target * turn.x;
      if (Math.abs(turn.x - 1) < 0.002 && Math.abs(turn.v) < 0.02) commit();
    }
    renderer.render(scene, camera);
  };
  const check = () => { if (inView && !raf && isOpen()) { lastT = 0; raf = requestAnimationFrame(step); } };
  let poll = 0;
  new IntersectionObserver((e) => {
    inView = e[0].isIntersecting;
    clearInterval(poll);
    if (inView) poll = setInterval(check, 200);            // карточку открыли — заметим за пятую долю секунды
  }, { threshold: 0 }).observe(host);
}
