/* Блок «Мой путь»: 3D-ноутбук на тёмно-зелёном фоне сайта.
   Модель — MacBook из демо repalash/threepipe-device-mockup-codrops (MIT; модель с Sketchfab),
   вынута из сцены и ужата до ~230 КБ (draco + webp). Отрисовка — three.js.

   Сцена идёт сама, по времени (не по прокрутке), когда блок появился на экране:
   1. «30 лет я учила людей понимать сложное»; за ноутбуком в полутоне — «Тогда»;
      на экране — карточка из макета: фото с детьми и белая плашка с текстом (время на чтение);
   2. ноутбук поворачивается на 180° — спиной к зрителю — и уходит влево,
      а за ним справа налево открывается полноэкранное фото «Сейчас»;
   3. «Теперь я делаю это визуально.», в полутоне — «Сейчас»; плашки появляются по одной, с паузами на чтение. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const section = document.querySelector('.story');
const canvas = section && section.querySelector('.story__gl');
const gsap = window.gsap;
if (section && canvas && gsap) init();

function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

/* текстура экрана — как карточка в макете «п-р10»: фото сверху, белая плашка с тёмным текстом внизу */
function screenTexture(img, caption) {
  const W = 1600, H = 1000;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
  const ph = caption ? 600 : H;                       // фото — верхние 60% экрана
  const s = Math.max(W / img.width, ph / img.height);
  const iw = img.width * s, ih = img.height * s;
  g.save(); g.beginPath(); g.roundRect(0, 0, W, ph, caption ? [0, 0, 40, 40] : 0); g.clip();
  g.drawImage(img, (W - iw) / 2, (ph - ih) / 2 - ph * 0.08, iw, ih); g.restore();
  if (caption) {
    g.fillStyle = '#191919';
    g.font = '400 64px Inter, sans-serif';
    const words = caption.split(' '), lines = []; let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > W - 200) { lines.push(line); line = w; } else line = t; }
    lines.push(line);
    const lh = 78, y0 = ph + (H - ph - lines.length * lh) / 2 + 58;
    lines.forEach((l, i) => g.fillText(l, 100, y0 + i * lh));
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

async function init() {
  const stacked = window.matchMedia('(max-width: 1000px), (max-aspect-ratio: 7/5)').matches;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { section.classList.add('no-gl'); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, stacked ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(0xffe7cc, 1.1); key.position.set(3, 5, 4); scene.add(key);
  /* столешница фирменного тёмно-зелёного цвета, стоит наискосок: дальний край идёт по диагонали
     снизу слева вверх направо; за ним — фон блока. Без серых отражений окружения */
  scene.fog = new THREE.Fog(0x10262B, 6, 22);
  const deskGeo = new THREE.PlaneGeometry(40, 8); deskGeo.translate(0, -2.1, 0); // дальний край — в 1,9 за ноутбуком
  const desk = new THREE.Mesh(deskGeo, new THREE.MeshStandardMaterial({ color: 0x2E6470, roughness: 0.75, metalness: 0, envMapIntensity: 0.25 }));
  desk.rotation.set(-Math.PI / 2, 0.6, 0, 'YXZ'); scene.add(desk);
  /* мягкая тень под ноутбуком */
  const sh = document.createElement('canvas'); sh.width = sh.height = 256;
  const sg = sh.getContext('2d'); const rg = sg.createRadialGradient(128, 128, 10, 128, 128, 128);
  rg.addColorStop(0, 'rgba(0,0,0,.75)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); sg.fillStyle = rg; sg.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sh), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; scene.add(shadow);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);

  const draco = new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const [gltf, pastImg, vaseTex] = await Promise.all([
    loader.loadAsync('models/macbook.glb'),
    loadImage('img/story/past-screen.jpg'),
    new THREE.TextureLoader().loadAsync('img/story/vase.webp'),
  ]);
  if (document.fonts && document.fonts.ready) await document.fonts.ready;

  /* ноутбук в «поворотной» группе, центр — по середине экрана */
  const laptop = gltf.scene;
  const box = new THREE.Box3().setFromObject(laptop);
  const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  const k = 2.2 / Math.max(size.x, size.z);
  laptop.scale.setScalar(laptop.scale.x * k);
  const box2 = new THREE.Box3().setFromObject(laptop);
  const c2 = box2.getCenter(new THREE.Vector3());
  laptop.position.x -= c2.x; laptop.position.z -= c2.z; laptop.position.y -= box2.min.y; // низ корпуса — на столе
  const turn = new THREE.Group(); turn.add(laptop); scene.add(turn);

  /* ваза с белыми цветами на столе справа — немного оживляет интерьер */
  vaseTex.colorSpace = THREE.SRGBColorSpace;
  const vaseGeo = new THREE.PlaneGeometry(1.25 * 408 / 557, 1.25); vaseGeo.translate(0, 0.625, 0);
  const vase = new THREE.Mesh(vaseGeo, new THREE.MeshBasicMaterial({ map: vaseTex, transparent: true, alphaTest: 0.05, color: 0xd9d4cb }));
  scene.add(vase);
  const vaseShadow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshBasicMaterial({ map: shadow.material.map, transparent: true, depthWrite: false, opacity: 0.8 }));
  vaseShadow.rotation.x = -Math.PI / 2; vaseShadow.position.y = 0.003; scene.add(vaseShadow);

  /* крышка: открываем как в демо (состояние «open») */
  const lid = laptop.getObjectByName('Bevels_2');
  if (lid) lid.quaternion.set(-0.7833, 0, 0, 0.6216);

  /* экран: свой материал со «светящейся» картинкой */
  const screenMesh = laptop.getObjectByName('Object_7');
  const texPast = screenTexture(pastImg, 'Педагог дошкольного образования делает понятным хаотичный мир для тех, кто ещё не умеет читать');
  /* после поворота экран пустой: тёмный, с мягким тёплым свечением — из него открывается фото «Сейчас» */
  const glow = document.createElement('canvas'); glow.width = 800; glow.height = 500;
  const gg = glow.getContext('2d');
  const grd = gg.createRadialGradient(400, 250, 20, 400, 250, 470);
  grd.addColorStop(0, '#6B5444'); grd.addColorStop(.55, '#24302F'); grd.addColorStop(1, '#0B1416');
  gg.fillStyle = grd; gg.fillRect(0, 0, 800, 500);
  const texNow = new THREE.CanvasTexture(glow); texNow.colorSpace = THREE.SRGBColorSpace;
  [texPast, texNow].forEach(t => { t.flipY = true; });
  const screenMat = new THREE.MeshBasicMaterial({ map: texPast, toneMapped: false });
  if (screenMesh) screenMesh.material = screenMat;

  /* точка, в которую наезжает камера — центр экрана в мире */
  const screenTarget = new THREE.Vector3();
  const updateScreenTarget = () => {
    if (!screenMesh) return screenTarget.set(0, 0.4, 0);
    screenMesh.updateWorldMatrix(true, false);
    new THREE.Box3().setFromObject(screenMesh).getCenter(screenTarget);
  };

  const state = { spin: 0, zoom: 0, slide: 0, swapped: false };
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    render();
  };
  const camFar = new THREE.Vector3(), camNear = new THREE.Vector3(), look = new THREE.Vector3();
  function render() {
    turn.rotation.y = Math.PI - 0.12 + state.spin * Math.PI * 2; // модель смотрит назад — разворачиваем к зрителю
    turn.rotation.x = 0;
    /* slide: развёрнутый ноутбук уезжает влево за край кадра */
    turn.position.set(-state.slide * (camera.aspect < 1.2 ? 4.5 : 7), 0, 0); // по центру; развёрнутый уходит влево
    shadow.position.x = turn.position.x;
    /* смена картинки, когда ноутбук повернулся спиной */
    const showNow = state.spin > 0.5;
    if (showNow !== state.swapped) { screenMat.map = showNow ? texNow : texPast; screenMat.needsUpdate = true; state.swapped = showNow; }
    updateScreenTarget();
    const portrait = camera.aspect < 1.2;
    vase.position.set(portrait ? 0.95 : 1.8, 0, portrait ? -1.5 : -1.1);
    vaseShadow.position.set(vase.position.x, 0.003, vase.position.z);
    camFar.set(0, portrait ? 2.1 : 1.35, portrait ? 4.9 / Math.max(0.42, camera.aspect) : 4.6); // камера ближе — экран крупный, текст читается
    const dist = camFar.length(); scene.fog.near = dist + 1; scene.fog.far = dist + 16; // дальний правый край стола мягко уходит в фон
    camNear.set(screenTarget.x, screenTarget.y, screenTarget.z + 0.62);
    camera.position.lerpVectors(camFar, camNear, state.zoom);
    look.set(0, portrait ? 0.95 : 1.02, 0).lerp(screenTarget, Math.min(1, Math.max(0, state.zoom) * 1.4)); // ноутбук ниже заголовка
    camera.lookAt(look);
    vase.rotation.y = Math.atan2(camera.position.x - vase.position.x, camera.position.z - vase.position.z); // ваза всегда лицом к зрителю
    renderer.render(scene, camera);
  }
  window.addEventListener('resize', resize);
  resize();
  section.classList.add('gl-ready');

  /* сцена идёт сама, по времени — с паузами на чтение; запускается, когда блок почти целиком на экране */
  const q = s => section.querySelector(s), qa = s => section.querySelectorAll(s);
  const READ = 0.07;                                    // ~0.07 с на букву — спокойное чтение
  const readTime = el => Math.max(2.2, Math.min(7, (el ? el.textContent.length : 40) * READ));
  const screenText = 'Педагог дошкольного образования делает понятным хаотичный мир для тех, кто ещё не умеет читать';
  const glass = qa('.story__glass');
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: render });
  tl.from(qa('.story__then .story__reveal'), { yPercent: 110, duration: 1, ease: 'power3.out', stagger: 0.15 }, 0)
    .from(q('.story__ghost--then'), { autoAlpha: 0, scale: 0.94, duration: 1.6, ease: 'power2.out' }, 0.2)
    .from(state, { spin: -0.05, duration: 1.6, ease: 'power2.out' }, 0)
    .to({}, { duration: Math.max(4.5, screenText.length * READ) })   // время прочитать заголовок и экран
    .to([q('.story__then'), q('.story__ghost--then')], { autoAlpha: 0, y: -30, duration: 0.8, ease: 'power2.in' })
    .to(state, { spin: 0.5, duration: 1.8, ease: 'power2.inOut' }, '<')           // поворот на 180°
    .addLabel('away')
    .to(state, { slide: 1, duration: 1.4, ease: 'power2.in' }, 'away')            // развёрнутый ноутбук уходит влево…
    .fromTo(q('.story__now-photo'), { autoAlpha: 1, clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: 1.4, ease: 'power2.in' }, 'away') // …фото справа налево
    .from(q('.story__now-photo img'), { xPercent: 8, scale: 1.08, duration: 2.2, ease: 'power2.out' }, 'away')
    .set(canvas, { autoAlpha: 0 })
    .to(q('.story__ghost--now'), { autoAlpha: 0.5, duration: 1.4, ease: 'power2.out' })
    .fromTo(q('.story__now-text'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, '<')
    .from(qa('.story__now .story__reveal'), { yPercent: 110, duration: 1, ease: 'power3.out', stagger: 0.15 }, '<')
    .to({}, { duration: 1.6 });
  glass.forEach(el => {
    tl.from(el, { y: 30, autoAlpha: 0, duration: 0.8, ease: 'power3.out' })
      .to({}, { duration: readTime(el) });              // пауза на чтение каждой плашки
  });
  render();
  if (reduce) { tl.progress(1); render(); return; }
  let played = false;
  new IntersectionObserver((e) => {
    if (e[0].isIntersecting && !played) { played = true; tl.play(); }
  }, { threshold: 0.65 }).observe(section);
}
