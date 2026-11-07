/* Блок «Мой путь»: 3D-ноутбук на тёмном интерьерном фоне.
   Модель — MacBook из демо repalash/threepipe-device-mockup-codrops (MIT; модель с Sketchfab),
   вынута из сцены и ужата до ~230 КБ (draco + webp). Отрисовка — three.js, без лишних плагинов.

   Прокрутка (блок закреплён):
   1. «30 лет я учила людей понимать сложное» / «Тогда» — на экране ноутбука фото с детьми и текст на плашке;
   2. ноутбук разворачивается на полный оборот — пока он спиной к нам, экран с фото детей гаснет до мягкого тёплого свечения;
   3. камера наезжает на экран, он заполняет весь кадр и превращается в полноэкранное фото «Сейчас»;
   4. «Теперь я делаю это визуально.» / «Сейчас» и по очереди — тексты на полупрозрачных плашках. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const section = document.querySelector('.story');
const canvas = section && section.querySelector('.story__gl');
const gsap = window.gsap;
if (section && canvas && gsap && window.ScrollTrigger) init();

function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

/* текстура экрана: фото по размеру экрана + (для «тогда») текст на полупрозрачной плашке */
function screenTexture(img, caption) {
  const W = 1600, H = 1000;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const s = Math.max(W / img.width, H / img.height);
  const iw = img.width * s, ih = img.height * s;
  g.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih);
  if (caption) {
    const pad = 70, bw = W - pad * 2, bh = 230, bx = pad, by = H - bh - pad;
    g.fillStyle = 'rgba(14, 27, 30, .62)';
    g.beginPath(); g.roundRect(bx, by, bw, bh, 28); g.fill();
    g.fillStyle = '#F6EFE5';
    g.font = '300 26px Inter, sans-serif';
    g.fillText('ТОГДА', bx + 48, by + 62);
    g.font = '400 46px Inter, sans-serif';
    const words = caption.split(' '); let line = '', y = by + 128;
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (g.measureText(t).width > bw - 96) { g.fillText(line, bx + 48, y); line = w; y += 56; } else line = t;
    }
    g.fillText(line, bx + 48, y);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
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

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);

  const draco = new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const [gltf, pastImg] = await Promise.all([
    loader.loadAsync('models/macbook.glb'),
    loadImage('img/story/past-screen.jpg'),
  ]);
  if (document.fonts && document.fonts.ready) await document.fonts.ready;

  /* ноутбук в «поворотной» группе, центр — по середине экрана */
  const laptop = gltf.scene;
  const box = new THREE.Box3().setFromObject(laptop);
  const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  const k = 2.2 / Math.max(size.x, size.z);
  laptop.scale.setScalar(laptop.scale.x * k);
  const box2 = new THREE.Box3().setFromObject(laptop);
  laptop.position.sub(box2.getCenter(new THREE.Vector3()));
  const turn = new THREE.Group(); turn.add(laptop); scene.add(turn);

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

  const state = { spin: 0, zoom: 0, swapped: false };
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    render();
  };
  const camFar = new THREE.Vector3(), camNear = new THREE.Vector3(), look = new THREE.Vector3();
  function render() {
    turn.rotation.y = Math.PI - 0.42 + state.spin * Math.PI * 2; // модель смотрит назад — разворачиваем к зрителю
    turn.rotation.x = 0.04;
    turn.position.set(camera.aspect < 1.2 ? 0 : 0.62, camera.aspect < 1.2 ? -0.6 : -0.28, 0); // на компьютере — правее, чтобы не закрывать заголовок
    /* смена картинки, когда ноутбук повернулся спиной */
    const showNow = state.spin > 0.5;
    if (showNow !== state.swapped) { screenMat.map = showNow ? texNow : texPast; screenMat.needsUpdate = true; state.swapped = showNow; }
    updateScreenTarget();
    const portrait = camera.aspect < 1.2;
    camFar.set(portrait ? -0.2 : 0.55, portrait ? 2 : 0.95, portrait ? 6.6 / Math.max(0.36, camera.aspect) : 4.6); // на телефоне камера дальше — ноутбук целиком
    camNear.set(screenTarget.x, screenTarget.y, screenTarget.z + 0.62);
    camera.position.lerpVectors(camFar, camNear, state.zoom);
    look.set(portrait ? 0.25 : 0, 0.25, 0).lerp(screenTarget, Math.min(1, Math.max(0, state.zoom) * 1.4));
    camera.lookAt(look);
    renderer.render(scene, camera);
  }
  window.addEventListener('resize', resize);
  resize();
  section.classList.add('gl-ready');

  /* сцена по прокрутке */
  const q = s => section.querySelector(s), qa = s => section.querySelectorAll(s);
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    onUpdate: render,
    scrollTrigger: { trigger: section, start: 'top top', end: reduce ? '+=100%' : '+=360%', pin: true, scrub: 0.8, anticipatePin: 1 },
  });
  tl.from(qa('.story__then .story__reveal'), { yPercent: 110, duration: 0.6, ease: 'power3.out', stagger: 0.1 }, 0)
    .from(state, { zoom: -0.35, duration: 1, ease: 'power2.out' }, 0)
    .to({}, { duration: 0.6 })
    .to(q('.story__then'), { autoAlpha: 0, y: -40, duration: 0.5 }, 1.5)
    .to(state, { spin: 1, duration: 2.2, ease: 'power2.inOut' }, 1.5)
    .to(state, { zoom: 1, duration: 1.2, ease: 'power2.in' }, 3.5)
    .to(q('.story__now-photo'), { autoAlpha: 1, duration: 0.35 }, 4.5)
    .to(canvas, { autoAlpha: 0, duration: 0.3 }, 4.65)
    .from(q('.story__now-photo img'), { scale: 1.12, duration: 1.4, ease: 'power2.out' }, 4.5)
    .fromTo(q('.story__now-text'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, 4.88) // рукописная «в» выходит за маску — прячем текст целиком до появления
    .from(qa('.story__now .story__reveal'), { yPercent: 110, duration: 0.6, ease: 'power3.out', stagger: 0.1 }, 4.9)
    .from(qa('.story__glass'), { y: 40, autoAlpha: 0, duration: 0.5, ease: 'power3.out', stagger: 0.28 }, 5.4)
    .to({}, { duration: 0.6 });
  window.ScrollTrigger.sort();
  window.ScrollTrigger.refresh();
}
