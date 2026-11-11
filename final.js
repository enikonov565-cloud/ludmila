/* Последняя страница — «Cinematic 3D Scroll Experiences with GSAP», демо 1 (codrops, Joseph Santamaria),
   переписано без React и OGL, на three.js сайта. Пролёт идёт сам, без прокрутки и мыши: подлёт к широкому цилиндру →
   взгляд сверху (кольцо) → вплотную сбоку → внутрь → спокойный отъезд, в конце цилиндр снова во весь экран.
   На каждом этапе — свой заголовок; цвет заголовка подстраивается под фон ради читаемости. Последний заголовок —
   с кнопкой «Заказать свой сайт» — остаётся. Цилиндр всё время медленно вращается сам. Изнутри экраны читаются
   не зеркально. Дуги-«частицы» видны, пока цилиндр быстро крутится. Показ — заново при каждом возвращении к странице. */
import * as THREE from 'three';

const sec = document.querySelector('[data-final]');
if (sec && window.gsap) init();

function init() {
  const gsap = window.gsap;
  const stage = sec.querySelector('.final__stage');
  const canvas = sec.querySelector('.final__gl');
  const steps = Array.prototype.slice.call(sec.querySelectorAll('.final__step'));
  const lines = Array.prototype.slice.call(sec.querySelectorAll('.final__ln'));   // строки, цвет которых подстраивается под фон
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* лента из пяти главных экранов (Nikonovphoto, Флорис, Театр кукол, Лисса Миляева, Комфорт интерьер) склеена заранее
     в одну картинку нужного размера; рядом — крошечная карта яркости. В браузере ничего не рисуется и не масштабируется */
  const STRIP = 'img/final/strip.webp', STRIP_LUM = 'img/final/strip-lum.png', SCREENS = 5;
  const LAPS = 1;
  const CELL = { w: 1920, h: 980 };
  const RADIUS = 2.5;                                                 // как в оригинале
  const HEIGHT = (2 * Math.PI * RADIUS) * CELL.h / (CELL.w * SCREENS * LAPS);
  const SPIN = 0.05;                                                   // медленное собственное вращение, рад/с — спокойно, без суеты

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
  catch (e) { gsap.set(steps[steps.length - 1], { autoAlpha: 1 }); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 200);

  /* расстояние, при котором цилиндр спереди занимает ~88% ширины (на телефоне — шире экрана) */
  const fit = () => {
    const w = stage.clientWidth || window.innerWidth, h = stage.clientHeight || window.innerHeight;
    const aspect = w / h, mobile = aspect < 1, fov = mobile ? 50 : 45;
    const th = Math.tan(fov * Math.PI / 360) * aspect;
    const D = RADIUS / Math.sin(Math.atan((mobile ? 1.6 : 0.7) * th));
    return { fov, aspect, D, w, h, mobile };
  };
  let F = fit();
  const S = RADIUS / 2.5;                                               // масштаб к цилиндру оригинала (радиус 2,5)
  const cam = { x: 0, y: 0, z: F.D };

  /* цилиндр */
  const SEG = 160, pos = [], uv = [], idx = [];
  for (let y = 0; y <= 1; y++) for (let x = 0; x <= SEG; x++) {
    const u = x / SEG, th = -u * Math.PI * 2;
    pos.push(Math.cos(th) * RADIUS, (y - 0.5) * HEIGHT, Math.sin(th) * RADIUS); uv.push(u, y);
  }
  for (let x = 0; x < SEG; x++) { const a = x, b = x + SEG + 1, c = x + 1, d = b + 1; idx.push(a, b, c, b, d, c); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { tMap: { value: null }, uDarkness: { value: 0.04 }, uLaps: { value: LAPS } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D tMap; uniform float uDarkness; uniform float uLaps; varying vec2 vUv;
      void main(){ vec2 st = gl_FrontFacing ? vec2(1.0 - vUv.x, vUv.y) : vUv; st.x = fract(st.x * uLaps);
        vec4 t = texture2D(tMap, st); t.rgb *= (1.0 - uDarkness); gl_FragColor = t;
        #include <colorspace_fragment>
      }`
  });
  const cylinder = new THREE.Mesh(geo, mat);
  cylinder.visible = false;
  scene.add(cylinder);

  /* дуги-«частицы» */
  const PCOUNT = 16, PSEG = 24, PSPAN = 0.22, PRAD = RADIUS + 0.9, particles = [];
  for (let i = 0; i < PCOUNT; i++) {
    const start = (i / PCOUNT) * Math.PI * 2, top = i < PCOUNT / 2;
    const y = top ? HEIGHT * 0.7 + Math.random() * HEIGHT * 0.3 : -HEIGHT + Math.random() * HEIGHT * 0.3;
    const arr = new Float32Array((PSEG + 1) * 3), g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x2F4B52, transparent: true, opacity: 0 }));
    line.userData = { base: start, speed: 0.5 + Math.random() };
    line.userData.place = () => { for (let j = 0; j <= PSEG; j++) { const a = line.userData.base + PSPAN * j / PSEG; arr[j * 3] = Math.cos(a) * PRAD; arr[j * 3 + 1] = y; arr[j * 3 + 2] = Math.sin(a) * PRAD; } g.attributes.position.needsUpdate = true; };
    line.userData.place();
    scene.add(line); particles.push(line);
  }

  const resize = () => {
    F = fit();
    renderer.setSize(F.w, F.h, false);
    camera.fov = F.fov; camera.aspect = F.aspect; camera.updateProjectionMatrix();
  };
  resize();

  const LW = 400, LH = 40, lumMap = new Float32Array(LW * LH);
  /* свободная минута браузера: всю подготовку делаем кусочками между кадрами, пока смотрят соседний блок */
  const idle = (fn) => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 400 }) : setTimeout(fn, 30));
  const pause = () => new Promise((r) => idle(r));
  /* картинка распаковывается в фоне, не в основном потоке (createImageBitmap); flip — сразу при распаковке */
  const bitmap = async (src, flip) => {
    const blob = await fetch(src).then((r) => r.blob());
    if (window.createImageBitmap) {
      try { return await createImageBitmap(blob, { imageOrientation: flip ? 'flipY' : 'none' }); } catch (e) {}
    }
    return null;
  };
  const loadImage = (src) => new Promise((res) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  const buildTexture = async () => {
    let tex = null;
    const bmp = await bitmap(STRIP, true);
    if (bmp) { tex = new THREE.Texture(bmp); tex.flipY = false; }
    else { const im = await loadImage(STRIP); if (!im) return null; tex = new THREE.Texture(im); }
    tex.needsUpdate = true;
    tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
    /* карта яркости — 400×40 точек, читается мгновенно */
    const lumImg = (await bitmap(STRIP_LUM, false)) || (await loadImage(STRIP_LUM));
    if (lumImg) {
      const sm = document.createElement('canvas'); sm.width = LW; sm.height = LH;
      const sx = sm.getContext('2d'); sx.drawImage(lumImg, 0, 0, LW, LH);
      const d = sx.getImageData(0, 0, LW, LH).data;
      for (let i = 0; i < LW * LH; i++) lumMap[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255 * 0.96;
    } else lumMap.fill(BG);
    return tex;
  };

  /* пролёт камеры — одна непрерывная плавная траектория (сплайн Катмулла — Рома) через точки оригинала:
     спереди → сверху → вплотную сбоку → внутрь → спереди. Камера идёт по ней с ровной скоростью по длине пути,
     а там, где есть что рассмотреть (вид сверху и внутри цилиндра), плавно замедляется; весь пролёт — одной
     мягкой кривой разгона и торможения. Так нет ни остановок, ни рывков, ни всплесков скорости на стыках. */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const smoothstep = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const N = 600;                                                       // точность таблицы «время → место на пути»
  let path = null, aim = null, tau = null, key = null;
  const makePath = () => {
    const D = F.D;
    path = new THREE.CatmullRomCurve3([
      V(0, 0, D),                         // спереди, цилиндр во весь экран
      V(0, 5 * S, 5 * S),                 // сверху — цилиндр становится кольцом
      V(1.5 * S, 2 * S, 2 * S),           // вплотную сбоку
      V(0.5 * S, 0.02 * S, 0.8 * S),      // внутри
      V(-0.35 * S, 0.06 * S, 0.65 * S),   // внутри, медленный поворот взгляда
      V(0, 0, D)                          // снова спереди
    ], false, 'centripetal');
    path.arcLengthDivisions = 1200;
    aim = new THREE.CatmullRomCurve3([
      V(0, 0.42, 0), V(0, 0, 0), V(0, 0, 0), V(0, 0, 0), V(0, -0.1, 0), V(0, -0.62, 0)
    ], false, 'centripetal');
    /* скорость по пути: 1 — обычная, меньше — там, где хочется задержаться (плавно, без ступенек) */
    const speedAt = (pt) => {
      const r = Math.hypot(pt.x, pt.z);
      const inside = smoothstep(RADIUS * 1.9, RADIUS * 0.6, r) * smoothstep(HEIGHT * 2, 0, Math.abs(pt.y));   // широкие плавные края зоны
      const top = smoothstep(1.8 * S, 4.8 * S, pt.y);
      return 1 - 0.55 * inside - 0.4 * top;
    };
    /* таблица: доля пути s → доля времени; плюс ключевые места пути для заголовков */
    tau = new Float32Array(N + 1);
    let acc = 0, yMax = -1e9, sTop = 0, sIn = -1, sOut = 0;
    for (let i = 0; i <= N; i++) {
      const s = i / N, pt = path.getPointAt(s);
      if (i > 0) acc += (1 / N) / speedAt(pt);
      tau[i] = acc;
      if (pt.y > yMax) { yMax = pt.y; sTop = s; }
      if (Math.hypot(pt.x, pt.z) < RADIUS) { if (sIn < 0) sIn = s; sOut = s; }
    }
    for (let i = 0; i <= N; i++) tau[i] /= acc;
    const tAt = (s) => tau[Math.round(s * N)];
    key = { top: tAt(sTop), in: tAt(Math.max(0, sIn)), out: tAt(sOut) };
  };
  /* доля времени e (0…1) → доля пути s: обратная таблица, с интерполяцией — без ступенек */
  const sAt = (e) => {
    let lo = 0, hi = N;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tau[m] < e) lo = m; else hi = m; }
    const d = tau[hi] - tau[lo];
    const f = d > 0 ? Math.min(1, Math.max(0, (e - tau[lo]) / d)) : 0;
    return Math.min(1, Math.max(0, (lo + f) / N));                     // строго в пределах пути
  };
  makePath();
  const fly = { e: 0 };
  const place = () => {
    const s = sAt(Math.min(1, Math.max(0, fly.e))), c = path.getPointAt(s), l = aim.getPoint(path.getUtoTmapping(s));
    cam.x = c.x; cam.y = c.y; cam.z = c.z; look.y = l.y;
  };

  const scroll = { rot: 0 };
  const look = { y: 0 };                                               // куда смотрит камера по высоте
  const DUR = 17;                                                      // длительность пролёта, с — спокойно, но живее прежнего
  const HOLD = 1.2;                                                    // первый кадр стоит, чтобы прочитать заголовок
  /* кривая хода: мягкий разгон (первые 18% времени), ровный ход в середине, мягкое торможение — без всплеска скорости посередине */
  const R = 0.18;
  const glide = (t) => {
    const k = 1 - R, ramp = (x) => (x - R / Math.PI * Math.sin(Math.PI * x / R)) / 2;
    if (t <= 0) return 0; if (t >= 1) return 1;
    if (t < R) return ramp(t) / k;
    if (t > 1 - R) return 1 - ramp(1 - t) / k;
    return (R / 2 + (t - R)) / k;
  };
  /* момент, когда пролёт дойдёт до доли времени пути e (обратная к glide) */
  const atE = (e) => { let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (glide(m) < e) lo = m; else hi = m; } return HOLD + DUR * (lo + hi) / 2; };
  let tl = null, done = false;
  const build = () => {
    if (tl) tl.kill();
    fly.e = 0; place();
    scroll.rot = 0; done = false;
    gsap.set(steps, { autoAlpha: 0 });
    lines.forEach((s) => s.classList.remove('is-light'));
    tl = gsap.timeline({ paused: true, onComplete: () => { done = true; } });
    tl.to(fly, { e: 1, duration: DUR, ease: glide, onUpdate: place }, HOLD);
    tl.to(scroll, { rot: 12.57, duration: DUR, ease: glide }, HOLD);   // два плавных оборота за пролёт
    /* заголовки: вверху — на старте, в центре — пока виден кольцом сверху (внутри цилиндра текста нет — граница экранов
       прошла бы прямо по буквам), внизу с кнопкой — в конце и остаётся */
    const show = (el, a, b, stay) => {
      tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1, ease: 'power1.out' }, a);
      if (!stay) tl.to(el, { autoAlpha: 0, duration: 0.9, ease: 'power1.in' }, b - 0.9);
    };
    show(steps[0], 0.3, atE(key.top * 0.55));
    show(steps[1], atE(key.top * 0.7), atE(key.top + (key.in - key.top) * 0.95));   // только пока под ним чистый светлый фон кольца — до входа внутрь
    show(steps[2], atE(key.out + (1 - key.out) * 0.55), atE(1), true);
  };
  window.addEventListener('resize', () => { resize(); makePath(); place(); });

  let running = false, visible = false, raf = 0, lastT = 0, auto = 0.5, rotNow = 0.5, tick = 0;
  /* читаемость: на светлом — тёмный текст, на тёмном — светлый. Что лежит под каждой строкой, считаем, а не читаем
     с видеокарты (чтение пикселей останавливало отрисовку и давало подлагивания): из камеры через точки строки
     пускаем лучи; попал луч в цилиндр — берём яркость этого места экрана сайта по маленькой карте, не попал — там
     светлый фон страницы. */
  const BG = 0.9;                                                      // яркость светлого фона страницы
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), nrm = new THREE.Vector3();
  let rects = null;
  const measure = () => { const cr = canvas.getBoundingClientRect(); rects = { cr, lines: lines.map((s) => s.getBoundingClientRect()) }; };
  window.addEventListener('resize', () => { rects = null; });
  const lumUnder = (cx, cy) => {
    const cr = rects.cr;
    ndc.set((cx - cr.left) / cr.width * 2 - 1, -((cy - cr.top) / cr.height * 2 - 1));
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(cylinder, false)[0];
    if (!hit || !hit.uv) return BG;
    nrm.copy(hit.face.normal).transformDirection(cylinder.matrixWorld);
    const front = nrm.dot(ray.ray.direction) < 0;                      // как в шейдере: снаружи лента отражена по горизонтали
    let u = front ? 1 - hit.uv.x : hit.uv.x; u = u - Math.floor(u);
    const x = Math.min(LW - 1, Math.floor(u * LW)), y = Math.min(LH - 1, Math.max(0, Math.floor((1 - hit.uv.y) * LH)));
    return lumMap[y * LW + x];
  };
  const contrast = () => {
    if (!rects) measure();
    lines.forEach((s, k) => {
      const step = s.closest('.final__step');
      if ((parseFloat(step.style.opacity) || 0) < 0.05) return;        // строка не видна — не считаем
      const r = rects.lines[k];
      let dark = 0, n = 0;
      for (let iy = 0; iy < 3; iy++) for (let ix = 0; ix < 9; ix++) {
        if (lumUnder(r.left + r.width * (ix + 0.5) / 9, r.top + r.height * (iy + 0.5) / 3) < 0.5) dark++;
        n++;
      }
      /* смешанный фон (светлые и тёмные места): решают тёмные места — если их хотя бы треть, текст светлый */
      const f = dark / n, light = s.classList.contains('is-light');
      if (!light && f > 0.33) s.classList.add('is-light');
      else if (light && f < 0.2) s.classList.remove('is-light');     // с запасом, чтобы не мигал
    });
  };
  const frame = (now) => {
    raf = 0;
    const dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0; lastT = now;
    if (!reduce) auto += SPIN * dt;
    /* вращение плавно догоняет цель — никаких рывков */
    const rot = auto + scroll.rot, prevRot = rotNow;
    rotNow += (rot - rotNow) * (reduce ? 1 : 0.06);
    const vel = rotNow - prevRot;
    cylinder.rotation.y = rotNow;
    camera.position.set(cam.x, cam.y, cam.z);
    camera.lookAt(0, look.y, 0);
    const speed = Math.abs(vel) * 100;
    particles.forEach((p) => {
      const target = Math.min(Math.max(0, speed - 0.12) * 3, 0.75);
      p.material.opacity += (target - p.material.opacity) * 0.06;   // дуги проявляются и тают мягко
      if (vel !== 0) { p.userData.base += vel * p.userData.speed * 1.5; p.userData.place(); }
    });
    renderer.render(scene, camera);
    if (++tick % 10 === 0) contrast();
    if (running) raf = requestAnimationFrame(frame);
  };
  const start = () => {
    if (running || !cylinder.visible) return;
    running = true; lastT = 0; raf = requestAnimationFrame(frame);
    if (reduce) { tl.progress(1); return; }
    if (done) build();                                                 // вернулись к странице после показа — показ заново
    tl.play();
  };
  const stop = () => { running = false; cancelAnimationFrame(raf); raf = 0; if (tl) tl.pause(); };

  let loading = false;
  const setup = () => {
    if (loading) return; loading = true;
    buildTexture().then(async (tex) => {
      if (!tex) { gsap.set(steps[steps.length - 1], { autoAlpha: 1 }); return; }
      mat.uniforms.tMap.value = tex;
      /* загрузка текстуры и сборка шейдера на видеокарте — заранее, в свободную минуту: иначе первый кадр
         страницы застывал на десятую долю секунды */
      await pause(); renderer.initTexture(tex);
      await pause(); cylinder.visible = true; renderer.compile(scene, camera);
      build();
      if (visible) start();
    });
  };

  gsap.set(steps, { autoAlpha: 0 });
  new IntersectionObserver((en) => { if (en[0].isIntersecting) setup(); }, { rootMargin: '250% 0px' }).observe(sec);
  /* показ начинается, когда страница открыта больше чем наполовину */
  new IntersectionObserver((en) => { visible = en[0].intersectionRatio > 0.5; if (visible) start(); else stop(); }, { threshold: [0, 0.5, 1] }).observe(sec);
  /* досмотрели и ушли — сцена тихо возвращается к началу, пока её совсем не видно; при возвращении показ начнётся без скачка */
  new IntersectionObserver((en) => { if (!en[0].isIntersecting && done && cylinder.visible) build(); }, { threshold: 0 }).observe(sec);
}
