/* Блок 9 «Галерея» — «Atmospheric Depth Gallery» (codrops, Houmahani Kane, github.com/houmahani/codrops-depth-gallery),
   перенесено на три.js сайта без сборщика. Камера летит в глубину сквозь ряд баннеров: прокрутка двигает камеру,
   ближайший баннер проявляется, следующий ждёт; фон — живой шейдер из двух мягких пятен, цвета которого берутся
   у каждого баннера и плавно перетекают; скорость прокрутки «дышит» в наклоне и масштабе; за камерой тянется
   светящийся след с искрами. Блок закреплён на экране, пока прокрутка проводит камеру от первого баннера до последнего.
   Подпись — только название и минимальное описание текущего баннера (вместо цветовых спецификаций оригинала). */
import * as THREE from 'three';

const sec = document.querySelector('[data-gallery]');
if (sec) init();

function init() {
  const canvas = sec.querySelector('.gal__canvas');
  const DATA = JSON.parse(sec.querySelector('.gal__data').textContent);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOBILE = 768;
  const isMobile = () => window.innerWidth <= MOBILE;

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
  catch (e) { sec.classList.add('gal--nogl'); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.autoClear = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  /* ===================== Background: два мягких пятна + зерно ===================== */
  const bg = {
    backgroundColor: new THREE.Color(DATA[0].backgroundColor), blob1Color: new THREE.Color(DATA[0].blob1Color), blob2Color: new THREE.Color(DATA[0].blob2Color),
    next: [new THREE.Color(), new THREE.Color(), new THREE.Color()],
    baseBlobRadius: 0.65, secondaryBlobRadiusRatio: 0.78, baseBlobStrength: 0.9,
    depthToRadiusAmount: 0.08, velocityToStrengthAmount: 0.1, motionSmoothing: 0.1,
    motionDepthProgress: 0, motionVelocityIntensity: 0, smoothedDepthProgress: 0, smoothedVelocityIntensity: 0,
  };
  const bgScene = new THREE.Scene(), bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bgMaterial = new THREE.ShaderMaterial({
    depthWrite: false, depthTest: false,
    uniforms: {
      uBackgroundColor: { value: bg.backgroundColor }, uBlob1Color: { value: bg.blob1Color }, uBlob2Color: { value: bg.blob2Color },
      uNoiseStrength: { value: 0.04 }, uBlobRadius: { value: 0.65 }, uBlobRadiusSecondary: { value: 0.65 * 0.78 }, uBlobStrength: { value: 0.9 },
      uTime: { value: 0 }, uVelocityIntensity: { value: 0 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 uBackgroundColor; uniform vec3 uBlob1Color; uniform vec3 uBlob2Color;
      uniform float uNoiseStrength; uniform float uBlobRadius; uniform float uBlobRadiusSecondary; uniform float uBlobStrength;
      uniform float uTime; uniform float uVelocityIntensity;
      float random(vec2 c){ return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453123); }
      void main(){
        vec3 color = uBackgroundColor;
        float t = uTime * 0.00028;
        vec2 c1 = vec2(0.50 + sin(t * 1.000) * 0.13 + sin(t * 1.618) * 0.05, 0.48 + cos(t * 0.794) * 0.09 + cos(t * 1.272) * 0.03);
        vec2 c2 = vec2(0.35 + cos(t * 0.927) * 0.11 + cos(t * 1.414) * 0.04, 0.55 + sin(t * 1.175) * 0.07 + sin(t * 0.618) * 0.03);
        float b1 = smoothstep(uBlobRadius, 0.0, distance(vUv, c1));
        float b2 = smoothstep(uBlobRadiusSecondary, 0.0, distance(vUv, c2));
        color = mix(color, mix(uBlob1Color, uBackgroundColor, 0.35), b1 * uBlobStrength);
        color = mix(color, mix(uBlob2Color, uBackgroundColor, 0.35), b2 * uBlobStrength);
        color += uVelocityIntensity * 0.10;
        color += (random(vUv * vec2(1387.13, 947.91)) - 0.5) * uNoiseStrength;
        gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
      }`,
  });
  bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMaterial));
  const setMoodBlend = (cur, nxt, blend) => {
    const b = THREE.MathUtils.clamp(blend, 0, 1);
    bg.backgroundColor.set(cur.background).lerp(bg.next[0].set(nxt.background), b);
    bg.blob1Color.set(cur.blob1).lerp(bg.next[1].set(nxt.blob1), b);
    bg.blob2Color.set(cur.blob2).lerp(bg.next[2].set(nxt.blob2), b);
  };
  const updateBackground = (time) => {
    bg.smoothedDepthProgress = THREE.MathUtils.lerp(bg.smoothedDepthProgress, bg.motionDepthProgress, bg.motionSmoothing);
    bg.smoothedVelocityIntensity = THREE.MathUtils.lerp(bg.smoothedVelocityIntensity, bg.motionVelocityIntensity, bg.motionSmoothing);
    const r = THREE.MathUtils.clamp(bg.baseBlobRadius + bg.smoothedDepthProgress * bg.depthToRadiusAmount, 0.05, 1);
    bgMaterial.uniforms.uBlobRadius.value = r;
    bgMaterial.uniforms.uBlobRadiusSecondary.value = r * bg.secondaryBlobRadiusRatio;
    bgMaterial.uniforms.uBlobStrength.value = THREE.MathUtils.clamp(bg.baseBlobStrength + bg.smoothedVelocityIntensity * bg.velocityToStrengthAmount, 0, 1);
    bgMaterial.uniforms.uTime.value = time;
    bgMaterial.uniforms.uVelocityIntensity.value = bg.smoothedVelocityIntensity;
  };

  /* ===================== Gallery: баннеры вглубь ===================== */
  const G = {
    planes: [], planeGap: 5, desktopPlaneScale: 1, mobilePlaneScale: 0.65, mobileXSpreadFactor: 0.25,
    planeFadeSmoothing: 0.14,
    parallaxAmountX: 0.16, parallaxAmountY: 0.08, parallaxSmoothing: 0.08,
    pointerTarget: new THREE.Vector2(), pointerCurrent: new THREE.Vector2(),
    breathTiltAmount: 0.045, breathScaleAmount: 0.03, breathSmoothing: 0.14, breathGain: 1.1, breathIntensity: 0,
    gestureParallaxAmountY: 0.05, gestureParallaxSmoothing: 0.05, driftCurrent: 0,
  };
  const planeGeometry = new THREE.PlaneGeometry(3, 3);
  const xSpread = () => (isMobile() ? G.mobileXSpreadFactor : 1);
  const baseScale = () => (isMobile() ? G.mobilePlaneScale : G.desktopPlaneScale);
  const layoutPlanes = () => G.planes.forEach((p, i) => p.position.set(p.userData.base.x * xSpread(), p.userData.base.y, -i * G.planeGap));
  const depthRange = () => ({ nearestZ: 0, deepestZ: -(G.planes.length - 1) * G.planeGap });
  const getDepthProgress = (z) => { const { nearestZ, deepestZ } = depthRange(); const span = nearestZ - deepestZ; return span > 0 ? THREE.MathUtils.clamp((nearestZ - z) / span, 0, 1) : 0; };
  const blendAt = (z) => {   // какой баннер сейчас и какой следующий (выборка на один шаг впереди камеры, как в оригинале)
    const last = G.planes.length - 1;
    const n = THREE.MathUtils.clamp((0 - (z - G.planeGap)) / G.planeGap, 0, last);
    const c = Math.floor(n);
    return { currentPlaneIndex: c, nextPlaneIndex: Math.min(c + 1, last), blend: n - c };
  };
  const mood = (i) => ({ background: DATA[i].backgroundColor, blob1: DATA[i].blob1Color, blob2: DATA[i].blob2Color });
  const updatePlaneVisibility = (z) => {
    const { currentPlaneIndex: c, nextPlaneIndex: n, blend } = blendAt(z);
    G.planes.forEach((p, i) => {
      let target = 0;
      if (i === c) target = 1 - blend;
      if (i === n) target = Math.max(target, blend);
      p.material.opacity = THREE.MathUtils.lerp(p.material.opacity, target, G.planeFadeSmoothing);
    });
  };
  const updatePlaneMotion = (scroll) => {
    G.pointerCurrent.lerp(G.pointerTarget, G.parallaxSmoothing);
    const vMax = Math.max(scroll.velocityMax, 0.0001);
    const vNorm = THREE.MathUtils.clamp(Math.abs(scroll.velocity) / vMax, 0, 1);
    const drift = THREE.MathUtils.clamp(scroll.velocity / vMax, -1, 1);
    G.breathIntensity = THREE.MathUtils.lerp(G.breathIntensity, THREE.MathUtils.clamp(vNorm * G.breathGain, 0, 1), G.breathSmoothing);
    G.driftCurrent = THREE.MathUtils.lerp(G.driftCurrent, drift, G.gestureParallaxSmoothing);
    const s0 = baseScale(), xs = xSpread();
    G.planes.forEach((p, i) => {
      const op = p.material.opacity, par = op * (1 + i * 0.05);
      p.position.x = p.userData.base.x * xs + G.pointerCurrent.x * G.parallaxAmountX * par;
      p.position.y = p.userData.base.y + G.pointerCurrent.y * G.parallaxAmountY * par + G.driftCurrent * G.gestureParallaxAmountY;
      p.position.z = -i * G.planeGap;
      const br = G.breathIntensity * op;
      p.rotation.set(-G.pointerCurrent.y * G.breathTiltAmount * br, G.pointerCurrent.x * G.breathTiltAmount * br, 0);
      const pulse = 1 + G.breathScaleAmount * br;
      const k = p.userData.k || 1;
      p.scale.set(s0 * k * p.userData.aspect * pulse, s0 * k * pulse, 1);
    });
  };
  window.addEventListener('pointermove', (e) => { G.pointerTarget.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1)); }, { passive: true });
  document.addEventListener('pointerleave', () => G.pointerTarget.set(0, 0), { passive: true });

  /* ===================== Scroll: камера от прокрутки страницы ===================== */
  const scroll = {
    target: 0, current: 0, smoothing: 0.08, toWorld: 0.01, prev: 0,
    rawVelocity: 0, velocity: 0, velocityDamping: 0.12, velocityMax: 1.5,
    firstOffset: 5, lastOffset: 5, maxZ: 5, minZ: 5, startZ: 5,
  };
  const updateBounds = () => { const d = depthRange(); scroll.maxZ = d.nearestZ + scroll.firstOffset; scroll.minZ = Math.min(scroll.maxZ, d.deepestZ + scroll.lastOffset); scroll.startZ = scroll.maxZ; };
  const maxScroll = () => (scroll.startZ - scroll.minZ) / scroll.toWorld;
  const updateScroll = () => {
    scroll.current = THREE.MathUtils.lerp(scroll.current, scroll.target, reduce ? 1 : scroll.smoothing);
    scroll.current = THREE.MathUtils.clamp(scroll.current, 0, maxScroll());
    scroll.rawVelocity = scroll.current - scroll.prev;
    scroll.velocity = THREE.MathUtils.clamp(THREE.MathUtils.lerp(scroll.velocity, scroll.rawVelocity, scroll.velocityDamping), -scroll.velocityMax, scroll.velocityMax);
    if (Math.abs(scroll.velocity) < 0.0001) scroll.velocity = 0;
    scroll.prev = scroll.current;
    camera.position.z = THREE.MathUtils.clamp(scroll.startZ - scroll.current * scroll.toWorld, scroll.minZ, scroll.maxZ);
  };

  /* ===================== Trail: светящийся след и искры ===================== */
  const trail = (() => {
    const T = { group: new THREE.Group(), points: [], mesh: null, minDistance: 0.006, maxPoints: 220, curveTension: 0.67, curveSegments: 220, radialSegments: 8,
      radiusHead: 0.012, radiusTail: 0.003, pointSmoothing: 0.53, maxTrimPerFrame: 4 };
    T.material = new THREE.MeshStandardMaterial({ color: new THREE.Color('#f6f9ff'), emissive: new THREE.Color('#ffffff'), emissiveIntensity: 1.35, roughness: 0.2, metalness: 0.05,
      transparent: true, opacity: 0.51, depthWrite: false, depthTest: false });
    const tube = (curve, segments) => {
      const pts = curve.getSpacedPoints(segments), rs = T.radialSegments, ring = rs + 1, v = [], idx = [];
      const up = new THREE.Vector3(0, 0, 1), tan = new THREE.Vector3(), nor = new THREE.Vector3(), bin = new THREE.Vector3(), off = new THREE.Vector3(), pos = new THREE.Vector3();
      for (let i = 0; i < pts.length; i++) {
        const t = i / Math.max(pts.length - 1, 1), r = T.radiusHead + (T.radiusTail - T.radiusHead) * Math.pow(t, 1.5);
        curve.getTangent(t, tan).normalize(); nor.crossVectors(up, tan).normalize(); if (nor.lengthSq() === 0) nor.set(1, 0, 0);
        bin.crossVectors(tan, nor).normalize();
        for (let j = 0; j <= rs; j++) { const a = (j / rs) * Math.PI * 2; off.copy(nor).multiplyScalar(-Math.cos(a) * r).addScaledVector(bin, Math.sin(a) * r); pos.copy(pts[i]).add(off); v.push(pos.x, pos.y, pos.z); }
      }
      for (let i = 0; i < pts.length - 1; i++) for (let j = 0; j < rs; j++) { const b = i * ring + j; idx.push(b, b + ring, b + 1, b + ring, b + ring + 1, b + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
    };
    T.reset = () => { if (T.mesh) { T.mesh.geometry.dispose(); T.group.remove(T.mesh); T.mesh = null; } T.points = []; };
    T.addPoint = (p) => {
      const last = T.points[T.points.length - 1] || null;
      if (last && p.distanceToSquared(last) < T.minDistance * T.minDistance) return;
      T.points.push(last ? last.clone().lerp(p, T.pointSmoothing) : p.clone());
      let budget = T.maxTrimPerFrame; while (T.points.length > T.maxPoints && budget-- > 0) T.points.shift();
      if (T.points.length < 2) return;
      const curve = new THREE.CatmullRomCurve3(T.points, false, 'centripetal', T.curveTension);
      const geo = tube(curve, Math.max(24, Math.min(T.curveSegments, T.points.length * 4)));
      if (!T.mesh) { T.mesh = new THREE.Mesh(geo, T.material); T.mesh.renderOrder = 1200; T.group.add(T.mesh); } else { T.mesh.geometry.dispose(); T.mesh.geometry = geo; }
    };
    return T;
  })();
  const sparks = (() => {
    const S = { group: new THREE.Group(), list: [], acc: 0, next: 0 };
    const geo = new THREE.SphereGeometry(1, 5, 4);
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#f6f9ff', transparent: true, opacity: 0, depthWrite: false, depthTest: false }));
      m.visible = false; S.group.add(m); S.list.push({ m, vel: new THREE.Vector3(), life: 0, total: 0 });
    }
    S.group.renderOrder = 1300;
    S.update = (dt, head, opacity) => {
      dt = Math.min(Math.max(dt || 0, 0), 0.1);
      S.acc += dt * 20; const n = Math.floor(S.acc); S.acc -= n;
      for (let k = 0; k < n; k++) {
        const p = S.list[S.next]; S.next = (S.next + 1) % S.list.length;
        const a = Math.random() * Math.PI * 2, r = Math.random() * 0.52;
        p.m.position.set(head.x + Math.cos(a) * r, head.y + (Math.random() - 0.5) * 0.52 * 0.6, head.z + Math.sin(a) * r);
        p.m.scale.setScalar(THREE.MathUtils.lerp(0.007, 0.02, Math.random())); p.m.visible = true;
        const sp = THREE.MathUtils.lerp(0.05, 0.22, Math.random());
        p.vel.set((Math.random() - 0.5) * sp, (Math.random() - 0.5) * sp * 0.6, (Math.random() - 0.5) * sp);
        p.total = p.life = THREE.MathUtils.lerp(0.25, 0.6, Math.random()); p.m.material.opacity = 0.4;
      }
      const drag = Math.pow(0.94, dt * 60), op = THREE.MathUtils.clamp(opacity, 0, 1);
      S.list.forEach((p) => {
        if (p.life <= 0) return;
        p.life -= dt; if (p.life <= 0) { p.life = 0; p.m.visible = false; p.m.material.opacity = 0; return; }
        p.vel.multiplyScalar(drag); p.m.position.addScaledVector(p.vel, dt);
        p.m.material.opacity = (p.life / p.total) * op * 0.75;
      });
    };
    return S;
  })();
  const TR = { start: [-0.96, -1.05], width: 3, hCycles: 1.85, vAmp: 0.78, vCycles: 2.1, ahead: 1.65, baseDepth: 4.78, depthSpan: 6.52, progBias: -0.1 };
  const trailState = { moved: false, prevProgress: null, prevDir: 0, opacity: 0.51 };
  const head = new THREE.Vector3();
  const headAt = (camZ, prog) => {
    const p = THREE.MathUtils.clamp(prog, 0, 1), m = isMobile();
    const x = TR.start[0] + (m ? 0.35 : 0) + Math.sin(p * Math.PI * 2 * TR.hCycles) * TR.width * (m ? 0.35 : 1);
    const y = TR.start[1] + Math.sin(p * Math.PI * 2 * TR.vCycles) * TR.vAmp;
    const dp = TR.progBias + p * (1 - TR.progBias);
    return head.set(x, y, camZ + TR.ahead - (TR.baseDepth + dp * TR.depthSpan));
  };
  const progressNow = () => { const r = scroll.maxZ - scroll.minZ; return r > 0 ? THREE.MathUtils.clamp((scroll.maxZ - camera.position.z) / r, 0, 1) : 0; };
  const updateTrail = (dt) => {
    const prog = progressNow();
    if (prog > 0.01) trailState.moved = true;
    let dir = 0;
    if (trailState.prevProgress !== null) { const d = prog - trailState.prevProgress; if (Math.abs(d) > 0.0005) dir = Math.sign(d); }
    const reversed = dir !== 0 && trailState.prevDir !== 0 && dir !== trailState.prevDir;
    const lenP = (dir || trailState.prevDir) < 0 ? prog * 0.55 : prog;
    trail.maxPoints = Math.round(THREE.MathUtils.lerp(14, 220, THREE.MathUtils.clamp(lenP, 0, 1)));
    trail.maxTrimPerFrame = (dir || trailState.prevDir) < 0 ? 32 : 4;
    const h = headAt(camera.position.z, prog);
    const startD = THREE.MathUtils.clamp(prog + 0.1, 0, 1), endD = 1 - prog;
    const edge = THREE.MathUtils.smoothstep(Math.min(startD, endD), 0.04, 0.2);
    const startup = !trailState.moved && prog <= 0.01 ? 0.55 : 0;
    trailState.opacity = THREE.MathUtils.lerp(trailState.opacity, 0.51 * Math.max(edge, startup), 0.12);
    trail.material.opacity = trailState.opacity;
    if (reversed) { trail.reset(); const lead = h.clone(); lead.z += dir * 0.12; trail.addPoint(lead); }
    trail.addPoint(h);
    if (dir !== 0) trailState.prevDir = dir;
    trailState.prevProgress = prog;
    sparks.update(dt, h, trailState.opacity);
  };

  /* ===================== Подпись: название и минимальное описание ===================== */
  const label = sec.querySelector('.gal__label'), lName = label.querySelector('.gal__name'), lDesc = label.querySelector('.gal__desc'), lChip = label.querySelector('.gal__chip');
  let labelIndex = -1, darkText = null;
  const updateLabel = (z) => {
    const b = blendAt(z), i = b.blend >= 0.5 ? b.nextPlaneIndex : b.currentPlaneIndex;
    if (i !== labelIndex) {
      labelIndex = i;
      lName.textContent = DATA[i].name; lDesc.textContent = DATA[i].desc; lChip.style.backgroundColor = DATA[i].accentColor;
    }
    const dark = !!DATA[i].darkText;
    if (dark !== darkText) { darkText = dark; sec.classList.toggle('gal--dark-text', dark); sec.setAttribute('data-light', dark ? '1' : '0'); }
  };

  /* ===================== Сборка ===================== */
  const loader = new THREE.TextureLoader();
  let ready = false, running = false, raf = 0, lastT = 0, st = null;
  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false);
    if (ready) layoutPlanes();
  };
  const frame = () => {
    raf = requestAnimationFrame(frame);
    const now = performance.now(), dt = Math.min(0.1, (now - (lastT || now)) / 1000); lastT = now;
    updateBounds(); updateScroll();
    updateTrail(dt);
    updatePlaneVisibility(camera.position.z);
    updatePlaneMotion(scroll);
    updateLabel(camera.position.z);
    const mb = blendAt(camera.position.z);
    setMoodBlend(mood(mb.currentPlaneIndex), mood(mb.nextPlaneIndex), mb.blend);
    const vInt = THREE.MathUtils.clamp(Math.abs(scroll.velocity) / scroll.velocityMax, 0, 1);
    const stab = THREE.MathUtils.smoothstep(Math.abs(mb.blend - 0.5) * 2, 0.35, 1);
    bg.motionDepthProgress = getDepthProgress(camera.position.z);
    bg.motionVelocityIntensity = vInt * stab;
    updateBackground(now);
    renderer.clear(true, true, true);
    renderer.render(bgScene, bgCamera);
    renderer.clearDepth();
    renderer.render(scene, camera);
  };
  const start = () => { if (running || !ready) return; running = true; lastT = 0; raf = requestAnimationFrame(frame); };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  const build = (textures) => {
    DATA.forEach((d, i) => {
      const tex = textures[i], img = tex && tex.image;
      const aspect = img && img.width > 0 ? img.width / img.height : 1;
      const mat = new THREE.MeshBasicMaterial({ color: tex ? '#ffffff' : d.accentColor, map: tex || null, side: THREE.DoubleSide, transparent: true, depthWrite: false, opacity: i === 0 ? 1 : 0 });
      const mesh = new THREE.Mesh(planeGeometry, mat);
      /* широкий баннер — чуть меньше и ближе к центру, чтобы не наезжал на подписи по краям */
      const wide = aspect > 1.2;
      mesh.userData.base = wide ? { x: 0, y: d.position.y } : d.position;
      mesh.userData.aspect = aspect; mesh.userData.k = wide ? 0.6 : 1;
      scene.add(mesh); G.planes.push(mesh);
    });
    layoutPlanes(); updateBounds();
    camera.position.z = scroll.startZ;
    scene.add(trail.group); scene.add(sparks.group);
    const s0 = headAt(camera.position.z, 0).clone();   // начальные точки следа
    for (let k = 10; k >= 0; k--) { const p = s0.clone(); p.z -= k * 0.12; trail.addPoint(p); }
    ready = true;
  };

  /* закрепление: блок держится на экране, прокрутка страницы ведёт камеру от первого баннера к последнему */
  const pin = () => {
    if (!window.ScrollTrigger) return;
    st = window.ScrollTrigger.create({
      trigger: sec, start: 'top top', end: () => '+=' + Math.round(window.innerHeight * 0.8 * (DATA.length - 1)), pin: true, pinSpacing: true, refreshPriority: -10,   // последний закреплённый блок — считается после всех выше
      onUpdate: (self) => { scroll.target = self.progress * maxScroll(); },
    });
    window.ScrollTrigger.sort();
    window.ScrollTrigger.refresh();
  };

  resize();
  window.addEventListener('resize', resize);
  updateBounds();
  pin();
  /* фото грузятся заранее, когда до блока остаётся экран прокрутки */
  let loading = false;
  new IntersectionObserver((en) => {
    if (en[0].isIntersecting && !loading) {
      loading = true;
      Promise.all(DATA.map((d) => loader.loadAsync(d.src).then((t) => { t.colorSpace = THREE.SRGBColorSpace; return t; }).catch(() => null)))
        .then((tex) => { build(tex); resize(); start(); });
    }
  }, { rootMargin: '100% 0px' }).observe(sec);
  new IntersectionObserver((en) => { if (en[0].isIntersecting) start(); else stop(); }, { threshold: 0 }).observe(sec);
}
