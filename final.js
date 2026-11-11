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
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const IMAGES = ['niko', 'floris', 'theatre', 'lisa', 'mebel'].map((n) => 'img/final/' + n + '.webp');
  const LAPS = 1;
  const CELL = { w: 1920, h: 980 };
  const RADIUS = 2.5;                                                 // как в оригинале
  const HEIGHT = (2 * Math.PI * RADIUS) * CELL.h / (CELL.w * IMAGES.length * LAPS);
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

  const buildTexture = (imgs) => {
    const maxTex = renderer.capabilities.maxTextureSize || 4096;
    const limit = F.mobile ? Math.min(maxTex, 4096) : Math.min(maxTex, 8192);
    const k = Math.min(1, limit / (CELL.w * imgs.length));
    const cv = document.createElement('canvas');
    cv.width = Math.floor(CELL.w * imgs.length * k); cv.height = Math.floor(CELL.h * k);
    const ctx = cv.getContext('2d');
    imgs.forEach((im, i) => { const x0 = Math.floor(i / imgs.length * cv.width), x1 = Math.floor((i + 1) / imgs.length * cv.width); ctx.drawImage(im, x0, 0, x1 - x0, cv.height); });
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
    return tex;
  };

  /* кривые оригинала (CustomEase) */
  const bez = (p1x, p1y, p2x, p2y) => (t) => {
    let lo = 0, hi = 1, m, x;
    for (let i = 0; i < 18; i++) { m = (lo + hi) / 2; x = 3 * (1 - m) * (1 - m) * m * p1x + 3 * (1 - m) * m * m * p2x + m * m * m; if (x < t) lo = m; else hi = m; }
    m = (lo + hi) / 2; return 3 * (1 - m) * (1 - m) * m * p1y + 3 * (1 - m) * m * m * p2y + m * m * m;
  };
  const flow = bez(0.33, 0, 0.2, 1), lin = bez(0.4, 0, 0.6, 1);

  const scroll = { rot: 0 };
  const look = { y: 0 };                                               // куда смотрит камера по высоте
  const T = 2.4;                                                       // секунд на единицу длительности оригинала
  const HOLD = 1.4;                                                    // первый кадр стоит, чтобы прочитать заголовок
  let tl = null, done = false;
  /* пролёт камеры — сам, без прокрутки и мыши: точки и кривые оригинала, заголовки этапов меняются по ходу пролёта */
  const build = () => {
    if (tl) tl.kill();
    const D = F.D, far = D;
    Object.assign(cam, { x: 0, y: 0, z: far });
    look.y = 0.42;                                                     // на старте цилиндр чуть ниже центра — над ним заголовок
    scroll.rot = 0; done = false;
    gsap.set(steps, { autoAlpha: 0 });
    steps.forEach((s) => s.classList.remove('is-light'));
    const at = (u) => HOLD + u * T;
    tl = gsap.timeline({ paused: true, onComplete: () => { done = true; } });
    tl.to(cam, { x: 0, y: 5 * S, z: 5 * S, duration: 1 * T, ease: flow }, at(0))
      .to(look, { y: 0, duration: 1 * T, ease: flow }, '<')
      .to(cam, { x: 1.5 * S, y: 2 * S, z: 2 * S, duration: 2 * T, ease: lin })
      .to(cam, { x: 0.5 * S, y: 0, z: 0.8 * S, duration: 3.5 * T, ease: 'power1.inOut' })
      /* выход — спокойный отъезд назад, без рывка: камера встаёт прямо, цилиндр снова во весь экран
         и чуть выше центра, под ним — финальный текст и кнопка */
      .to(cam, { x: 0, y: 0, z: far, duration: 2 * T, ease: 'sine.inOut' })
      .to(look, { y: -0.62, duration: 2 * T, ease: 'sine.inOut' }, '<');
    tl.to(scroll, { rot: 12.57, duration: 8.5 * T, ease: 'power1.inOut' }, at(0));   // два плавных оборота за пролёт
    /* заголовки: вверху — на старте, в центре — сверху и внутри, внизу с кнопкой — в конце и остаётся */
    const show = (el, a, b, stay) => {
      tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.9, ease: 'power1.out' }, a);
      if (!stay) tl.to(el, { autoAlpha: 0, duration: 0.8, ease: 'power1.in' }, b - 0.8);
    };
    show(steps[0], 0.3, at(0.8));
    show(steps[1], at(1.1), at(6.9));
    show(steps[2], at(7.8), at(8.5), true);
  };
  window.addEventListener('resize', () => { resize(); if (done) { Object.assign(cam, { x: 0, y: 0, z: F.D }); look.y = -0.62; } });

  let running = false, visible = false, raf = 0, lastT = 0, auto = 0.5, rotNow = 0.5, tick = 0;
  /* читаемость: под каждым видимым заголовком меряем яркость того, что сейчас нарисовано (экраны сайтов или светлый фон).
     На светлом — тёмный текст, на тёмном — светлый. Пиксели читаются сразу после отрисовки кадра. */
  const gl = renderer.getContext(), px = new Uint8Array(4), BG = 0.9;   // яркость светлого фона страницы
  const contrast = () => {
    const cr = canvas.getBoundingClientRect(), kx = canvas.width / cr.width, ky = canvas.height / cr.height;
    steps.forEach((s) => {
      if (parseFloat(getComputedStyle(s).opacity) < 0.05) return;
      const r = s.querySelector('.final__title').getBoundingClientRect();
      let dark = 0, n = 0;
      for (let iy = 0; iy < 5; iy++) for (let ix = 0; ix < 11; ix++) {
        const x = Math.round((r.left + r.width * (ix + 0.5) / 11 - cr.left) * kx);
        const y = Math.round(canvas.height - (r.top + r.height * (iy + 0.5) / 5 - cr.top) * ky);
        if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) continue;
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const a = px[3] / 255, lum = (0.2126 * px[0] + 0.7152 * px[1] + 0.0722 * px[2]) / 255 + (1 - a) * BG;   // цвет уже умножен на прозрачность
        if (lum < 0.5) dark++;
        n++;
      }
      if (!n) return;
      /* смешанный фон (светлые и тёмные места): решают тёмные места — если их хотя бы треть, текст светлый с мягким тёмным ореолом */
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
    if (++tick % 8 === 0) contrast();
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

  const load = (src) => new Promise((res) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  let loading = false;
  const setup = () => {
    if (loading) return; loading = true;
    Promise.all(IMAGES.map(load)).then((imgs) => {
      imgs = imgs.filter(Boolean);
      if (!imgs.length) { gsap.set(steps[steps.length - 1], { autoAlpha: 1 }); return; }
      mat.uniforms.tMap.value = buildTexture(imgs);
      cylinder.visible = true;
      build();
      if (visible) start();
    });
  };

  gsap.set(steps, { autoAlpha: 0 });
  new IntersectionObserver((en) => { if (en[0].isIntersecting) setup(); }, { rootMargin: '150% 0px' }).observe(sec);
  /* показ начинается, когда страница открыта больше чем наполовину */
  new IntersectionObserver((en) => { visible = en[0].intersectionRatio > 0.5; if (visible) start(); else stop(); }, { threshold: [0, 0.5, 1] }).observe(sec);
}
