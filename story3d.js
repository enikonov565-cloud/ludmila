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

/* 3D-фото «Сейчас»: карта глубины (Depth Anything V2) сдвигает ближние планы сильнее дальних —
   Людмила и ноутбук отделяются от стены и растения, кадр мягко «дышит» сам и откликается на мышь */
function depthPhoto(frame, opts) {
  const img = frame.querySelector('img');
  const cv = document.createElement('canvas');
  cv.className = 'story__depth'; cv.setAttribute('aria-hidden', 'true');
  frame.appendChild(cv);
  let started = false, r, mat, scene, cam, raf = 0, visible = false;
  let mx = 0, my = 0, cx = 0, cy = 0;
  const loop = (now) => {
    const t = now / 1000;
    const ax = Math.sin(t * 0.33) * 0.7, ay = Math.sin(t * 0.47 + 1.3) * 0.45;   // сам по себе — медленная «восьмёрка»
    cx += (mx * 0.8 + ax - cx) * 0.045; cy += (my * 0.6 + ay - cy) * 0.045;
    const ox = -cx * 0.05, oy = cy * 0.032, z = 1.08 + Math.sin(t * 0.22) * 0.014;
    mat.uniforms.uOff.value.set(ox, oy);
    mat.uniforms.uZoom.value = z;
    if (opts.onMove) opts.onMove(ox, oy, z);
    r.render(scene, cam);
    raf = visible && !opts.reduce ? requestAnimationFrame(loop) : 0;
  };
  const resize = () => {
    if (!r) return;
    const w = frame.clientWidth, h = frame.clientHeight;
    r.setSize(w, h, false); mat.uniforms.uRes.value.set(w, h);
    if (!raf) r.render(scene, cam);
  };
  function start() {
    if (started) return; started = true;
    try { r = new THREE.WebGLRenderer({ canvas: cv, antialias: false, alpha: false, powerPreference: 'high-performance' }); }
    catch (e) { cv.remove(); return; }
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    r.outputColorSpace = THREE.LinearSRGBColorSpace;            // цвета фото — как есть, без пересчёта
    const ld = new THREE.TextureLoader();
    Promise.all([ld.loadAsync(img.currentSrc || img.src), ld.loadAsync('img/story/now-depth.jpg?v=2')]).then(([ti, td]) => {
      [ti, td].forEach(t => { t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; });
      scene = new THREE.Scene(); cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      mat = new THREE.ShaderMaterial({
        uniforms: { uImg: { value: ti }, uDep: { value: td }, uRes: { value: new THREE.Vector2(1, 1) },
          uPos: { value: new THREE.Vector2(opts.pos[0], 1 - opts.pos[1]) }, uOff: { value: new THREE.Vector2() }, uZoom: { value: 1.06 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: `
          uniform sampler2D uImg, uDep; uniform vec2 uRes, uPos, uOff; uniform float uZoom; varying vec2 vUv;
          void main(){
            float fa = uRes.x / uRes.y;
            vec2 s = (fa > 1.0 ? vec2(1.0, 1.0 / fa) : vec2(fa, 1.0)) / uZoom;   // как object-fit: cover для квадратного фото
            vec2 base = (1.0 - s) * uPos + vUv * s, uv = base;
            float d = texture2D(uDep, base).r;
            uv = base + uOff * (d - 0.37);   // Людмила и ноутбук (глубина ~0.37) стоят на месте — смещается фон за ними
            gl_FragColor = texture2D(uImg, clamp(uv, 0.001, 0.999));
          }`,
      });
      scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
      window.addEventListener('resize', resize); resize();
      if (window.ResizeObserver) new ResizeObserver(resize).observe(frame);
      frame.classList.add('is-3d');
      if (opts.reduce) return;
      window.addEventListener('pointermove', e => { mx = e.clientX / window.innerWidth * 2 - 1; my = e.clientY / window.innerHeight * 2 - 1; }, { passive: true });
      new IntersectionObserver(en => {
        visible = en[0].isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(loop);
      }, { threshold: 0.05 }).observe(frame);
    }).catch(() => cv.remove());
  }
  return { start };
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
  const READ = 0.07;                                    // ~0.07 с на букву — спокойное чтение
  const readTime = el => Math.max(2.2, Math.min(7, (el ? el.textContent.length : 40) * READ));
  const screenText = 'Педагог дошкольного образования делает понятным хаотичный мир для тех, кто ещё не умеет читать';
  /* «Сейчас» висит в воздухе перед растением — на «глубине» 0.8: при движении фото смещается как ближний план */
  const nowFrame = q('.story__now-frame'), ghostNowEl = q('.story__ghost--now');
  if (!stacked) gsap.set(ghostNowEl, { yPercent: -50 });           // центр слова — в точке над растением
  const depth = depthPhoto(nowFrame, { reduce, pos: stacked ? [0.6, 0.3] : [0.5, 0.36], onMove: stacked ? null : (ox, oy, z) => {
    const W = nowFrame.clientWidth, k = (0.6 - 0.37) * z;
    ghostNowEl.style.setProperty('--fx', (-ox * k * W * 0.35).toFixed(1) + 'px');  // вбок — чуть-чуть, чтобы край держал линию
    ghostNowEl.style.setProperty('--fy', (oy * k * W).toFixed(1) + 'px');
  } });
  const noteL = q('.story__note--left'), tags = qa('.story__tags span');
  /* тексты справа и слева — по словам: слова выезжают из-под строки, проявляясь из размытия */
  [noteL].forEach(n => n && n.querySelectorAll('.story__reveal').forEach(r => {
    r.innerHTML = r.textContent.split(' ').map(w => '<span class="w">' + w + '</span>').join(' ');
  }));
  const wordsIn = () => ({ yPercent: 100, autoAlpha: 0, filter: 'blur(6px)', duration: 0.65, ease: 'power3.out', stagger: 0.03 });
  /* «Тогда» и «Сейчас» — по буквам */
  qa('.story__ghost').forEach(el => { el.innerHTML = [...el.textContent].map(ch => '<span class="ch">' + ch + '</span>').join(''); });
  const ghostThen = q('.story__ghost--then'), ghostNow = q('.story__ghost--now');
  const charsIn = () => ({ yPercent: 70, autoAlpha: 0, rotate: 6, filter: 'blur(14px)', duration: 1.3, ease: 'power3.out', stagger: 0.09 });
  const away = () => -(window.innerWidth * 1.15);
  let drift;
  const hint = q('.story__scroll');
  let wantGo = false, bob = [];
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: render });
  tl.from(qa('.story__then .story__reveal'), { yPercent: 110, duration: 1, ease: 'power3.out', stagger: 0.15 }, 0)
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
    .call(() => depth.start(), null, 'away')                                      // 3D-фото готовится, пока уходит ноутбук
    .from(qa('.story__now-frame > img, .story__now-frame > canvas'), { xPercent: 6, scale: 1.06, duration: 2.2, ease: 'power2.out' }, 'away')
    /* «Сейчас»: тексты начинают появляться, пока фото ещё открывается, — быстро и одной волной */
    .addLabel('now', 'away+=1.1')
    .set(canvas, { autoAlpha: 0 }, 'away+=1.5')
    .call(() => section.classList.add('is-now'), null, 'away+=1.1')                // шапка — тёмными буквами
    .fromTo(q('.story__now-text'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, 'now')
    .from(qa('.story__now-text .story__reveal'), { yPercent: 110, filter: 'blur(8px)', duration: 0.9, ease: 'power3.out', stagger: 0.12 }, 'now')
    .to(ghostNow, { autoAlpha: 1, duration: 0.01 }, 'now+=0.25')
    .from(ghostNow.children, { yPercent: 70, autoAlpha: 0, rotate: 6, filter: 'blur(14px)', duration: 1, ease: 'power3.out', stagger: 0.06 }, 'now+=0.25')
    .from(noteL.querySelectorAll('.w'), wordsIn(), 'now+=0.95')
    .from(tags, { y: 22, scale: 0.9, autoAlpha: 0, filter: 'blur(8px)', duration: 0.7, ease: 'back.out(1.7)', stagger: 0.1 }, 'now+=1.35')
    .call(() => {                                                                   // парит: покачивается и чуть наклоняется
      bob.forEach(t => t.kill());
      bob = [gsap.to(ghostNow, { y: -14, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
             gsap.to(ghostNow, { rotate: 1.2, duration: 4.6, ease: 'sine.inOut', yoyo: true, repeat: -1 })];
    });
  render();
  if (reduce) { tl.progress(1); render(); depth.start(); if (hint) hint.hidden = true; return; }
  const go = () => { wantGo = true; if (tl.paused() && tl.time() >= 2.39 && tl.progress() < 1) tl.play(); };
  /* любое движение вниз на «Тогда» — колесо, тачпад, палец, клавиши — запускает переход */
  section.addEventListener('wheel', e => { if (e.deltaY > 0) go(); }, { passive: true });
  let ty = 0; section.addEventListener('touchstart', e => { ty = e.touches[0].clientY; }, { passive: true });
  section.addEventListener('touchmove', e => { if (ty - e.touches[0].clientY > 12) go(); }, { passive: true });
  window.addEventListener('keydown', e => { if (['ArrowDown', 'PageDown', ' ', 'Spacebar'].includes(e.key) && section.getBoundingClientRect().top <= 2 && section.getBoundingClientRect().bottom > 0) go(); });
  const reset = () => {                                                            // снова «Тогда»
    wantGo = false; drift && drift.kill(); bob.forEach(t => t.kill()); bob = [];
    tl.pause(0); gsap.set([ghostThen, ghostNow], { y: 0, rotate: 0 });
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
