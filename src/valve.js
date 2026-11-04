import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { TUBES, WATER } from './data.js';
import { damp, label, M, makeTube, onTheme, reduceMotion } from './kit.js';

/** Close-up of the 4-way valve, pulled apart: two independent pairs, each IN goes with the OUT of the same colour,
    and the diaphragm between them that shuts the feed pair when the tank is full. */
export function createValve(host, { onPort } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  host.appendChild(renderer.domElement);
  const css = new CSS2DRenderer();
  css.domElement.className = 'css2d';
  host.appendChild(css.domElement);

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const hemi = new THREE.HemisphereLight(0xffffff, 0x334, 0.8);
  scene.add(hemi);
  const dl = new THREE.DirectionalLight(0xffffff, 1.8);
  dl.position.set(3, 6, 5);
  scene.add(dl);

  onTheme((dark) => {
    renderer.toneMappingExposure = dark ? 0.88 : 1;
    scene.environmentIntensity = dark ? 0.7 : 1;
    hemi.intensity = dark ? 0.6 : 0.8;
  });

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(1.0, 1.1, 9.5);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.target.set(0, 0.1, 0);
  controls.minPolarAngle = 0.6;
  controls.maxPolarAngle = 2.0;

  const g = new THREE.Group();
  scene.add(g);

  // Real body (photos): two round halves stacked face to face, a rubber diaphragm between them.
  // The marked half (moulded IN/OUT, bumps round the rim) is on the left, the half held by 6 screws
  // on the right. Each half carries one pair straight through: IN at the bottom, its OUT directly
  // above. Blow test: the marked half is one-way (check valve in its IN), so it is the product pair.
  // Drawn pulled apart and see-through so each half's own path, and the diaphragm, can be seen.
  const cyl = (r, l, axis) => {
    const geo = new THREE.CylinderGeometry(r, r, l, 48);
    if (axis === 'z') geo.rotateX(Math.PI / 2);
    if (axis === 'x') geo.rotateZ(Math.PI / 2);
    return geo;
  };
  const white = () => M.plastic(0xf3f1ea);
  const HX = 0.95, // half centres, pulled apart
    HT = 0.46; // half thickness
  [
    [-HX, 0xe7defa],
    [HX, 0xd9f1f4],
  ].forEach(([x, tint]) => {
    const half = new THREE.Mesh(cyl(0.9, HT, 'x'), M.glass(tint, 0.42));
    half.position.x = x;
    half.renderOrder = 2;
    g.add(half);
    [-1, 1].forEach((s) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.045, 10, 64).rotateY(Math.PI / 2), white());
      rim.position.x = x + s * (HT / 2);
      g.add(rim);
    });
  });
  // marked half's outer face: lattice + bumps round the rim
  const OXL = -HX - HT / 2;
  [-0.45, 0, 0.45].forEach((y) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 2 * Math.sqrt(0.88 ** 2 - y * y)), white());
    bar.position.set(OXL, y, 0);
    g.add(bar);
  });
  for (let a = 0; a < 8; a++) {
    const ang = Math.PI / 8 + (a / 8) * Math.PI * 2;
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 12), white());
    k.position.set(OXL + 0.1, Math.sin(ang) * 0.93, Math.cos(ang) * 0.93);
    g.add(k);
  }
  // screw half's outer face: 6 screws
  for (let a = 0; a < 6; a++) {
    const ang = (a / 6) * Math.PI * 2;
    const sc = new THREE.Mesh(cyl(0.07, 0.05, 'x'), M.chrome());
    sc.position.set(HX + HT / 2 + 0.02, Math.sin(ang) * 0.72, Math.cos(ang) * 0.72);
    g.add(sc);
  }
  // dashed guides: where the halves go back together
  const guideMat = new THREE.LineDashedMaterial({ color: 0x8b95a3, dashSize: 0.07, gapSize: 0.06 });
  for (let a = 0; a < 4; a++) {
    const ang = Math.PI / 4 + (a / 4) * Math.PI * 2;
    const y = Math.sin(ang) * 0.9,
      z = Math.cos(ang) * 0.9;
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-HX + HT / 2, y, z),
        new THREE.Vector3(HX - HT / 2, y, z),
      ]),
      guideMat,
    );
    line.computeLineDistances();
    g.add(line);
  }
  // the diaphragm between the halves, and the stem it pushes into the screw half's passage
  const diaphragm = new THREE.Mesh(new THREE.SphereGeometry(0.72, 40, 20).scale(0.06, 1, 1), M.matte(0x2b3136));
  g.add(diaphragm);
  const stem = new THREE.Mesh(cyl(0.07, 1, 'x'), M.plastic(0xe9e3d2));
  stem.geometry.translate(0.5, 0, 0); // grows from the diaphragm toward +x
  g.add(stem);
  const seal = new THREE.Mesh(cyl(0.15, 0.1, 'x'), M.matte(0xcf5420));
  g.add(seal);
  // pressure arrows: tank back-pressure in the marked half pushing on the diaphragm
  const push = [];
  [-0.35, 0, 0.35].forEach((y) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 16).rotateZ(-Math.PI / 2), M.plastic(TUBES.purple.hex));
    c.position.set(-0.3, y, 0.25);
    c.material.transparent = true;
    g.add(c);
    push.push(c);
  });

  const feed = makeTube(
    [
      [HX, -2.05, 0],
      [HX, 0, 0],
    ],
    TUBES.teal.hex,
    { radius: 0.11, nuts: false, water: WATER.feed },
  );
  const feedOut = makeTube(
    [
      [HX, 0, 0],
      [HX, 2.05, 0],
    ],
    TUBES.teal.hex,
    { radius: 0.11, nuts: false, water: WATER.feed },
  );
  const prod = makeTube(
    [
      [-HX, -2.05, 0],
      [-HX, 2.05, 0],
    ],
    TUBES.purple.hex,
    { radius: 0.11, nuts: false, water: WATER.clean },
  );
  [feed, feedOut, prod].forEach((t) => {
    g.add(t.mesh);
    t.mat.userData.u.uFill.value = 1;
    t.mat.userData.u.uFront.value = 2;
    t.extras.forEach((e) => (e.visible = false)); // no end bands in the close-up
  });
  const cones = [];
  [
    [HX, TUBES.teal.hex],
    [-HX, TUBES.purple.hex],
  ].forEach(([x, hex]) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.34, 24), M.plastic(hex));
    cone.position.set(x, 2.2, 0);
    g.add(cone);
    cones.push(cone);
    [
      [-1.12, 0x1d8a57],
      [1.12, 0xcf5420],
    ].forEach(([y, c]) => {
      const port = new THREE.Mesh(cyl(0.15, 0.3), M.plastic(0xebe3cc));
      port.position.set(x, y, 0);
      g.add(port);
      const ring = new THREE.Mesh(cyl(0.165, 0.08), M.matte(c));
      ring.position.set(x, y * 0.92, 0);
      g.add(ring);
    });
  });

  const tags = [
    ['feedIn', '<span class="pill in">IN</span><em>from stage 3</em>', [HX, -2.3, 0]],
    ['feedOut', '<span class="pill out">OUT</span><em>to membrane</em>', [HX, 2.55, 0]],
    ['prodOut', '<span class="pill out">OUT</span><em>to T-fitting</em>', [-HX, 2.55, 0]],
    ['prodIn', '<span class="pill in">IN</span><em>clean, from membrane</em>', [-HX, -2.3, 0]],
  ];
  tags.forEach(([id, html, pos]) => {
    const l = label(html, 'vtag');
    l.position.set(...pos);
    l.element.dataset.port = id;
    l.element.addEventListener('pointerenter', () => onPort?.(id));
    l.element.addEventListener('pointerleave', () => onPort?.(null));
    l.element.addEventListener('focus', () => onPort?.(id));
    l.element.addEventListener('blur', () => onPort?.(null));
    g.add(l);
  });
  const pairLbl = (html, pos, c, cx) => {
    const l = label(html, 'vpair');
    l.element.style.setProperty('--c', c);
    l.position.set(...pos);
    l.center.set(cx, 0.5);
    l.element.tabIndex = -1;
    g.add(l);
    return l;
  };
  pairLbl('Marked half<br><small>clean water</small>', [-HX - 1.0, 0, 0], TUBES.purple.css, 1);
  pairLbl('Screw half<br><small>pre-filtered</small>', [HX + 1.0, 0, 0], TUBES.teal.css, 0);
  pairLbl('Diaphragm', [0, -1.0, 0], 'var(--muted)', 0.5);
  const shutLbl = pairLbl('Stem shuts the screw half', [0, 1.5, 0], '#cf5420', 0.5);
  shutLbl.element.classList.add('alert');
  // check valve: cream insert with a small hole in the marked half's IN port
  const cvIns = new THREE.Mesh(cyl(0.12, 0.1), M.plastic(0xe9e3d2));
  cvIns.position.set(-HX, -1.3, 0);
  g.add(cvIns);

  let active = null;
  function emphasize(port) {
    active = port ? (port.startsWith('feed') ? 'feed' : 'prod') : null;
  }
  // 'fill': both pairs flow. 'full': tank pressure pushes the diaphragm, its stem shuts the screw half.
  let shut = 0,
    shutTarget = 0;
  function setState(st) {
    shutTarget = st === 'full' ? 1 : 0;
  }
  function applyShut(k) {
    diaphragm.position.x = 0.3 * k;
    diaphragm.scale.x = 1 + 2.4 * k;
    // stem tip: just clear of the passage when open, across it when shut
    const tip = HX - 0.32 + 0.32 * k;
    stem.scale.x = tip - diaphragm.position.x;
    stem.position.x = diaphragm.position.x;
    seal.position.x = tip;
    seal.material.color.set(k > 0.5 ? 0xcf5420 : 0xe9e3d2);
    push.forEach((c) => {
      c.material.opacity = k;
      c.visible = k > 0.02;
    });
    shutLbl.element.style.opacity = k > 0.6 ? 1 : 0;
    // past the seal the passage empties: nothing goes on to the membrane
    feedOut.mat.userData.u.uFront.value = k > 0.5 ? 0 : 2;
  }
  applyShut(0);

  function resize() {
    const w = host.clientWidth,
      h = host.clientHeight;
    renderer.setSize(w, h);
    css.setSize(w, h);
    camera.aspect = w / h;
    camera.position.setLength(w / h < 0.9 ? 15 : 12.5);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host);
  resize();

  const clock = new THREE.Clock();
  let t = 0,
    running = false;
  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    g.rotation.y = reduceMotion ? 0.7 : 0.7 + Math.sin(t * 0.45) * 0.12;
    shut = reduceMotion ? shutTarget : damp(shut, shutTarget, 4, dt);
    applyShut(shut);
    [
      [feed, 'feed'],
      [feedOut, 'feed'],
      [prod, 'prod'],
    ].forEach(([tube, k]) => {
      const u = tube.mat.userData.u;
      // tank full: nothing moves in either pair
      u.uPhase.value += dt * (1 - shut) * (reduceMotion ? 0.25 : 1) * (k === 'feed' ? 0.5 : 0.35);
      u.uSat.value = damp(u.uSat.value, !active || active === k ? 1 - shut * 0.55 : 0.15, 6, dt);
      u.uGlow.value = damp(u.uGlow.value, active === k ? 0.25 : 0, 6, dt);
    });
    cones.forEach((c) => (c.visible = shut < 0.5));
    controls.update();
    renderer.render(scene, camera);
    css.render(scene, camera);
  }
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !running) {
      running = true;
      clock.getDelta();
      frame();
    } else if (!e.isIntersecting) running = false;
  }).observe(host);

  return { emphasize, setState };
}
