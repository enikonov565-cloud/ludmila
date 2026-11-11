/* Последняя страница — по мотивам «Cinematic 3D Scroll Experiences with GSAP», демо 1 (codrops, Joseph Santamaria),
   переписано без React и OGL, на three.js сайта. Главные экраны пяти сайтов натянуты на цилиндр в своих пропорциях,
   без растяжения. Чтобы цилиндр был широким, как в образце, лента идёт по кругу дважды: спереди всегда видны пять
   разных экранов, повтор — на обратной стороне. Цилиндр вращается сам, без прокрутки. Сценарий: камера подлетает,
   крупный цилиндр крутится перед зрителем → камера поднимается, цилиндр становится кольцом, и в его центре
   проявляются заголовок, подзаголовок и кнопка. Пока цилиндр крутится, вокруг него видны тонкие фирменные дуги.
   Изнутри экраны читаются не зеркально. Кадры считаются, только пока страница на экране. */
import * as THREE from 'three';

const sec = document.querySelector('[data-final]');
if (sec && window.gsap) init();

function init() {
  const gsap = window.gsap;
  const stage = sec.querySelector('.final__stage');
  const canvas = sec.querySelector('.final__gl');
  const text = sec.querySelectorAll('.final__title .story__reveal, .final__sub, .final__cta');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const IMAGES = ['niko', 'floris', 'theatre', 'lisa', 'mebel'].map((n) => 'img/final/' + n + '.webp');
  const LAPS = 2;                                                      // лента по кругу дважды — широкий цилиндр
  const CELL = { w: 1920, h: 980 };                                   // пропорции одного экрана
  const RADIUS = 5;
  const HEIGHT = (2 * Math.PI * RADIUS) * CELL.h / (CELL.w * IMAGES.length * LAPS);   // без растяжения
  const SPIN = 0.16;                                                   // радиан в секунду — оборот примерно за 40 с

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
  catch (e) { gsap.set(text, { autoAlpha: 1 }); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 200);

  /* расстояние камеры: цилиндр спереди занимает ~88% ширины экрана (на телефоне — шире экрана) */
  const fit = () => {
    const w = stage.clientWidth || window.innerWidth, h = stage.clientHeight || window.innerHeight;
    const aspect = w / h, mobile = aspect < 1;
    const fov = mobile ? 50 : 45;
    const th = Math.tan(fov * Math.PI / 360) * aspect;
    const k = mobile ? 2.2 : 0.88;
    const D = RADIUS / Math.sin(Math.atan(k * th));
    return { fov, aspect, D, w, h, mobile };
  };
  let F = fit();
  /* положения камеры: далеко → спереди крупно → сверху (кольцо, в центре — текст) */
  const views = () => ({
    far: { x: 0, y: 0, z: F.D * 1.9 },
    front: { x: 0, y: 0, z: F.D },
    top: F.mobile ? { x: 0, y: F.D * 1.1, z: F.D * 0.6 } : { x: 0, y: F.D * 0.72, z: F.D * 0.98 }
  });
  const cam = Object.assign({}, views().far);
  let stageName = 'far';

  /* цилиндр: развёртка по углу */
  const SEG = 160;
  const pos = [], uv = [], idx = [];
  for (let y = 0; y <= 1; y++) {
    for (let x = 0; x <= SEG; x++) {
      const u = x / SEG, th = -u * Math.PI * 2;
      pos.push(Math.cos(th) * RADIUS, (y - 0.5) * HEIGHT, Math.sin(th) * RADIUS);
      uv.push(u, y);
    }
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
    /* лента повторяется по кругу uLaps раз; изнутри отражается, чтобы надписи на экранах не были зеркальными */
    fragmentShader: `uniform sampler2D tMap; uniform float uDarkness; uniform float uLaps; varying vec2 vUv;
      void main(){ vec2 st = gl_FrontFacing ? vec2(1.0 - vUv.x, vUv.y) : vUv; st.x = fract(st.x * uLaps);
        vec4 t = texture2D(tMap, st); t.rgb *= (1.0 - uDarkness); gl_FragColor = t;
        #include <colorspace_fragment>
      }`
  });
  const cylinder = new THREE.Mesh(geo, mat);
  cylinder.rotation.y = 0.5;
  cylinder.visible = false;
  scene.add(cylinder);

  /* дуги-«частицы» над и под цилиндром — видны, пока он крутится */
  const PCOUNT = 16, PSEG = 24, PSPAN = 0.22, PRAD = RADIUS + 0.9;
  const particles = [];
  for (let i = 0; i < PCOUNT; i++) {
    const start = (i / PCOUNT) * Math.PI * 2;
    const top = i < PCOUNT / 2;
    const y = top ? HEIGHT * 0.7 + Math.random() * HEIGHT * 0.3 : -HEIGHT + Math.random() * HEIGHT * 0.3;
    const arr = new Float32Array((PSEG + 1) * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const m = new THREE.LineBasicMaterial({ color: 0x2F4B52, transparent: true, opacity: 0 });
    const line = new THREE.Line(g, m);
    line.userData = { base: start, speed: 0.5 + Math.random() };
    line.userData.place = () => { for (let j = 0; j <= PSEG; j++) { const a = line.userData.base + PSPAN * j / PSEG; arr[j * 3] = Math.cos(a) * PRAD; arr[j * 3 + 1] = y; arr[j * 3 + 2] = Math.sin(a) * PRAD; } g.attributes.position.needsUpdate = true; };
    line.userData.place();
    scene.add(line); particles.push(line);
  }

  const resize = () => {
    F = fit();
    renderer.setSize(F.w, F.h, false);
    camera.fov = F.fov; camera.aspect = F.aspect; camera.updateProjectionMatrix();
    if (!gsap.isTweening(cam)) Object.assign(cam, views()[stageName]);   // на смене размера — то же положение
  };
  resize();
  window.addEventListener('resize', resize);

  /* лента из пяти экранов — одна текстура */
  const buildTexture = (imgs) => {
    const maxTex = renderer.capabilities.maxTextureSize || 4096;
    const limit = F.mobile ? Math.min(maxTex, 4096) : Math.min(maxTex, 8192);
    const k = Math.min(1, limit / (CELL.w * imgs.length));
    const cv = document.createElement('canvas');
    cv.width = Math.floor(CELL.w * imgs.length * k); cv.height = Math.floor(CELL.h * k);
    const ctx = cv.getContext('2d');
    imgs.forEach((im, i) => {
      const x0 = Math.floor(i / imgs.length * cv.width), x1 = Math.floor((i + 1) / imgs.length * cv.width);
      ctx.drawImage(im, x0, 0, x1 - x0, cv.height);
    });
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
    return tex;
  };

  let running = false, visible = false, raf = 0, lastT = 0;
  const frame = (now) => {
    raf = 0;
    const dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0; lastT = now;
    const vel = reduce ? 0 : SPIN * dt;
    cylinder.rotation.y += vel;
    camera.position.set(cam.x, cam.y, cam.z);
    camera.lookAt(0, 0, 0);
    particles.forEach((p) => {
      const target = vel > 0 ? 0.45 : 0;
      p.material.opacity += (target - p.material.opacity) * 0.05;
      if (vel > 0) { p.userData.base += vel * p.userData.speed * 1.5; p.userData.place(); }
    });
    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(frame);
  };
  const start = () => { if (running || !cylinder.visible) return; running = true; lastT = 0; raf = requestAnimationFrame(frame); };
  const stop = () => { running = false; cancelAnimationFrame(raf); raf = 0; };

  /* сценарий показа — один раз, при первом появлении страницы */
  let played = false;
  const play = () => {
    if (played) return; played = true;
    if (reduce) { stageName = 'top'; Object.assign(cam, views().top); gsap.set(text, { autoAlpha: 1 }); return; }
    const v = views();
    const tl = gsap.timeline();
    tl.to(cam, { x: v.front.x, y: v.front.y, z: v.front.z, duration: 2.6, ease: 'power3.out', onComplete: () => { stageName = 'front'; } })
      .to(cam, { x: v.top.x, y: v.top.y, z: v.top.z, duration: 2.8, ease: 'power2.inOut', onComplete: () => { stageName = 'top'; } }, '+=3.2')
      .fromTo(text, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.18, ease: 'power3.out' }, '-=1.1');
  };

  const load = (src) => new Promise((res) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  let loading = false, ready = false;
  const setup = () => {
    if (loading) return; loading = true;
    Promise.all(IMAGES.map(load)).then((imgs) => {
      imgs = imgs.filter(Boolean);
      if (!imgs.length) { gsap.set(text, { autoAlpha: 1 }); return; }
      mat.uniforms.tMap.value = buildTexture(imgs);
      cylinder.visible = true; ready = true;
      if (visible) { play(); start(); }
    });
  };

  gsap.set(text, { autoAlpha: 0 });
  new IntersectionObserver((en) => { if (en[0].isIntersecting) setup(); }, { rootMargin: '150% 0px' }).observe(sec);
  new IntersectionObserver((en) => {
    visible = en[0].isIntersecting;
    if (visible && ready) { play(); start(); } else if (!visible) stop();
  }, { threshold: 0.35 }).observe(sec);
}
