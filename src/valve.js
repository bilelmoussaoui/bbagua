import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { TUBES, WATER } from './data.js';
import { damp, label, M, makeTube, onTheme, reduceMotion } from './kit.js';

/** Close-up of the 4-way valve: two independent pairs, each IN goes with the OUT of the same colour. */
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

  // Real body (photos): two round halves stacked face to face. The marked half (moulded IN/OUT,
  // bumps round the rim) is on the left, the half held by 6 screws on the right. Each half carries
  // one pair straight through: IN at the bottom, its OUT directly above. Blow test: the marked half
  // is one-way (check valve in its IN), so it is the product pair. Drawn see-through.
  const cyl = (r, l, axis) => {
    const geo = new THREE.CylinderGeometry(r, r, l, 48);
    if (axis === 'z') geo.rotateX(Math.PI / 2);
    if (axis === 'x') geo.rotateZ(Math.PI / 2);
    return geo;
  };
  const white = () => M.plastic(0xf3f1ea);
  [-0.31, 0.31].forEach((x) => {
    const half = new THREE.Mesh(cyl(0.95, 0.56, 'x'), M.glass(0xeef0f4, 0.28));
    half.position.x = x;
    half.renderOrder = 2;
    g.add(half);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.05, 10, 64).rotateY(Math.PI / 2), white());
    rim.position.x = x + Math.sign(x) * 0.28;
    g.add(rim);
  });
  const seam = new THREE.Mesh(cyl(0.9, 0.06, 'x'), M.plastic(0xdcd8ce));
  g.add(seam);
  // marked face: lattice + bumps
  [-0.5, 0, 0.5].forEach((y) => {
    const w = 2 * Math.sqrt(0.95 ** 2 - y * y);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, w), white());
    bar.position.set(-0.62, y, 0);
    g.add(bar);
  });
  for (let a = 0; a < 8; a++) {
    const ang = Math.PI / 8 + (a / 8) * Math.PI * 2;
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 12), white());
    k.position.set(-0.5, Math.sin(ang) * 1.0, Math.cos(ang) * 1.0);
    g.add(k);
  }
  // screw face
  for (let a = 0; a < 6; a++) {
    const ang = (a / 6) * Math.PI * 2;
    const sc = new THREE.Mesh(cyl(0.08, 0.06, 'x'), M.chrome());
    sc.position.set(0.62, Math.sin(ang) * 0.8, Math.cos(ang) * 0.8);
    g.add(sc);
  }

  const feed = makeTube(
    [
      [0.31, -2.05, 0],
      [0.31, 2.05, 0],
    ],
    TUBES.teal.hex,
    { radius: 0.11, nuts: false, water: WATER.feed },
  );
  const prod = makeTube(
    [
      [-0.31, -2.05, 0],
      [-0.31, 2.05, 0],
    ],
    TUBES.purple.hex,
    { radius: 0.11, nuts: false, water: WATER.clean },
  );
  [feed, prod].forEach((t) => {
    g.add(t.mesh);
    t.mat.userData.u.uFill.value = 1;
  });
  [
    [0.31, TUBES.teal.hex],
    [-0.31, TUBES.purple.hex],
  ].forEach(([x, hex]) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.34, 24), M.plastic(hex));
    cone.position.set(x, 2.2, 0);
    g.add(cone);
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
    ['feedIn', '<span class="pill in">IN</span><em>from stage 3</em>', [1.05, -2.25, 0]],
    ['feedOut', '<span class="pill out">OUT</span><em>to membrane</em>', [1.05, 2.45, 0]],
    ['prodOut', '<span class="pill out">OUT</span><em>to T-fitting</em>', [-1.05, 2.45, 0]],
    ['prodIn', '<span class="pill in">IN</span><em>clean, from membrane</em>', [-1.05, -2.25, 0]],
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
  const pairLbl = (txt, pos, c) => {
    const l = label(txt, 'vpair');
    l.element.style.setProperty('--c', c);
    l.position.set(...pos);
    l.element.tabIndex = -1;
    g.add(l);
  };
  pairLbl('Clean water · marked half', [-1.85, 0, 0.3], TUBES.purple.css);
  pairLbl('Pre-filtered · screw half', [1.75, 0, 0.3], TUBES.teal.css);
  // check valve: cream insert with a small hole in the marked half's IN port
  const cvIns = new THREE.Mesh(cyl(0.12, 0.1), M.plastic(0xe9e3d2));
  cvIns.position.set(-0.31, -1.3, 0);
  g.add(cvIns);

  let active = null;
  function emphasize(port) {
    active = port ? (port.startsWith('feed') ? 'feed' : 'prod') : null;
  }

  function resize() {
    const w = host.clientWidth,
      h = host.clientHeight;
    renderer.setSize(w, h);
    css.setSize(w, h);
    camera.aspect = w / h;
    camera.position.setLength(w / h < 1.1 ? 13 : 9.5);
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
    g.rotation.y = reduceMotion ? 0.35 : 0.35 + Math.sin(t * 0.45) * 0.3;
    [
      [feed, 'feed'],
      [prod, 'prod'],
    ].forEach(([tube, k]) => {
      const u = tube.mat.userData.u;
      u.uPhase.value = (reduceMotion ? 0.25 : 1) * t * (k === 'feed' ? 0.5 : 0.35);
      u.uSat.value = damp(u.uSat.value, !active || active === k ? 1 : 0.15, 6, dt);
      u.uGlow.value = damp(u.uGlow.value, active === k ? 0.25 : 0, 6, dt);
    });
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

  return { emphasize };
}
