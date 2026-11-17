/* Блок «Мой путь»: 3D-ноутбук на тёмно-зелёном фоне сайта.
   Модель — MacBook из демо repalash/threepipe-device-mockup-codrops (MIT; модель с Sketchfab),
   вынута из сцены и ужата до ~230 КБ (draco + webp). Отрисовка — three.js.

   Блок закрепляется на экране. «Тогда» открывается само; дальше — подсказка «прокрутите вниз»,
   и прокрутка (или клик по подсказке) запускает переход к «Сейчас». Ушли вверх — при возвращении снова «Тогда».
   1. «30 лет я учила людей понимать сложное»; за ноутбуком в полутоне — «Тогда»;
      на экране — карточка из макета: фото с детьми и белая плашка с текстом (время на чтение);
   2. ноутбук поворачивается на 180° — спиной к зрителю — и вся сцена (стол, ваза, ноутбук, надписи)
      уходит влево, а за ней справа налево открывается полноэкранное фото «Сейчас»;
   3. «Теперь я делаю это визуально.» (макет «п-р 21»): строки выезжают из-под маски, «Сейчас» — по буквам,
      тексты справа и слева и теги появляются по очереди, с паузами на чтение. */
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

/* ваза с белыми лилиями — строится из геометрии: гладкая белая керамика, стебли, листья, цветы.
   Освещается тем же светом, что и ноутбук, поэтому выглядит объёмной частью интерьера */
function makeBouquet() {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const root = new THREE.Group();
  // ваза: силуэт-капля, вращённый вокруг оси
  const prof = [[0, 0], [0.12, 0], [0.17, 0.02], [0.21, 0.08], [0.225, 0.17], [0.21, 0.27], [0.16, 0.36], [0.1, 0.43], [0.064, 0.5], [0.052, 0.57], [0.058, 0.62], [0.05, 0.626]];
  const pts = new THREE.SplineCurve(prof.map(p => new THREE.Vector2(p[0], p[1]))).getPoints(70);
  const vase = new THREE.Mesh(new THREE.LatheGeometry(pts, 72),
    new THREE.MeshPhysicalMaterial({ color: 0xF1EDE6, roughness: 0.24, clearcoat: 0.8, clearcoatRoughness: 0.18, side: THREE.DoubleSide }));
  root.add(vase);

  const stems = new THREE.Group(); stems.position.y = 0.6; root.add(stems); // букет качается от горлышка
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x4F7439, roughness: 0.6 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x5C8244, roughness: 0.55, side: THREE.DoubleSide });
  const petalMat = new THREE.MeshStandardMaterial({ color: 0xF7F3EC, roughness: 0.5, emissive: 0x2A2722, side: THREE.DoubleSide });
  const budMat = new THREE.MeshStandardMaterial({ color: 0xE3E8CF, roughness: 0.5 });
  const stamenMat = new THREE.MeshStandardMaterial({ color: 0xC9C08A, roughness: 0.6 });
  const pollenMat = new THREE.MeshStandardMaterial({ color: 0xA9502C, roughness: 0.7 }); // медный — из палитры сайта

  // лепесток лилии: заострённый, с желобком посередине и отогнутым назад кончиком
  const petalGeo = (() => {
    const g = new THREE.PlaneGeometry(1, 1, 6, 14), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) * 2, t = p.getY(i) + 0.5;
      const w = 0.05 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.75) * (1 - 0.2 * t) + 0.004;
      const x = u * w, y = t * 0.15;
      const z = -Math.pow(t, 2.2) * 0.075 + u * u * 0.012 - 0.01 * Math.sin(Math.PI * t);
      p.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals(); return g;
  })();
  // длинный узкий лист, свисающий дугой
  const leafGeo = (() => {
    const g = new THREE.PlaneGeometry(1, 1, 2, 16), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) * 2, t = p.getY(i) + 0.5;
      const w = 0.02 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.02)), 0.6) + 0.002;
      p.setXYZ(i, u * w, t * 0.34, Math.pow(t, 2) * 0.14 + u * u * 0.006);
    }
    g.computeVertexNormals(); return g;
  })();
  const up = new THREE.Vector3(0, 1, 0);
  const lily = () => {
    const f = new THREE.Group();
    for (let k = 0; k < 6; k++) {
      const arm = new THREE.Group(); arm.rotation.y = k * Math.PI / 3 + (k % 2) * 0.12;
      const pt = new THREE.Mesh(petalGeo, petalMat); pt.rotation.x = k % 2 ? 1.2 : 1.32; pt.scale.setScalar(k % 2 ? 1.45 : 1.55);
      arm.add(pt); f.add(arm);
    }
    for (let k = 0; k < 6; k++) { // тычинки
      const a = k * Math.PI / 3 + 0.3, sp = 0.32;
      const d = new THREE.Vector3(Math.sin(sp) * Math.cos(a), Math.cos(sp), Math.sin(sp) * Math.sin(a));
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.085, 4), stamenMat);
      st.quaternion.setFromUnitVectors(up, d); st.position.copy(d).multiplyScalar(0.0425); f.add(st);
      const an = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 6, 4), pollenMat);
      an.scale.set(1, 0.5, 1.8); an.position.copy(d).multiplyScalar(0.087); an.quaternion.copy(st.quaternion); f.add(an);
    }
    return f;
  };

  const N = 11;
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2 + rnd() * 0.5, s = 0.2 + rnd() * 0.2, hgt = 0.3 + rnd() * 0.24;
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.06, 0),
      new THREE.Vector3(out.x * 0.02, 0.06, out.z * 0.02),
      new THREE.Vector3(out.x * s * 0.45, hgt * 0.6, out.z * s * 0.45),
      new THREE.Vector3(out.x * s, hgt, out.z * s),
    ]);
    stems.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.0055, 5), stemMat));
    const tip = curve.getPoint(1), tan = curve.getTangent(1);
    if (i % 3 !== 2) { // цветок
      const f = lily();
      f.quaternion.setFromUnitVectors(up, tan.clone().add(out.clone().multiplyScalar(0.7)).normalize());
      f.position.copy(tip); stems.add(f);
    } else {           // бутон
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), budMat);
      b.scale.set(1, 3.2, 1); b.quaternion.setFromUnitVectors(up, tan);
      b.position.copy(tip).addScaledVector(tan, 0.05); stems.add(b);
    }
    if (i % 2 === 0) { // лист
      const at = 0.25 + rnd() * 0.25, p = curve.getPoint(at), tg = curve.getTangent(at);
      const l = new THREE.Mesh(leafGeo, leafMat);
      l.quaternion.setFromUnitVectors(up, tg.clone().multiplyScalar(0.6).add(out.clone().multiplyScalar(0.8)).normalize());
      l.rotateY(rnd() * Math.PI); l.position.copy(p); stems.add(l);
    }
  }
  return { root, stems };
}

/* текстура экрана — как карточка в макете «п-р10»: фото сверху, белая плашка с тёмным текстом внизу */
function screenTexture(img, caption) {
  const W = 1600, H = 1000;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
  const ph = caption ? 690 : H;                       // фото — верхние ~70% экрана, плашка с текстом — без пустого поля
  const s = Math.max(W / img.width, ph / img.height);
  const iw = img.width * s, ih = img.height * s;
  g.save(); g.beginPath(); g.roundRect(0, 0, W, ph, caption ? [0, 0, 40, 40] : 0); g.clip();
  g.drawImage(img, (W - iw) / 2, Math.max(ph - ih, -ih * 0.125), iw, ih); g.restore(); // верх кадра виден — голова не обрезана
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
  const c2 = box2.getCenter(new THREE.Vector3());
  laptop.position.x -= c2.x; laptop.position.z -= c2.z; laptop.position.y -= box2.min.y; // низ корпуса — на столе
  const turn = new THREE.Group(); turn.add(laptop);
  /* «стол-поворотник»: ноутбук, ваза и тени поворачиваются вместе, ничто ни сквозь что не проходит */
  const rig = new THREE.Group(); rig.add(turn); scene.add(rig);

  /* ваза с белыми лилиями на столе слева — объёмная, освещена как ноутбук */
  const bouquet = makeBouquet(), vase = bouquet.root;
  vase.scale.setScalar(0.95); scene.add(vase);
  const vaseShadow = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.5), new THREE.MeshBasicMaterial({ map: shadow.material.map, transparent: true, depthWrite: false, opacity: 0.9 }));
  vaseShadow.rotation.x = -Math.PI / 2; vaseShadow.position.y = 0.003; scene.add(vaseShadow);
  rig.add(shadow, vase, vaseShadow);

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
    fitGhost(w, h);
  };
  /* «Тогда» занимает всё место справа от ноутбука: правый край ноутбука считаем по 3D-сцене */
  const ghostEl = section.querySelector('.story__ghost--then');
  let laptopBox = null;
  function fitGhost(w, h) {
    if (!ghostEl || state.slide > 0 || state.spin > 0.02) return;
    const gNow = section.querySelector('.story__ghost--now');
    if (camera.aspect < 1.2) { ghostEl.style.fontSize = ''; if (gNow) gNow.style.fontSize = ''; return; }
    if (!laptopBox) laptopBox = new THREE.Box3().setFromObject(lid || turn, true); // крышка — она на уровне слова
    let right = -Infinity; const v = new THREE.Vector3();
    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? laptopBox.max.x : laptopBox.min.x, i & 2 ? laptopBox.max.y : laptopBox.min.y, i & 4 ? laptopBox.max.z : laptopBox.min.z).project(camera);
      right = Math.max(right, (v.x + 1) / 2 * w);
    }
    ghostEl.style.fontSize = '';
    const cs = getComputedStyle(ghostEl), fs0 = parseFloat(cs.fontSize);
    const mc = document.createElement('canvas').getContext('2d'); mc.font = '300 100px Inter, sans-serif';
    const word = ghostEl.textContent;
    const ratio = mc.measureText(word).width / 100 - 0.03 * (word.length - 1); // ширина слова в em (с учётом letter-spacing -.03em)
    const avail = w - parseFloat(cs.right) - right - 0.004 * w;
    ghostEl.style.fontSize = Math.max(40, Math.min(fs0, avail / ratio)) + 'px';
    if (gNow) gNow.style.fontSize = ghostEl.style.fontSize;                       // «Сейчас» — того же размера, что «Тогда»
  }
  const camFar = new THREE.Vector3(), camNear = new THREE.Vector3(), look = new THREE.Vector3();
  function render() {
    turn.rotation.y = Math.PI - 0.12;              // модель смотрит назад — разворачиваем к зрителю
    rig.rotation.y = state.spin * Math.PI * 2;     // поворот на 180° — вместе с вазой
    turn.rotation.x = 0;
    /* букет чуть покачивается — сцена живая */
    const t = performance.now() / 1000;
    bouquet.stems.rotation.set(Math.sin(t * 0.9) * 0.018, 0, Math.sin(t * 0.7 + 1) * 0.022);
    /* смена картинки, когда ноутбук повернулся спиной */
    const showNow = state.spin > 0.5;
    if (showNow !== state.swapped) { screenMat.map = showNow ? texNow : texPast; screenMat.needsUpdate = true; state.swapped = showNow; }
    updateScreenTarget();
    const portrait = camera.aspect < 1.2;
    camFar.set(0, portrait ? 2.1 : 1.35, portrait ? 4.9 / Math.max(0.42, camera.aspect) : 4.6); // камера ближе — экран крупный, текст читается
    /* ваза стоит слева от ноутбука, в свободной части кадра; если места нет (узкий экран) — её не показываем,
       чтобы цветы не торчали из-за ноутбука */
    const vz = -0.25, halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect * (camFar.z - vz);
    const vx = Math.max(1.62, halfW * 0.72);
    vase.position.set(-vx, 0, vz);
    vase.visible = vaseShadow.visible = !portrait && halfW * 0.72 - 0.42 > 1.15;
    vaseShadow.position.set(vase.position.x, 0.003, vase.position.z);
    const dist = camFar.length(); scene.fog.near = dist + 1; scene.fog.far = dist + 16; // дальний правый край стола мягко уходит в фон
    camNear.set(screenTarget.x, screenTarget.y, screenTarget.z + 0.62);
    camera.position.lerpVectors(camFar, camNear, state.zoom);
    look.set(0, portrait ? 0.95 : 1.02, 0).lerp(screenTarget, Math.min(1, Math.max(0, state.zoom) * 1.4)); // ноутбук ниже заголовка
    /* slide: камера уезжает вправо — стол, ваза и развёрнутый ноутбук вместе уходят влево */
    const pan = state.slide * (portrait ? 4.5 : 7);
    camera.position.x += pan; look.x += pan;
    camera.lookAt(look);
    renderer.render(scene, camera);
  }
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(() => resize()).observe(canvas);   // закрепление блока меняет размер холста без resize окна — без этого картинка растягивается
  resize();
  section.classList.add('gl-ready');

  /* сцена идёт сама, по времени — с паузами на чтение; запускается, когда блок почти целиком на экране */
  const q = s => section.querySelector(s), qa = s => section.querySelectorAll(s);
  const grid = nowGrid(section, { reduce });
  const noteL = q('.story__note--left'), tags = qa('.story__tags span');
  /* тексты справа и слева — по словам: слова выезжают из-под строки, проявляясь из размытия */
  [noteL].forEach(n => n && n.querySelectorAll('.story__reveal').forEach(r => {
    r.innerHTML = r.textContent.split(' ').map(w => '<span class="w">' + w + '</span>').join(' ');
  }));
  const wordsIn = () => ({ yPercent: 100, autoAlpha: 0, filter: 'blur(6px)', duration: 0.65, ease: 'power3.out', stagger: 0.03 });
  /* «Тогда» и «Сейчас» — по буквам */
  qa('.story__ghost').forEach(el => { el.innerHTML = [...el.textContent].map(ch => '<span class="ch">' + ch + '</span>').join(''); });
  const ghostThen = q('.story__ghost--then');
  const charsIn = () => ({ yPercent: 70, autoAlpha: 0, rotate: 6, filter: 'blur(14px)', duration: 1.3, ease: 'power3.out', stagger: 0.09 });
  const away = () => -(window.innerWidth * 1.15);
  let drift;
  const hint = q('.story__scroll');
  let wantGo = false;
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: render });
  tl.from(qa('.story__then .story__reveal'), { yPercent: 110, autoAlpha: 0, duration: 1, ease: 'power3.out', stagger: 0.15 }, 0)
    .from(ghostThen.children, charsIn(), 0.45)
    .from(state, { spin: -0.05, duration: 1.6, ease: 'power2.out' }, 0)
    .call(() => { drift = gsap.to(ghostThen, { y: () => -14 * Math.min(1, window.innerWidth / 1920 + 0.3), duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: -1 }); }, null, 1.8)
    .fromTo(hint, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 1.6)
    .addPause(2.4, () => { if (wantGo) gsap.delayedCall(0.05, () => tl.play()); }) // «Тогда» ждёт прокрутки
    .to(hint, { autoAlpha: 0, y: 12, duration: 0.4, ease: 'power2.in' }, 2.4)
    .to(state, { spin: 0.5, duration: 1.5, ease: 'sine.inOut' }, 2.4)          // поворот на 180°, надписи остаются
    .to(ghostThen.children, { yPercent: -12, duration: 0.7, ease: 'sine.inOut', stagger: { each: 0.05, yoyo: true, repeat: 1 } }, '<')
    .addLabel('away', 3.4)                                                        // уход начинается, пока ноутбук ещё доворачивается
    .call(() => drift && drift.kill(), null, 'away')
    .to(state, { slide: 1, duration: 1.5, ease: 'power2.inOut' }, 'away')            // вся сцена уходит влево…
    .to([q('.story__then'), ghostThen], { x: away, duration: 1.5, ease: 'power2.inOut' }, 'away') // …надписи — вместе с ней
    .fromTo(q('.story__now-photo'), { autoAlpha: 1, clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: 1.5, ease: 'power2.inOut' }, 'away') // …фото справа налево
    .from(q('.nowg__img'), { scale: 1.12, duration: 2.2, ease: 'power2.out' }, 'away')
    /* «Сейчас»: тексты начинают появляться, пока фото ещё открывается, — быстро и одной волной */
    .addLabel('now', 'away+=1.1')
    .set(canvas, { autoAlpha: 0 }, 'away+=1.5')
    .call(() => section.classList.add('is-now'), null, 'away+=1.1')                // шапка — тёмными буквами
    .fromTo(q('.story__now-text'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, 'now')
    .from(qa('.story__now-text .story__reveal'), { yPercent: 110, autoAlpha: 0, filter: 'blur(8px)', duration: 0.9, ease: 'power3.out', stagger: 0.12 }, 'now')
    /* кнопка «Сейчас»: круг прорисовывается, слово поднимается из-под строки */
    .fromTo(q('.nowg__enter'), { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.8, ease: 'back.out(1.6)' }, 'now+=0.35')
    .from(q('.nowg__enter circle'), { strokeDasharray: 302, strokeDashoffset: 302, duration: 1.1, ease: 'power2.inOut' }, 'now+=0.35')
    .fromTo(q('.nowg__enter-text span'), { yPercent: 110 }, { yPercent: 0, duration: 0.7, ease: 'power3.out', clearProps: 'transform' }, 'now+=0.6')
    .from(noteL.querySelectorAll('.w'), wordsIn(), 'now+=0.95')
    .from(tags, { y: 22, scale: 0.9, autoAlpha: 0, filter: 'blur(8px)', duration: 0.7, ease: 'back.out(1.7)', stagger: 0.1 }, 'now+=1.35')
    ;
  render();
  if (reduce) { tl.progress(1); render(); if (hint) hint.hidden = true; return; }
  const go = () => { wantGo = true; if (tl.paused() && tl.time() >= 2.39 && tl.progress() < 1) tl.play(); };
  /* любое движение вниз на «Тогда» — колесо, тачпад, палец, клавиши — запускает переход */
  section.addEventListener('wheel', e => { if (e.deltaY > 0) go(); }, { passive: true });
  let ty = 0; section.addEventListener('touchstart', e => { ty = e.touches[0].clientY; }, { passive: true });
  section.addEventListener('touchmove', e => { if (ty - e.touches[0].clientY > 12) go(); }, { passive: true });
  window.addEventListener('keydown', e => { if (['ArrowDown', 'PageDown', ' ', 'Spacebar'].includes(e.key) && section.getBoundingClientRect().top <= 2 && section.getBoundingClientRect().bottom > 0) go(); });
  const reset = () => {                                                            // снова «Тогда»
    wantGo = false; drift && drift.kill();
    grid.close(true);
    tl.pause(0); gsap.set(ghostThen, { y: 0, rotate: 0 });
    section.classList.remove('is-now'); render();
  };
  hint && hint.addEventListener('click', go);
  /* «Тогда» стартует, когда блок почти целиком на экране; ушли выше блока — сцена сбрасывается */
  new IntersectionObserver((e) => {
    const en = e[0];
    if (en.isIntersecting && en.intersectionRatio >= 0.65 && tl.time() === 0) tl.play();
    if (!en.isIntersecting && en.boundingClientRect.top > 0) reset();
  }, { threshold: [0, 0.65] }).observe(section);
  /* блок закреплён: первые шаги прокрутки — переход к «Сейчас», дальше страница едет как обычно */
  /* при пересчёте закрепления (смена размера окна) страница сама сдвигается — это не прокрутка пользователя */
  let quietUntil = 0;
  if (window.ScrollTrigger) ['refreshInit', 'refresh'].forEach(ev => window.ScrollTrigger.addEventListener(ev, () => { quietUntil = performance.now() + 700; }));
  window.addEventListener('resize', () => { quietUntil = performance.now() + 900; });
  if (window.ScrollTrigger) {
    window.ScrollTrigger.create({
      trigger: section, start: 'top top', end: '+=110%', pin: true, pinSpacing: true, refreshPriority: -2,
      onUpdate: (self) => { if (self.progress > 0.08 && self.direction > 0 && performance.now() > quietUntil) go(); },
    });
    window.ScrollTrigger.sort(); window.ScrollTrigger.refresh();
  }
}

/* «Сейчас» → сетка работ (по мотивам Codrops «Image To Grid Transition», MIT; на GSAP Flip):
   портрет переезжает в свою ячейку, остальные работы слетаются к центру из-за краёв, подписи выезжают из-под строки,
   большая надпись уходит вверх и вниз, маленькая — въезжает. «Назад» — всё в обратном порядке */
function nowGrid(section, { reduce }) {
  const gsap = window.gsap, Flip = window.Flip;
  const q = s => section.querySelector(s), qa = s => Array.from(section.querySelectorAll(s));
  const enter = q('.nowg__enter'), back = q('.nowg__back'), gridEl = q('.nowg__grid'), item = q('.nowg__item');
  const home = q('.story__now-photo'), target = q('.nowg__cell--target'), panel = home;
  const big = qa('.story__now-text .story__reveal'), small = qa('.nowg__gtitle > span');
  const cells = qa('.nowg__cell:not(.nowg__cell--target)');
  if (!enter || !gridEl || !item || !target) return { close() {} };
  if (Flip) gsap.registerPlugin(Flip);
  const D = reduce ? 0 : 1, EASE = 'expo.inOut';
  let open = false, busy = false;
  /* откуда слетается работа: на 400 точек дальше от центра, чем её место */
  const outward = (el, dist = 400) => {
    const r = el.getBoundingClientRect(), p = panel.getBoundingClientRect();
    const cx = r.left + r.width / 2 - (p.left + p.width / 2), cy = r.top + r.height / 2 - (p.top + p.height / 2);
    const a = Math.atan2(Math.abs(cy), Math.abs(cx));
    return { x: Math.sign(cx || 1) * Math.cos(a) * dist, y: Math.sign(cy || 1) * Math.sin(a) * dist, d: Math.hypot(cx, cy) };
  };
  const move = (to) => {
    if (!Flip) { to.prepend(item); return; }
    const st = Flip.getState(item);
    to.prepend(item);
    Flip.from(st, { duration: D, ease: EASE, absolute: false });
  };
  const show = () => {
    if (open || busy) return;
    busy = true; open = true;
    section.classList.add('is-grid');
    gridEl.classList.add('is-open'); gridEl.setAttribute('aria-hidden', 'false'); back.tabIndex = 0;
    const tl = gsap.timeline({ onComplete: () => { busy = false; back.focus({ preventScroll: true }); } });
    tl.to(enter, { autoAlpha: 0, duration: D, ease: EASE }, 0)
      .add(() => move(target), 0)
      .to(big, { yPercent: (i) => (i % 2 ? 110 : -110), autoAlpha: 0, duration: D, ease: EASE }, 0)
      .fromTo(small, { xPercent: (i) => (i % 2 ? 50 : -50), autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: D, ease: EASE }, 0)
      .fromTo(back, { xPercent: -40, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: D, ease: EASE }, 0)
      .to(panel, { backgroundColor: '#DDD2C2', duration: D, ease: EASE }, 0)
      .fromTo(target.querySelector('.nowg__cap-in'), { yPercent: 101 }, { yPercent: 0, duration: D * 1.7, ease: EASE }, 0);
    cells.forEach((c) => {
      const o = outward(c), delay = reduce ? 0 : Math.min(0.4, o.d / 1000 * 0.4);
      tl.fromTo(c, { x: o.x, y: o.y, autoAlpha: 0 }, { x: 0, y: 0, autoAlpha: 1, duration: D, ease: 'expo.out', delay }, reduce ? 0 : 0.4)
        .fromTo(c.querySelector('.nowg__cap-in'), { yPercent: 101 }, { yPercent: 0, duration: D * 1.7, ease: EASE, delay }, 0);
    });
  };
  const close = (instant) => {
    if (!open) return;
    if (instant) {
      gsap.killTweensOf([enter, big, small, back, panel, ...cells]);
      home.prepend(item); gsap.set(item, { clearProps: 'all' });
      gsap.set(big, { yPercent: 0, autoAlpha: 1 }); gsap.set(enter, { autoAlpha: 1 }); gsap.set(panel, { clearProps: 'backgroundColor' });
      gridEl.classList.remove('is-open'); gridEl.setAttribute('aria-hidden', 'true'); back.tabIndex = -1;
      section.classList.remove('is-grid'); open = false; busy = false; return;
    }
    if (busy) return;
    busy = true;
    back.tabIndex = -1;
    const tl = gsap.timeline({ onComplete: () => {
      gridEl.classList.remove('is-open'); gridEl.setAttribute('aria-hidden', 'true');
      open = false; busy = false; enter.focus({ preventScroll: true });
    } });
    tl.to(panel, { backgroundColor: '#E8DCC8', duration: D, ease: EASE }, 0)
      .to(target.querySelector('.nowg__cap-in'), { yPercent: 101, duration: D, ease: EASE }, 0)
      .to(small, { xPercent: (i) => (i % 2 ? 50 : -50), autoAlpha: 0, duration: D, ease: EASE }, 0)
      .to(back, { xPercent: -20, autoAlpha: 0, duration: D, ease: EASE }, 0)
      .call(() => section.classList.remove('is-grid'), null, reduce ? 0 : 0.4)
      .to(big, { yPercent: 0, autoAlpha: 1, duration: D, ease: EASE }, reduce ? 0 : 0.4)
      .to(enter, { autoAlpha: 1, duration: D, ease: EASE }, reduce ? 0 : 0.4)
      .add(() => move(home), reduce ? 0 : 0.4);
    cells.forEach((c) => {
      const o = outward(c), delay = reduce ? 0 : Math.max(0, 0.4 - Math.min(0.4, o.d / 1000 * 0.4));
      tl.to(c, { x: o.x, y: o.y, autoAlpha: 0, duration: D, ease: EASE, delay }, 0)
        .to(c.querySelector('.nowg__cap-in'), { yPercent: 101, duration: D * 0.5, ease: EASE, delay }, 0);
    });
  };
  enter.addEventListener('click', show);
  back.addEventListener('click', () => close(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) close(false); });
  return { close };
}
