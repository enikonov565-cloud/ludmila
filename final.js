/* Последняя страница — «Cinematic 3D Scroll Experiences with GSAP», демо 1 (codrops, Joseph Santamaria),
   переписано без React и OGL, на three.js сайта. Главные экраны пяти сайтов склеены в одну ленту и натянуты
   на цилиндр (в своих пропорциях, без растяжения). Прокрутка ведёт камеру, как в оригинале: подлёт спереди →
   взгляд сверху → облёт вплотную → внутрь цилиндра → отход; цилиндр всё это время вращается. Пока он крутится,
   вокруг появляются тонкие дуги-«частицы» (на светлом фоне — фирменные бирюзовые). Изнутри экраны читаются
   не зеркально. В конце проявляется кнопка «Связаться со мной». Кадры считаются, только пока страница на экране. */
import * as THREE from 'three';

const sec = document.querySelector('[data-final]');
if (sec && window.gsap && window.ScrollTrigger) init();

function init() {
  const gsap = window.gsap;
  const stage = sec.querySelector('.final__stage');
  const canvas = sec.querySelector('.final__gl');
  const cta = sec.querySelector('.final__cta');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const IMAGES = ['niko', 'floris', 'theatre', 'lisa', 'mebel'].map((n) => 'img/final/' + n + '.webp');
  const CELL = { w: 1920, h: 980 };                                   // пропорции одного экрана на ленте
  const RADIUS = 2.5;
  const HEIGHT = (2 * Math.PI * RADIUS) * CELL.h / (CELL.w * IMAGES.length);   // высота — чтобы экраны не растягивались

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
  catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 100);
  const isMobile = () => window.innerWidth < 768;
  const dims = () => {
    const w = window.innerWidth, m = w < 768, t = w >= 768 && w < 1024;
    return { scale: (m ? 1.8 : t ? 2.2 : 2.5) / RADIUS, camZ: m ? 6 : t ? 7 : 8, fov: m ? 50 : 45 };
  };
  let D = dims();
  const cam = { x: 0, y: 0, z: D.camZ };

  /* цилиндр: развёртка по углу, u растёт так, чтобы снаружи экраны читались слева направо */
  const SEG = 96;
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
    uniforms: { tMap: { value: null }, uDarkness: { value: 0.06 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    /* изнутри (обратная сторона) лента отражается — чтобы надписи на экранах не были зеркальными */
    fragmentShader: `uniform sampler2D tMap; uniform float uDarkness; varying vec2 vUv;
      void main(){ vec2 st = gl_FrontFacing ? vec2(1.0 - vUv.x, vUv.y) : vUv; vec4 t = texture2D(tMap, st); t.rgb *= (1.0 - uDarkness); gl_FragColor = t;
      #include <colorspace_fragment>
      }`
  });
  const cylinder = new THREE.Mesh(geo, mat);
  cylinder.rotation.y = 0.5;
  cylinder.visible = false;
  scene.add(cylinder);

  /* дуги-«частицы» над и под цилиндром — видны, пока он крутится */
  const PCOUNT = 12, PSEG = 20, PSPAN = 0.3, PRAD = RADIUS + 0.8;
  const particles = [];
  for (let i = 0; i < PCOUNT; i++) {
    const start = (i / PCOUNT) * Math.PI * 2;
    const top = i < PCOUNT / 2;
    const y = top ? HEIGHT * 0.7 + Math.random() * HEIGHT * 0.3 : -HEIGHT + Math.random() * HEIGHT * 0.3;
    const arr = new Float32Array((PSEG + 1) * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const m = new THREE.LineBasicMaterial({ color: 0x2F4B52, transparent: true, opacity: 0 });
    const line = new THREE.Line(g, m);
    line.userData = { base: start, y, speed: 0.5 + Math.random() };
    const place = () => { for (let j = 0; j <= PSEG; j++) { const a = line.userData.base + PSPAN * j / PSEG; arr[j * 3] = Math.cos(a) * PRAD; arr[j * 3 + 1] = y; arr[j * 3 + 2] = Math.sin(a) * PRAD; } g.attributes.position.needsUpdate = true; };
    place(); line.userData.place = place;
    scene.add(line); particles.push(line);
  }

  const resize = () => {
    const w = stage.clientWidth || window.innerWidth, hgt = stage.clientHeight || window.innerHeight;
    D = dims();
    renderer.setSize(w, hgt, false);
    camera.fov = D.fov; camera.aspect = w / hgt; camera.updateProjectionMatrix();
    cylinder.scale.setScalar(D.scale);
    particles.forEach((p) => p.scale.setScalar(D.scale));
  };
  resize();
  window.addEventListener('resize', resize);

  /* лента из пяти экранов — одна текстура */
  const buildTexture = (imgs) => {
    const maxTex = renderer.capabilities.maxTextureSize || 4096;
    const limit = isMobile() ? Math.min(maxTex, 4096) : Math.min(maxTex, 8192);
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
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
    return tex;
  };

  let running = false, visible = false, raf = 0, lastRot = cylinder.rotation.y;
  const frame = () => {
    raf = 0;
    camera.position.set(cam.x, cam.y, cam.z);
    camera.lookAt(0, 0, 0);
    const vel = cylinder.rotation.y - lastRot; lastRot = cylinder.rotation.y;
    const spinning = Math.abs(vel) > 0.0001, speed = Math.abs(vel) * 100;
    particles.forEach((p) => {
      const target = spinning ? Math.min(speed * 3, 0.85) : 0;
      p.material.opacity += (target - p.material.opacity) * 0.15;
      if (spinning) { p.userData.base += vel * p.userData.speed * 1.5; p.userData.place(); }
    });
    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(frame);
  };
  const start = () => { if (running || !cylinder.visible) return; running = true; raf = requestAnimationFrame(frame); };
  const stop = () => { running = false; cancelAnimationFrame(raf); raf = 0; };

  const load = (src) => new Promise((res) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  let loading = false;
  const setup = () => {
    if (loading) return; loading = true;
    Promise.all(IMAGES.map(load)).then((imgs) => {
      imgs = imgs.filter(Boolean);
      if (!imgs.length) return;
      mat.uniforms.tMap.value = buildTexture(imgs);
      cylinder.visible = true;

      /* камера и вращение — по прокрутке, как в оригинале (тайминги и кривые оттуда же) */
      gsap.registerPlugin(window.ScrollTrigger);
      const silk = 'power1.inOut', flow = 'power2.out', lin = 'sine.inOut', smooth = 'power2.inOut';
      const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: reduce ? true : 1, refreshPriority: -10 } });   // считается после закреплённых блоков выше
      tl.to(cam, { x: 0, y: 0, z: D.camZ, duration: 1, ease: silk })
        .to(cam, { x: 0, y: 5, z: 5, duration: 1, ease: flow })
        .to(cam, { x: 1.5, y: 2, z: 2, duration: 2, ease: lin })
        .to(cam, { x: 0.5, y: 0, z: 0.8, duration: 3.5, ease: 'power1.inOut' })
        .to(cam, { x: -6, y: -1, z: D.camZ, duration: 1, ease: smooth });
      tl.to(cylinder.rotation, { y: '+=28.27', duration: 8.5, ease: 'none' }, 0);
      /* кнопка — на последнем отрезке, когда камера отошла */
      gsap.set(cta, { xPercent: -50, translate: 'none' });           // центр по горизонтали — через GSAP, иначе он сбрасывает CSS translate
      tl.fromTo(cta, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 7.9);
      window.ScrollTrigger.refresh();
      if (visible) start(); else frame();
    });
  };

  new IntersectionObserver((en) => { if (en[0].isIntersecting) setup(); }, { rootMargin: '150% 0px' }).observe(sec);
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) start(); else stop(); }, { threshold: 0 }).observe(sec);
}
