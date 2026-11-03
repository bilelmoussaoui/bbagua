import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { CONNS, MODES, PARTS, TUBE_WATER, TUBES, WATER } from './data.js';
import { damp, ease, label, M, makeTube, onTheme, reduceMotion, roundedPath, setTubeReveal, Tweens } from './kit.js';
import { sectionMaterial } from './section.js';

/* Layout in scene units (~10 cm). x → right, y → up, z → toward viewer.
   Shelf top at y = 0, cups hang below it, floor at y = -3.35, countertop at y = 3.0. */
const ROUTES = {
  k1: [
    [-3.68, -2.25, -0.95],
    [-3.2, -2.25, -0.95],
    [-3.2, -3.15, -0.1],
    [-3.2, -3.15, 1.0],
    [2.75, -3.15, 1.0],
    [2.75, -0.3, 1.0],
    [2.19, -0.3, 1.0],
    [2.19, -0.3, 0.62],
  ],
  k2: [
    [1.01, -0.3, 0.62],
    [1.01, -0.3, 0.92],
    [0.59, -0.3, 0.92],
    [0.59, -0.3, 0.62],
  ],
  k3: [
    [-0.59, -0.3, 0.62],
    [-0.59, -0.3, 0.92],
    [-1.01, -0.3, 0.92],
    [-1.01, -0.3, 0.62],
  ],
  k4: [
    [-2.19, -0.3, 0.62],
    [-2.19, -0.3, 0.95],
    [-2.9, -0.3, 0.95],
    [-2.9, 0.12, 0.95],
    [-2.9, 0.12, -0.55],
    [-2.62, 0.12, -0.55],
  ],
  kG: [
    [-2.35, 0.12, -0.3],
    [-2.35, 0.12, 0.35],
    [-2.0, 0.45, 0.45],
    [-2.0, 0.45, 0.67],
  ],
  k4b: [
    [-2.08, 0.12, -0.55],
    [2.99, 0.12, -0.55],
    [2.99, -0.45, -0.55],
    [2.99, -0.45, 0.25],
    [2.99, -0.17, 0.25],
  ],
  k5: [
    [2.99, 0.87, 0.25],
    [2.99, 1.75, 0.25],
    [-2.2, 1.75, 0.25],
    [-2.2, 0.5, 0.25],
    [-2.2, 0.5, -0.1],
    [-1.75, 0.5, -0.1],
  ],
  k6: [
    [1.84, 0.6, -0.1],
    [2.3, 0.6, -0.1],
    [2.3, 0.6, -0.3],
    [3.4, 0.6, -0.3],
    [3.4, -0.62, -0.3],
    [3.4, -0.62, 0.25],
    [2.75, -0.62, 0.25],
    [2.75, -0.17, 0.25],
  ],
  k7: [
    [2.75, 0.87, 0.25],
    [2.75, 1.12, 0.25],
    [2.75, 1.12, -0.1],
    [1.82, 1.12, -0.1],
  ],
  k8: [
    [1.62, 1.34, -0.1],
    [1.62, 2.05, -0.1],
    [4.05, 2.05, -0.1],
    [4.05, -0.12, -0.1],
    [4.4, -0.12, -0.1],
  ],
  k10: [
    [-1.45, 1.29, -0.1],
    [-1.45, 2.4, -0.1],
    [3.8, 2.4, -0.1],
    [3.8, 2.4, 0.3],
    [3.8, 3.12, 0.3],
  ],
  k11: [
    [1.84, 0.4, -0.1],
    [2.1, 0.4, -0.1],
    [2.1, 0.4, -0.68],
    [0.66, 0.4, -0.68],
  ],
  k12: [
    [-0.26, 0.4, -0.68],
    [-3.2, 0.4, -0.68],
    [-3.2, 2.0, -0.68],
    [-3.2, 2.0, 0],
    [-4.12, 2.0, 0],
  ],
};

// Camera targets. dir (optional) is the preferred viewing direction.
const HIGH = [0.25, 0.95, 1];
export const FOCUS = {
  SRC: { t: [-3.6, -2.5, -0.4], d: 5 },
  S1: { t: [1.6, -1.4, 0.3], d: 5.6 },
  S2: { t: [0, -1.4, 0.3], d: 5.6 },
  S3: { t: [-1.6, -1.4, 0.3], d: 5.6 },
  GA: { t: [-2.0, 0.45, 0.6], d: 3.2 },
  GT: { t: [-2.3, 0.2, -0.2], d: 3.8, dir: HIGH },
  V: { t: [2.9, 0.35, 0.25], d: 3.8 },
  S4: { t: [0.1, 0.7, -0.1], d: 6, dir: HIGH },
  S5: { t: [0.1, 1.12, -0.1], d: 5.6, dir: HIGH },
  CV: { t: [2.8, 0.0, 0.25], d: 2.8, dir: [0.5, 0.2, 1] },
  FR: { t: [0.6, 0.4, -0.6], d: 3.6, dir: [0.2, 0.9, 1] },
  DR: { t: [-3.6, 1.6, -0.2], d: 5.5 },
  J: { t: [2.4, 1.0, 0], d: 6.5, dir: HIGH },
  TK: { t: [4.6, -1.8, 0], d: 7.5, dir: [0.75, 0.45, 1] },
  FT: { t: [3.6, 3.8, 0.3], d: 4.6 },
};

export function createScene(host, { onSelect, inset: inset0 } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  host.appendChild(renderer.domElement);

  const css = new CSS2DRenderer();
  css.domElement.className = 'css2d';
  host.appendChild(css.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 2.2;
  controls.maxDistance = 30;
  controls.maxPolarAngle = Math.PI * 0.62;
  controls.enablePan = true;
  controls.screenSpacePanning = true;

  // lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x5a6478, 0.9);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 9, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -5, near: 1, far: 30 });
  key.shadow.bias = -0.0004;
  key.shadow.radius = 6;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe6f5, 0.9);
  rim.position.set(-6, 3, -6);
  scene.add(rim);

  // floor shadow catcher
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShadowMaterial({ color: 0x142033, opacity: 0.14 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3.35;
  floor.receiveShadow = true;
  scene.add(floor);

  const root = new THREE.Group();
  scene.add(root);

  /* ---------------- parts ---------------- */
  const parts = {};
  const labels = {};
  const tw = new Tweens();

  function part(id) {
    const g = new THREE.Group();
    g.userData.id = id;
    parts[id] = g;
    root.add(g);
    return g;
  }
  function add(g, geo, mat, pos = [0, 0, 0], rot) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  }
  const cylX = (r, l, s = 32) => new THREE.CylinderGeometry(r, r, l, s).rotateZ(Math.PI / 2);
  const cylZ = (r, l, s = 24) => new THREE.CylinderGeometry(r, r, l, s).rotateX(Math.PI / 2);
  const cylY = (r, l, s = 32) => new THREE.CylinderGeometry(r, r, l, s);
  const nipple = (g, pos, axis, kind) => {
    const geo = axis === 'x' ? cylX(0.075, 0.14, 16) : axis === 'y' ? cylY(0.075, 0.14, 16) : cylZ(0.075, 0.14, 16);
    add(g, geo, M.plastic(0xe1e8ec), pos);
    if (kind) {
      const ring = axis === 'x' ? cylX(0.085, 0.04, 16) : axis === 'y' ? cylY(0.085, 0.04, 16) : cylZ(0.085, 0.04, 16);
      add(g, ring, M.matte(kind === 'IN' ? 0x1f9d63 : 0xe0531f), pos);
    }
  };

  /* ---- helpers for this model ---- */
  const elbow = (g, pts, r = 0.065, c = 0xebe3cc) =>
    add(g, new THREE.TubeGeometry(roundedPath(pts, 0.09), 16, r, 14), M.plastic(c));
  const canvasTex = (w, h, draw) => {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    draw(cv.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  /** Label wrapped around a cylinder lying along X. draw(ctx, w, h) draws in normal text space. */
  const wrapLabel = (g, r, len, arc, pos, tilt, draw, transparent = false) => {
    const TW = 768,
      TH = Math.round((TW * (arc * r)) / len);
    const tex = canvasTex(TH, TW, (c) => {
      c.setTransform(0, 1, -1, 0, TH, 0);
      draw(c, TW, TH);
    });
    const geo = new THREE.CylinderGeometry(r, r, len, 32, 1, true, -arc / 2, arc).rotateZ(Math.PI / 2).rotateX(-tilt);
    const m = add(
      g,
      geo,
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, transparent, alphaTest: transparent ? 0.1 : 0 }),
      pos,
    );
    m.castShadow = false;
    return m;
  };

  /* ---- bracket: one bent steel sheet (back plate, shelf, curved front panel) ---- */
  const bracket = new THREE.Group();
  root.add(bracket);
  const steel = () =>
    new THREE.MeshPhysicalMaterial({ color: 0xf4f5f6, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  add(bracket, new THREE.BoxGeometry(5.2, 0.03, 1.7), steel(), [0, -0.015, 0]);
  add(bracket, new THREE.BoxGeometry(5.2, 1.5, 0.03), steel(), [0, 0.75, -0.85]);
  const fp = new THREE.Shape();
  fp.moveTo(-2.6, 0);
  fp.lineTo(2.6, 0);
  fp.lineTo(2.6, 0.86);
  fp.quadraticCurveTo(0, 0.36, -2.6, 0.86);
  fp.lineTo(-2.6, 0);
  add(
    bracket,
    new THREE.ExtrudeGeometry(fp, { depth: 0.03, bevelEnabled: false, curveSegments: 32 }),
    steel(),
    [0, 0, 0.835],
  );
  // keyholes on the back plate
  const dark = new THREE.MeshBasicMaterial({ color: 0x2a3038 });
  [-2.1, 2.1].forEach((x) => {
    add(bracket, new THREE.CircleGeometry(0.07, 20), dark, [x, 1.22, -0.83]).castShadow = false;
    add(bracket, new THREE.PlaneGeometry(0.06, 0.14), dark, [x, 1.31, -0.83]).castShadow = false;
  });
  // slotted holes + screw heads on the shelf
  {
    const slot = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.004, 0.06), dark, 64);
    const screw = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.04, 0.025, 12), M.chrome(), 32);
    const o = new THREE.Object3D();
    let ns = 0,
      nc = 0;
    for (let x = -2.25; x <= 2.3; x += 0.5) {
      [-0.5, -0.2, 0.2, 0.5].forEach((z, j) => {
        o.position.set(x, 0.002, z);
        o.rotation.set(0, ((j % 2) * Math.PI) / 2, 0);
        o.updateMatrix();
        slot.setMatrixAt(ns++, o.matrix);
        if (Math.abs(x) > 0.3 && j % 2 === 0 && nc < 32) {
          o.position.set(x + 0.04, 0.012, z);
          o.updateMatrix();
          screw.setMatrixAt(nc++, o.matrix);
        }
      });
    }
    slot.count = ns;
    screw.count = nc;
    bracket.add(slot, screw);
  }
  // blue sticker on the front panel
  const sticker = canvasTex(1536, 150, (c, w, h) => {
    c.fillStyle = '#1e409a';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff';
    c.font = '500 92px Figtree, system-ui, sans-serif';
    c.textBaseline = 'middle';
    c.fillText('www.bbagua.com', 50, h / 2 - 4);
    c.font = '500 34px Figtree, system-ui, sans-serif';
    c.textAlign = 'right';
    c.fillText('902 14 14 74', w - 40, h - 30);
  });
  add(
    bracket,
    new THREE.PlaneGeometry(3.6, 0.35),
    new THREE.MeshStandardMaterial({ map: sticker, roughness: 0.4 }),
    [0.55, 0.26, 0.868],
  ).castShadow = false;

  /* ---- three 10" housings hanging under the shelf; ports are elbows on the sides of each head ---- */
  const sumpProfile = [
    [0, -2.5],
    [0.4, -2.48],
    [0.52, -2.4],
    [0.56, -2.25],
    [0.56, -0.02],
    [0.6, 0],
    [0.6, 0.02],
    [0, 0.02],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  // front wedge cut away (lathe angle 0 faces the viewer) so the inside shows
  // housing open from angle -CUT_L to +CUT_R; the cartridge inside is cut only on the left (-CUT_C..0),
  // so its real outside shows on the right and its cross-section faces the viewer on the left
  const CUT_L = 1.25,
    CUT_R = 1.0;
  const sumpGeo = new THREE.LatheGeometry(sumpProfile, 56, CUT_R, Math.PI * 2 - CUT_L - CUT_R);
  const sumpMat = new THREE.MeshPhysicalMaterial({
    color: 0xf7f8f9,
    roughness: 0.38,
    clearcoat: 0.55,
    clearcoatRoughness: 0.3,
    side: THREE.DoubleSide,
  });
  const faceShape = new THREE.Shape(
    [
      [0, -2.47],
      [0.39, -2.45],
      [0.5, -2.38],
      [0.545, -2.25],
      [0.555, 0.02],
      [0, 0.02],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
  );
  // what each housing does to the water: [media, water in, water out]
  const STAGE = { S1: [0, WATER.raw, WATER.sed], S2: [1, WATER.sed, WATER.gac], S3: [2, WATER.gac, WATER.feed] };
  const chambers = []; // section materials whose water moves with the flow

  /* cartridges as sold (Bbagua product photo): 1 plain white spun polypropylene, 2 white ribbed
     shell with blue end caps, 3 dark carbon block in a white diamond net with white caps */
  const C_R = 0.37,
    C_TOP = -0.14,
    C_BOT = -2.36,
    CUT_C = 1.0;
  const cartShape = new THREE.Shape(
    [
      [0, C_BOT],
      [C_R, C_BOT],
      [C_R, C_TOP],
      [0, C_TOP],
    ].map(([a, b]) => new THREE.Vector2(a, b)),
  );
  const cartTex = (draw) => {
    const t = canvasTex(1024, 1024, draw);
    t.wrapS = THREE.RepeatWrapping;
    return t;
  };
  const capBands = (c, w, h, col, frac) => {
    c.fillStyle = col;
    c.fillRect(0, 0, w, h * frac);
    c.fillRect(0, h * (1 - frac), w, h * frac);
  };
  const cartMat = [
    new THREE.MeshStandardMaterial({
      roughness: 0.95,
      map: cartTex((c, w, h) => {
        c.fillStyle = '#f3f2ee';
        c.fillRect(0, 0, w, h);
        // fibre texture, and a light tan where it has been catching dirt
        for (let i = 0; i < 9000; i++) {
          c.fillStyle = `rgba(${Math.random() < 0.5 ? '160,130,90' : '255,255,255'},${Math.random() * 0.18})`;
          c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 6, 1);
        }
        const gr = c.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, 'rgba(176,140,92,.05)');
        gr.addColorStop(1, 'rgba(176,140,92,.3)');
        c.fillStyle = gr;
        c.fillRect(0, 0, w, h);
      }),
    }),
    new THREE.MeshStandardMaterial({
      roughness: 0.5,
      map: cartTex((c, w, h) => {
        c.fillStyle = '#f4f4f2';
        c.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 16) {
          c.fillStyle = 'rgba(120,130,140,.22)';
          c.fillRect(x, 0, 4, h);
          c.fillStyle = 'rgba(255,255,255,.8)';
          c.fillRect(x + 6, 0, 3, h);
        }
        capBands(c, w, h, '#27a3d6', 0.09);
        c.fillStyle = 'rgba(0,0,0,.12)';
        c.fillRect(0, h * 0.09 - 4, w, 4);
        c.fillRect(0, h * 0.91, w, 4);
      }),
    }),
    new THREE.MeshStandardMaterial({
      roughness: 0.8,
      map: cartTex((c, w, h) => {
        c.fillStyle = '#3a3d41';
        c.fillRect(0, 0, w, h);
        for (let i = 0; i < 6000; i++) {
          c.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`;
          c.fillRect(Math.random() * w, Math.random() * h, 2, 2);
        }
        c.strokeStyle = 'rgba(236,238,240,.85)';
        c.lineWidth = 3;
        for (let k = -h; k < w + h; k += 34) {
          c.beginPath();
          c.moveTo(k, 0);
          c.lineTo(k + h * 0.6, h);
          c.stroke();
          c.beginPath();
          c.moveTo(k, 0);
          c.lineTo(k - h * 0.6, h);
          c.stroke();
        }
        capBands(c, w, h, '#e9e9e6', 0.04);
        c.fillStyle = '#1b1d20';
        c.fillRect(0, 0, w, h * 0.012);
      }),
    }),
  ];
  const capMat = [M.matte(0xefeee9), M.plastic(0x27a3d6), M.plastic(0xe9e9e6)];
  const ribGeo = new THREE.BoxGeometry(0.05, 2.1, 0.05);
  const PORT_A = 0.96; // boss angle from the front, radians
  [
    ['S1', 1.6],
    ['S2', 0],
    ['S3', -1.6],
  ].forEach(([id, x]) => {
    const g = part(id);
    add(g, cylY(0.6, 0.62, 56), M.plastic(), [x, -0.31, 0]);
    add(g, cylY(0.625, 0.07, 56), M.plastic(0xeef1f3), [x, -0.64, 0]);
    add(g, sumpGeo, sumpMat, [x, -0.68, 0]);
    const [media, wIn, wOut] = STAGE[id];
    const sec = sectionMaterial('radial', { inC: wIn.c, outC: wOut.c, speck: wIn.s, speckN: wIn.n, media });
    chambers.push({ id, u: sec.userData.u, kind: 'radial' });
    // water faces at the housing cut
    [CUT_R, -CUT_L].forEach((phi) => {
      const f = add(g, new THREE.ShapeGeometry(faceShape).rotateY(phi - Math.PI / 2), sec, [x, -0.68, 0]);
      f.castShadow = false;
    });
    // the cartridge, cut narrower than the housing so its outside shows as well as its section
    const cartGeo = new THREE.CylinderGeometry(C_R, C_R, C_TOP - C_BOT, 64, 1, true, 0, Math.PI * 2 - CUT_C);
    add(g, cartGeo, cartMat[media], [x, -0.68 + (C_TOP + C_BOT) / 2, 0]).castShadow = false;
    add(g, new THREE.CircleGeometry(C_R, 48, -Math.PI / 2, Math.PI * 2 - CUT_C).rotateX(-Math.PI / 2), capMat[media], [
      x,
      -0.68 + C_TOP,
      0,
    ]);
    [0, -CUT_C].forEach((phi) => {
      add(g, new THREE.ShapeGeometry(cartShape).rotateY(phi - Math.PI / 2), sec, [x, -0.68, 0]).castShadow = false;
    });
    for (let a = 0; a < 14; a++) {
      const ang = (a / 14) * Math.PI * 2;
      if (ang < CUT_R + 0.06 || ang > Math.PI * 2 - CUT_L - 0.06) continue;
      add(g, ribGeo, M.plastic(0xeef1f3), [x + Math.sin(ang) * 0.56, -1.95, Math.cos(ang) * 0.56]);
    }
    [-1, 1].forEach((side) => {
      const bx = x + side * Math.sin(PORT_A) * 0.6,
        bz = Math.cos(PORT_A) * 0.6;
      add(g, new RoundedBoxGeometry(0.2, 0.22, 0.2, 2, 0.04), M.plastic(), [bx, -0.3, bz]);
      elbow(g, [
        [bx, -0.3, bz],
        [x + side * 0.59, -0.3, bz + 0.06],
        [x + side * 0.59, -0.3, 0.57],
      ]);
    });
  });

  /* ---- gauge on the front panel, teed into the stage 3 outlet ---- */
  const ga = part('GA');
  add(ga, cylZ(0.3, 0.09, 40), M.chrome(), [-2.0, 0.45, 0.91]);
  add(ga, cylZ(0.27, 0.07, 32), M.chrome(), [-2.0, 0.45, 0.8]);
  add(ga, cylZ(0.06, 0.1, 6), M.chrome(), [-2.0, 0.45, 0.73]);
  const dial = canvasTex(256, 256, (c) => {
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(128, 128, 124, 0, 7);
    c.fill();
    c.strokeStyle = '#c0261d';
    c.lineWidth = 10;
    c.beginPath();
    c.arc(128, 128, 96, Math.PI * 0.05, Math.PI * 0.35);
    c.stroke();
    c.strokeStyle = '#26303a';
    c.lineWidth = 4;
    for (let i = 0; i <= 10; i++) {
      const r = ((-135 + i * 27) * Math.PI) / 180;
      c.beginPath();
      c.moveTo(128 + Math.sin(r) * 86, 128 - Math.cos(r) * 86);
      c.lineTo(128 + Math.sin(r) * 106, 128 - Math.cos(r) * 106);
      c.stroke();
    }
    c.fillStyle = '#26303a';
    c.font = '600 24px system-ui';
    c.textAlign = 'center';
    c.fillText('kg/cm²', 128, 186);
  });
  add(
    ga,
    new THREE.CircleGeometry(0.255, 40),
    new THREE.MeshStandardMaterial({ map: dial, roughness: 0.4 }),
    [-2.0, 0.45, 0.957],
  );
  const needle = add(ga, new THREE.BoxGeometry(0.018, 0.2, 0.01), M.matte(0x222a30), [-2.0, 0.45, 0.962]);
  needle.geometry.translate(0, 0.08, 0);
  add(ga, cylZ(0.26, 0.01, 40), M.glass(0xffffff, 0.15), [-2.0, 0.45, 0.966]);

  const gt = part('GT'); // T on the back-left corner of the shelf
  add(gt, cylX(0.07, 0.5, 16), M.plastic(0xebe3cc), [-2.35, 0.12, -0.55]);
  add(gt, cylZ(0.07, 0.24, 16), M.plastic(0xebe3cc), [-2.35, 0.12, -0.44]);

  /* ---- membrane housing in two C-clips on the shelf ---- */
  const clipGeo = new THREE.TorusGeometry(0.365, 0.045, 10, 48, 1.45 * Math.PI)
    .rotateZ(-1.225 * Math.PI)
    .rotateY(Math.PI / 2);
  [-0.8, 0.9].forEach((x) => {
    add(bracket, clipGeo, M.plastic(0xf3f2ee), [x, 0.5, -0.1]);
    add(bracket, new RoundedBoxGeometry(0.12, 0.2, 0.5, 2, 0.03), M.plastic(0xf3f2ee), [x, 0.08, -0.1]);
  });
  const s4 = part('S4');
  // housing with a window cut into the front of its feed half (angle measured from +z toward +y)
  const W0 = -0.4,
    W1 = 1.1,
    WX0 = -1.2,
    WX1 = 0.32;
  add(s4, cylX(0.33, WX0 + 1.25, 56), M.plastic(), [(WX0 - 1.25) / 2, 0.5, -0.1]);
  add(s4, cylX(0.33, 1.6 - WX1, 56), M.plastic(), [(WX1 + 1.6) / 2, 0.5, -0.1]);
  add(
    s4,
    new THREE.CylinderGeometry(0.33, 0.33, WX1 - WX0, 56, 1, true, W1, Math.PI * 2 - (W1 - W0)).rotateZ(Math.PI / 2),
    new THREE.MeshPhysicalMaterial({
      color: 0xf2f5f6,
      roughness: 0.38,
      clearcoat: 0.55,
      clearcoatRoughness: 0.3,
      side: THREE.DoubleSide,
    }),
    [(WX0 + WX1) / 2, 0.5, -0.1],
  );
  {
    const sec = sectionMaterial('axial', {
      inC: WATER.feed.c,
      outC: WATER.clean.c,
      rejC: WATER.reject.c,
      speck: WATER.reject.s,
      speckN: 1,
    });
    chambers.push({ id: 'S4', u: sec.userData.u, kind: 'axial' });
    const R = 0.325,
      pos = [],
      idx = [];
    const P = (x, r, th) => pos.push(x, r * Math.sin(th), r * Math.cos(th)) / 3 - 1;
    [W0, W1].forEach((th) => {
      const a = P(WX0, 0, th);
      P(WX1, 0, th);
      P(WX1, R, th);
      P(WX0, R, th);
      idx.push(a, a + 1, a + 2, a, a + 2, a + 3);
    });
    [WX0, WX1].forEach((x) => {
      const c = P(x, 0, 0),
        N = 28;
      for (let i = 0; i <= N; i++) P(x, R, W0 + ((W1 - W0) * i) / N);
      for (let i = 0; i < N; i++) idx.push(c, c + 1 + i, c + 2 + i);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    add(s4, geo, sec, [0, 0.5, -0.1]).castShadow = false;
  }
  add(s4, cylX(0.37, 0.38, 56), M.plastic(0xf3f4f5), [-1.43, 0.5, -0.1]);
  for (let a = 0; a < 16; a++) {
    const ang = (a / 16) * Math.PI * 2;
    add(s4, new THREE.BoxGeometry(0.3, 0.05, 0.05), M.plastic(0xeceff1), [
      -1.43,
      0.5 + Math.sin(ang) * 0.37,
      -0.1 + Math.cos(ang) * 0.37,
    ]);
  }
  add(s4, new THREE.SphereGeometry(0.33, 40, 20).scale(0.35, 1, 1), M.plastic(), [1.6, 0.5, -0.1]);
  add(s4, cylX(0.07, 0.12, 16), M.plastic(0xe6e9eb), [-1.67, 0.5, -0.1]);
  wrapLabel(
    s4,
    0.333,
    0.95,
    1.5,
    [0.95, 0.5, -0.1],
    0.45,
    (c, w, h) => {
      c.fillStyle = '#fff';
      c.beginPath();
      c.ellipse(w / 2, h / 2, w / 2 - 4, h / 2 - 4, 0, 0, 7);
      c.fill();
      c.fillStyle = '#1e409a';
      c.beginPath();
      c.arc(w * 0.3, h / 2, h * 0.3, 0, 7);
      c.fill();
      c.fillStyle = '#fff';
      c.font = `italic 700 ${h * 0.34}px Georgia, serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('Bb', w * 0.3, h / 2 + 2);
      c.fillStyle = '#1e409a';
      c.font = `italic 600 ${h * 0.4}px Figtree, system-ui, sans-serif`;
      c.textAlign = 'left';
      c.fillText('agua', w * 0.43, h / 2);
    },
    true,
  );
  // two-port end (photo): clean product port on top with the check valve, reject port below with the restrictor
  add(s4, cylX(0.075, 0.12, 20), M.plastic(0xf3f4f5), [1.76, 0.6, -0.1]);
  add(s4, cylX(0.075, 0.12, 20), M.plastic(0xf3f4f5), [1.76, 0.4, -0.1]);
  // restrictor (photo): three-section cream capsule inline on the drain line, ~25 cm from the membrane
  const fr = part('FR');
  [
    [0.5, 0.26],
    [0.2, 0.3],
    [-0.1, 0.3],
  ].forEach(([x, l]) => add(fr, cylX(0.1, l - 0.015, 28), M.plastic(0xe9e3d2), [x, 0.4, -0.68]));
  add(fr, cylX(0.088, 0.92, 28), M.plastic(0xd9d2bf), [0.2, 0.4, -0.68]);

  /* ---- coconut carbon post-filter, double-clipped on top of the membrane ---- */
  const s5 = part('S5');
  add(s5, cylX(0.21, 2.3, 40), M.plastic(), [0, 1.12, -0.1]);
  add(s5, new THREE.SphereGeometry(0.21, 32, 16).scale(0.5, 1, 1), M.plastic(), [-1.15, 1.12, -0.1]);
  add(s5, new THREE.SphereGeometry(0.21, 32, 16).scale(0.5, 1, 1), M.plastic(), [1.15, 1.12, -0.1]);
  add(s5, cylX(0.215, 0.05, 40), M.plastic(0xeceff1), [-0.95, 1.12, -0.1]);
  add(s5, cylX(0.1, 0.12, 16), M.plastic(0xeceff1), [-1.31, 1.12, -0.1]);
  add(s5, cylX(0.1, 0.12, 16), M.plastic(0xeceff1), [1.31, 1.12, -0.1]);
  elbow(s5, [
    [-1.36, 1.12, -0.1],
    [-1.45, 1.12, -0.1],
    [-1.45, 1.27, -0.1],
  ]);
  wrapLabel(s5, 0.213, 1.0, 1.7, [0.15, 1.12, -0.1], 0.35, (c, w, h) => {
    c.fillStyle = '#2a6fd0';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff';
    c.textBaseline = 'middle';
    c.textAlign = 'center';
    c.font = `700 ${h * 0.2}px Figtree, system-ui, sans-serif`;
    c.fillText('POSTFILTRO DE CARBÓN COCO', w / 2, h * 0.36);
    c.font = `500 ${h * 0.16}px Figtree, system-ui, sans-serif`;
    c.fillText('Coconut carbon postfilter', w / 2, h * 0.66);
  });
  [-0.55, 0.65].forEach((x) => {
    add(bracket, new THREE.TorusGeometry(0.235, 0.03, 8, 32).rotateY(Math.PI / 2), M.plastic(0xf3f2ee), [
      x,
      1.12,
      -0.1,
    ]);
    add(bracket, new THREE.TorusGeometry(0.355, 0.03, 8, 40, Math.PI).rotateY(Math.PI / 2), M.plastic(0xf3f2ee), [
      x,
      0.5,
      -0.1,
    ]);
    add(bracket, new THREE.BoxGeometry(0.06, 0.2, 0.08), M.plastic(0xf3f2ee), [x, 0.92, -0.1]);
  });

  /* ---- T-fitting screwed onto the post-filter inlet ---- */
  const j = part('J');
  add(j, cylX(0.075, 0.48, 16), M.plastic(0xebe3cc), [1.56, 1.12, -0.1]);
  add(j, cylY(0.075, 0.2, 16), M.plastic(0xebe3cc), [1.62, 1.22, -0.1]);

  /* ---- 4-way valve (photos): two halves stacked face to face, flat faces toward ±x.
     Marked half (moulded IN/OUT, bumps round the rim) on the left, half with 6 screws on the right.
     Each half carries one pair, straight through: IN at the bottom, its OUT directly above.
     Blow test on this unit: the marked half passes air one way only, so it is the clean-water pair,
     with the check valve inside its IN port. The screw half is the feed pair. ---- */
  const v = part('V');
  const VX = 2.87,
    VY = 0.35,
    VZ = 0.25;
  const vw = () => M.plastic(0xf3f1ea);
  add(v, cylX(0.3, 0.2, 40), vw(), [VX - 0.12, VY, VZ]);
  add(v, cylX(0.3, 0.2, 40), vw(), [VX + 0.12, VY, VZ]);
  add(v, cylX(0.27, 0.05, 40), M.plastic(0xe2dfd6), [VX, VY, VZ]);
  [-0.18, -0.06, 0.06, 0.18].forEach((dy) =>
    add(v, new THREE.BoxGeometry(0.05, 0.05, 0.6 - Math.abs(dy) * 0.9), vw(), [VX - 0.235, VY + dy, VZ]),
  );
  add(v, new THREE.BoxGeometry(0.06, 0.6, 0.16), vw(), [VX - 0.24, VY, VZ]);
  for (let a = 0; a < 8; a++) {
    const ang = Math.PI / 8 + (a / 8) * Math.PI * 2;
    add(v, new THREE.SphereGeometry(0.06, 14, 10), vw(), [
      VX - 0.18,
      VY + Math.sin(ang) * 0.31,
      VZ + Math.cos(ang) * 0.31,
    ]);
  }
  for (let a = 0; a < 6; a++) {
    const ang = (a / 6) * Math.PI * 2;
    add(v, cylX(0.03, 0.03, 12), M.chrome(), [VX + 0.235, VY + Math.sin(ang) * 0.25, VZ + Math.cos(ang) * 0.25]);
  }
  [-0.12, 0.12].forEach((dx) => {
    [
      [-1, 'IN'],
      [1, 'OUT'],
    ].forEach(([dir, kind]) => {
      add(v, cylY(0.06, 0.2, 16), M.plastic(0xebe3cc), [VX + dx, VY + dir * 0.4, VZ]);
      add(v, cylY(0.068, 0.04, 16), M.matte(kind === 'IN' ? 0x1d8a57 : 0xcf5420), [VX + dx, VY + dir * 0.33, VZ]);
    });
  });

  const cv = part('CV');
  add(cv, cylY(0.05, 0.08, 16), M.plastic(0xe9e3d2), [VX - 0.12, VY - 0.48, VZ]);
  add(cv, cylY(0.02, 0.085, 10), M.matte(0x6b5f48), [VX - 0.12, VY - 0.48, VZ]);

  /* ---- pressure tank (photo): squat white tank, plastic shut-off valve with blue lever on top,
     recessed air valve underneath. Water is stored ABOVE a rubber diaphragm, the air charge below it.
     Drawn as a cutaway so the diaphragm can be seen moving. ---- */
  const tk = part('TK');
  const TX = 4.7,
    TZ = -0.1,
    TB = -3.35;
  const prof = [
    [0, 0],
    [0.95, 0],
    [1.1, 0.05],
    [1.15, 0.18],
    [1.15, 2.2],
    [1.1, 2.55],
    [0.95, 2.8],
    [0.6, 2.96],
    [0, 3.0],
  ];
  const radiusAt = (y, scale = 1) => {
    for (let i = 1; i < prof.length; i++) {
      const [r0, y0] = prof[i - 1],
        [r1, y1] = prof[i];
      if (y >= y0 && y <= y1) return (r0 + (r1 - r0) * ((y - y0) / (y1 - y0 || 1))) * scale;
    }
    return 0;
  };
  // the front-right quarter is cut away (lathe angle π/2 → 2π leaves out the +x/+z quarter)
  const CUT0 = Math.PI / 2,
    CUTL = Math.PI * 1.5;
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: 0xf1f0eb,
    roughness: 0.45,
    clearcoat: 0.4,
    side: THREE.DoubleSide,
  });
  const shell = add(
    tk,
    new THREE.LatheGeometry(
      prof.map(([r, y]) => new THREE.Vector2(Math.max(0.001, r), y)),
      72,
      CUT0,
      CUTL,
    ),
    shellMat,
    [TX, TB, TZ],
  );
  shell.castShadow = true;
  add(
    tk,
    new THREE.TorusGeometry(1.155, 0.022, 8, 72, Math.PI * 1.5).rotateX(Math.PI / 2).rotateY(Math.PI),
    M.plastic(0xe6e5df),
    [TX, TB + 0.95, TZ],
  );
  // top valve: ribbed collar, white elbow body, blue lever, threaded outlet pointing at the unit
  add(tk, cylY(0.16, 0.1, 24), M.plastic(0xe9e8e2), [TX, TB + 3.03, TZ]);
  for (let a = 0; a < 18; a++) {
    const ang = (a / 18) * Math.PI * 2;
    add(tk, new THREE.BoxGeometry(0.03, 0.1, 0.03), M.plastic(0xe0dfd9), [
      TX + Math.cos(ang) * 0.165,
      TB + 3.03,
      TZ + Math.sin(ang) * 0.165,
    ]);
  }
  add(tk, cylY(0.09, 0.26, 20), M.plastic(0xf6f6f4), [TX, TB + 3.2, TZ]);
  add(tk, cylX(0.075, 0.26, 20), M.plastic(0xf6f6f4), [TX - 0.14, TB + 3.23, TZ]);
  add(tk, new RoundedBoxGeometry(0.1, 0.24, 0.07, 2, 0.03), M.matte(0x1e5fc0), [TX, TB + 3.42, TZ + 0.02]);
  // inside, as a solid cross-section: water on top, rubber diaphragm, air charge below
  const innerR = (y) => radiusAt(Math.min(2.94, Math.max(0.06, y))) * 0.955;
  const regionMats = {
    water: new THREE.MeshPhysicalMaterial({
      color: WATER.clean.c,
      roughness: 0.15,
      clearcoat: 0.6,
      emissive: 0x0a3d66,
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide,
    }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x2b3136, roughness: 0.8, side: THREE.DoubleSide }),
    air: new THREE.MeshStandardMaterial({ color: 0xe8edf2, roughness: 0.9, side: THREE.DoubleSide }),
  };
  const waterMat = regionMats.water;
  // Built once. Water and air are full-height solids clipped at the diaphragm, which just moves:
  // no geometry is rebuilt while the level animates.
  const waterClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // keeps y above the diaphragm
  const airClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0); // keeps y below it
  regionMats.water.clippingPlanes = [waterClip];
  regionMats.air.clippingPlanes = [airClip];
  function solid(k, ya, yb) {
    const g = new THREE.Group();
    g.position.set(TX, TB, TZ);
    tk.add(g);
    const pts = [new THREE.Vector2(0.001, ya)];
    for (let i = 0; i <= 24; i++) {
      const y = ya + ((yb - ya) * i) / 24;
      pts.push(new THREE.Vector2(innerR(y), y));
    }
    pts.push(new THREE.Vector2(0.001, yb));
    const shape = new THREE.Shape(pts);
    [
      new THREE.LatheGeometry(pts, 60, CUT0, CUTL),
      new THREE.ShapeGeometry(shape),
      new THREE.ShapeGeometry(shape).rotateY(-Math.PI / 2),
    ].forEach((geo) => {
      const m = new THREE.Mesh(geo, regionMats[k]);
      m.castShadow = false;
      g.add(m);
    });
  }
  solid('water', 0.06, 2.94);
  solid('air', 0.06, 2.94);
  const rubber = add(tk, new THREE.CylinderGeometry(1, 1, 0.07, 60, 1, false, CUT0, CUTL), regionMats.rubber, [
    TX,
    0,
    TZ,
  ]);
  rubber.castShadow = false;
  const tankLbl = (txt, cls) => {
    const l = label(txt, `tlbl ${cls}`);
    l.element.tabIndex = -1;
    tk.add(l);
    return l;
  };
  const lblWater = tankLbl('Water', 'w'),
    lblAir = tankLbl('Air charge', 'a');
  let level = 0.45,
    levelTarget = 0.45;
  function applyLevel(l) {
    // l = how full. Water enters from the top and pushes the diaphragm down, squeezing the air.
    const y = 2.8 - l * 2.45,
      wy = TB + y;
    waterClip.constant = -(wy + 0.035);
    airClip.constant = wy - 0.035;
    rubber.position.y = wy;
    const r = innerR(y);
    rubber.scale.set(r, 1, r);
    lblWater.position.set(TX + 0.45, TB + (y + 2.94) / 2, TZ + 0.02);
    lblAir.position.set(TX + 0.45, TB + (0.06 + y) / 2, TZ + 0.02);
    lblWater.element.style.opacity = 2.94 - y > 0.35 ? 1 : 0;
    lblAir.element.style.opacity = y > 0.35 ? 1 : 0;
  }

  /* ---- faucet on the countertop (not photographed yet) ---- */
  const ft = part('FT');
  add(ft, cylY(0.17, 0.08, 32), M.chrome(), [3.8, 3.26, 0.3]);
  add(ft, cylY(0.075, 1.0, 24), M.chrome(), [3.8, 3.8, 0.3]);
  add(
    ft,
    new THREE.TubeGeometry(
      roundedPath(
        [
          [3.8, 4.25, 0.3],
          [3.8, 4.65, 0.3],
          [3.15, 4.65, 0.3],
          [3.15, 4.35, 0.3],
        ],
        0.28,
      ),
      48,
      0.06,
      16,
    ),
    M.chrome(),
  );
  add(ft, new RoundedBoxGeometry(0.34, 0.07, 0.07, 2, 0.03), M.chrome(), [4.0, 3.95, 0.3], [0, 0, -0.35]);
  const drip = add(
    ft,
    new THREE.SphereGeometry(0.035, 12, 10),
    new THREE.MeshPhysicalMaterial({ color: 0x8fdcf5, transparent: true, opacity: 0, emissive: 0x2a8fb8 }),
    [3.15, 4.28, 0.3],
  );
  drip.castShadow = false;
  const DRIP_X = 3.15;

  // countertop as a faint outline only, so it never hides the unit
  const top = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(10.8, 0.2, 2.8)),
    new THREE.LineBasicMaterial({ color: 0x7d8aa6, transparent: true, opacity: 0.3 }),
  );
  top.position.set(0.2, 3.1, -0.2);
  root.add(top);

  // dark theme: tone the white plastic down so it doesn't glare, and make the floor shadow read on navy
  onTheme((dark) => {
    renderer.toneMappingExposure = dark ? 0.86 : 1.05;
    scene.environmentIntensity = dark ? 0.62 : 0.85;
    hemi.intensity = dark ? 0.7 : 0.9;
    hemi.groundColor.set(dark ? 0x2a3550 : 0x5a6478);
    floor.material.color.set(dark ? 0x000000 : 0x142033);
    floor.material.opacity = dark ? 0.42 : 0.14;
    top.material.color.set(dark ? 0x8fa3cc : 0x7d8aa6);
    top.material.opacity = dark ? 0.22 : 0.3;
  });

  /* ---- waste pipe + drain collar (not photographed yet) ---- */
  add(
    root,
    new THREE.TubeGeometry(
      roundedPath(
        [
          [-4.4, 3.0, 0],
          [-4.4, 0.4, 0],
          [-4.4, 0.4, -1.8],
        ],
        0.4,
      ),
      40,
      0.2,
      24,
    ),
    M.plastic(0xc9d0d4),
  );
  const dr = part('DR');
  add(dr, cylY(0.26, 0.26, 32), M.plastic(0xe9eff2), [-4.4, 2.0, 0]);
  nipple(dr, [-4.2, 2.0, 0], 'x');

  /* ---- cold supply + adapter (photo): chrome inline tee, female nut below onto the angle stop,
     male thread above for the cold hose, side ball valve with blue lever feeding the unit ---- */
  const src = part('SRC');
  add(
    src,
    new THREE.TubeGeometry(
      roundedPath([
        [-4.0, -2.65, -1.8],
        [-4.0, -2.65, -1.05],
      ]),
      8,
      0.08,
      16,
    ),
    M.chrome(),
  );
  add(src, new THREE.SphereGeometry(0.15, 24, 16), M.chrome(), [-4.0, -2.65, -0.95]);
  add(src, new RoundedBoxGeometry(0.28, 0.07, 0.12, 2, 0.03), M.chrome(), [-4.0, -2.65, -0.78]);
  add(src, cylY(0.12, 0.16, 6), M.chrome(), [-4.0, -2.42, -0.95]);
  add(src, cylY(0.09, 0.2, 24), M.chrome(), [-4.0, -2.24, -0.95]);
  add(src, cylY(0.06, 0.16, 20), M.chrome(), [-4.0, -2.06, -0.95]);
  add(src, cylX(0.07, 0.24, 20), M.chrome(), [-3.86, -2.25, -0.95]);
  add(src, cylX(0.06, 0.08, 6), M.chrome(), [-3.72, -2.25, -0.95]);
  add(src, new RoundedBoxGeometry(0.3, 0.07, 0.1, 2, 0.03), M.matte(0x1e5fc0), [-3.86, -2.13, -0.85], [0, 0.5, 0]);
  add(
    src,
    new THREE.TubeGeometry(
      roundedPath([
        [-4.0, -1.98, -0.95],
        [-4.0, 3.0, -0.95],
      ]),
      40,
      0.07,
      12,
    ),
    M.matte(0x9aa4a9),
  );

  /* ---------------- tubes ---------------- */
  const tubes = {};
  const TUBE_OPTS = {
    k11: { nuts: [true, false] },
    k12: { nuts: [false, false], base: 0x24292d },
  };
  Object.entries(ROUTES).forEach(([id, pts]) => {
    const w = WATER[TUBE_WATER[id]];
    const t = makeTube(pts, TUBES[CONNS[id].tube].hex, {
      ...TUBE_OPTS[id],
      water: { ...w, see: id === 'k12' ? 0.18 : 1 },
    });
    t.mesh.userData.conn = id;
    t.hit.userData.conn = id;
    t.extras.forEach((e) => (e.userData.conn = id));
    root.add(t.mesh);
    tubes[id] = t;
  });

  /* ---------------- labels ---------------- */
  const LBL = {
    S1: ['<b>1</b>Sediment', [1.6, -1.75, 0.62]],
    S2: ['<b>2</b>Granular carbon', [0, -1.75, 0.62]],
    S3: ['<b>3</b>Carbon block', [-1.6, -1.75, 0.62]],
    S4: ['<b>4</b>Membrane', [0.95, 0.5, 0.36]],
    S5: ['<b>5</b>Post-filter', [0.15, 1.12, 0.17]],
    V: ['4-way valve', [2.87, -0.4, 0.45]],
    GA: ['Gauge', [-2.0, 0.88, 0.95]],
    TK: ['Tank · 8 L', [4.7, -2.4, 1.25]],
    FT: ['Faucet', [3.5, 4.95, 0.3]],
    SRC: ['Cold supply', [-4.0, -2.95, -0.8]],
    DR: ['Drain', [-4.4, 1.7, 0.3]],
    FR: ['Restrictor', [-0.15, 0.15, -0.68]],
  };
  Object.entries(LBL).forEach(([id, [html, pos]]) => {
    // the name sits in its own span so small screens can collapse a badge to its marker
    const l = label(
      html.replace(/^(<b>\d<\/b>)?(.*)$/, '$1<span class="t">$2</span>'),
      `lbl${html.startsWith('<b>') ? ' stage' : ''}`,
    );
    l.position.set(...pos);
    l.element.setAttribute('aria-label', PARTS[id].t);
    l.element.addEventListener('click', (e) => {
      e.stopPropagation();
      select({ type: 'node', id });
    });
    l.element.addEventListener('pointerenter', () => setHover({ type: 'node', id }));
    l.element.addEventListener('pointerleave', () => setHover(null));
    root.add(l);
    labels[id] = l;
  });

  /* ---------------- materials registry for highlight ---------------- */
  Object.values(parts).forEach((g) =>
    g.traverse((o) => {
      if (o.isMesh) {
        o.userData.part = g.userData.id;
        o.material.userData.baseEmissive = o.material.emissive?.clone();
      }
    }),
  );

  /* ---------------- state ---------------- */
  const state = { mode: 'making', hover: null, sel: null, highlight: null, hiColor: null };
  const flowT = {}; // per-tube animated values
  Object.keys(tubes).forEach(
    (id) => (flowT[id] = { flow: 0, sat: 1, op: 1, glow: 0, dir: 1, phase: Math.random() * 9 }),
  );
  let unitFlow = 0,
    chamberPhase = 0;

  function partGlow(id, amt) {
    parts[id]?.traverse((o) => {
      if (!o.isMesh || !o.material.emissive) return;
      const base = o.material.userData.baseEmissive || new THREE.Color(0);
      o.material.emissive.copy(base).lerp(new THREE.Color(0x1e409a), amt);
    });
  }
  function refreshPartGlow() {
    Object.keys(parts).forEach((id) => {
      const sel = state.sel?.type === 'node' && state.sel.id === id;
      const hov = state.hover?.type === 'node' && state.hover.id === id;
      partGlow(id, sel ? 0.42 : hov ? 0.22 : 0);
      labels[id]?.element.classList.toggle('on', sel);
    });
    // restore water look
    waterMat.emissive.set(0x0a3d66);
  }
  function setHover(h) {
    state.hover = h;
    refreshPartGlow();
    renderer.domElement.style.cursor = h ? 'pointer' : '';
  }

  function select(s, { fly = true } = {}) {
    state.sel = s;
    refreshPartGlow();
    if (fly && s?.type === 'node') focus(s.id);
    onSelect?.(s);
  }

  /* ---------------- camera ---------------- */
  const viewDir = new THREE.Vector3(0.22, 0.42, 1).normalize();
  // screen-space insets (px) covered by UI; the model is framed in what's left
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const off = { x: 0, y: 0, tx: 0, ty: 0 };
  function setInset(i) {
    Object.assign(inset, i);
    off.tx = (inset.right - inset.left) / 2;
    off.ty = (inset.bottom - inset.top) / 2;
    fitLimits();
  }
  // a tall phone screen needs the camera much further back to fit the unit's width
  function fitLimits() {
    controls.maxDistance = Math.max(30, overviewDist() * 1.3);
  }
  function overviewDist() {
    const fov = THREE.MathUtils.degToRad(camera.fov / 2);
    const W = host.clientWidth || 1,
      H = host.clientHeight || 1;
    const fw = Math.max(0.3, (W - inset.left - inset.right) / W);
    const fh = Math.max(0.3, (H - inset.top - inset.bottom) / H);
    const w = 11.0 / fw,
      h = 8.9 / fh;
    return Math.max(h / 2 / Math.tan(fov), w / 2 / (Math.tan(fov) * camera.aspect));
  }
  const OVERVIEW_T = new THREE.Vector3(0.4, 0.7, 0);
  function flyTo(t, d, dur = 1.0, dir = viewDir) {
    const t0 = controls.target.clone(),
      p0 = camera.position.clone();
    const t1 = new THREE.Vector3(...t);
    // keep the current horizontal heading a little, blend toward preferred direction
    const cur = p0.clone().sub(t0).normalize();
    const d1 = cur.lerp(dir, 0.65).normalize();
    const p1 = t1.clone().add(d1.multiplyScalar(d));
    tw.add(
      dur,
      (k) => {
        controls.target.lerpVectors(t0, t1, k);
        camera.position.lerpVectors(p0, p1, k);
      },
      { key: 'cam', e: ease.smooth },
    );
  }
  function focus(idOrCam) {
    const f = typeof idOrCam === 'string' ? FOCUS[idOrCam] : idOrCam;
    if (f)
      flyTo(f.t, f.d * (camera.aspect < 1 ? 1.6 : 1), 1.0, f.dir ? new THREE.Vector3(...f.dir).normalize() : viewDir);
  }
  function overview(dur = 1.0) {
    flyTo(OVERVIEW_T.toArray(), overviewDist(), dur);
  }

  /* ---------------- modes / highlight ---------------- */
  function setMode(name) {
    state.mode = name;
    levelTarget = MODES[name].lvl;
  }
  function highlight(ids) {
    state.highlight = ids?.length ? new Set(ids) : null;
  }
  function highlightColor(c) {
    state.hiColor = c;
  }

  /* ---------------- picking ---------------- */
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  const pickables = [];
  root.traverse((o) => {
    if (o.isMesh && (o.userData.part || o.userData.conn)) pickables.push(o);
  });
  function pick(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    if (!hit) return null;
    const o = hit.object;
    if (o.userData.conn) return { type: 'conn', id: o.userData.conn };
    return { type: 'node', id: o.userData.part };
  }
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => {
    down = [e.clientX, e.clientY];
  });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
    select(pick(e));
  });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.buttons) return;
    const h = pick(e);
    if (JSON.stringify(h) !== JSON.stringify(state.hover)) setHover(h);
  });
  renderer.domElement.addEventListener('pointerleave', () => setHover(null));

  /* ---------------- intro ---------------- */
  const introOrder = ['BR', 'S1', 'S2', 'S3', 'GA', 'GT', 'S4', 'CV', 'FR', 'S5', 'J', 'V', 'SRC', 'TK', 'DR', 'FT'];
  function intro() {
    Object.values(tubes).forEach((t) => setTubeReveal(t.mesh, reduceMotion ? 1 : 0));
    Object.values(labels).forEach((l) => l.element.classList.add('pre'));
    introOrder.forEach((id, i) => {
      const g = id === 'BR' ? bracket : parts[id];
      const c = new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3());
      const put = (k) => {
        const s = Math.max(0.001, k);
        g.scale.setScalar(s);
        g.position.copy(c).multiplyScalar(1 - s);
        g.position.y += 1.2 * (1 - Math.min(1, k));
      };
      put(reduceMotion ? 1 : 0);
      tw.add(0.9, put, { delay: 0.25 + i * 0.07, e: ease.back });
    });
    const order = ['k1', 'k2', 'k3', 'k4', 'kG', 'k4b', 'k5', 'k6', 'k11', 'k12', 'k7', 'k8', 'k10'];
    order.forEach((id, i) =>
      tw.add(0.7, (k) => setTubeReveal(tubes[id].mesh, k), { delay: 1.2 + i * 0.12, e: ease.out }),
    );
    fillWater(reduceMotion ? 0 : 2.9);
    Object.values(labels).forEach((l, i) =>
      setTimeout(() => l.element.classList.remove('pre'), reduceMotion ? 0 : 2400 + i * 40),
    );
    // camera swing-in
    const d = overviewDist();
    camera.position.copy(OVERVIEW_T).add(new THREE.Vector3(-0.9, 0.55, 0.6).normalize().multiplyScalar(d * 1.5));
    controls.target.copy(OVERVIEW_T);
    flyTo(OVERVIEW_T.toArray(), d, 2.8, viewDir);
  }

  /** Water runs in along the flow: each tube fills from its start, each housing from the bottom up. */
  function fillWater(t0) {
    const tube = (id) => tubes[id].mat.userData.u.uFront;
    const ch = (id) => chambers.find((c) => c.id === id).u.uLevel;
    const steps = [
      [['k1'], 0.9],
      [['S1'], 0.55],
      [['k2'], 0.3],
      [['S2'], 0.55],
      [['k3'], 0.3],
      [['S3'], 0.55],
      [['k4'], 0.5],
      [['kG', 'k4b'], 0.6],
      [['k5'], 0.55],
      [['S4'], 0.6],
      [['k6', 'k11'], 0.4],
      [['k7', 'k12'], 0.5],
      [['k8', 'k10'], 0.6],
    ];
    let at = t0;
    steps.forEach(([ids, dur]) => {
      ids.forEach((id) => {
        const c = chambers.find((x) => x.id === id);
        const [u, from, to] = c
          ? c.kind === 'radial'
            ? [ch(id), -2.5, 0.05]
            : [ch(id), -1.3, 1.7]
          : [tube(id), 0, 1.02];
        u.value = from;
        tw.add(dur, (k) => (u.value = from + (to - from) * k), {
          delay: at,
          e: c ? ease.inOut : (k) => k,
          done: () => (u.value = c ? 9 : 2),
        });
      });
      at += dur * 0.85;
    });
    if (!t0)
      [...Object.values(tubes).map((t) => t.mat.userData.u.uFront), ...chambers.map((c) => c.u.uLevel)].forEach(
        (u) => (u.value = 9),
      );
  }

  /* ---------------- loop ---------------- */
  const GREY = new THREE.Color(0xb8bcc2);
  const clock = new THREE.Clock();
  let running = true,
    time = 0;
  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    time += dt;
    tw.update(dt);
    controls.update();
    off.x = damp(off.x, off.tx, 6, dt);
    off.y = damp(off.y, off.ty, 6, dt);
    const W = host.clientWidth,
      H = host.clientHeight;
    camera.setViewOffset(W, H, off.x, off.y, W, H);

    const m = MODES[state.mode];
    Object.entries(tubes).forEach(([id, t]) => {
      const f = flowT[id];
      const on = m.on.includes(id);
      const lit = state.highlight ? state.highlight.has(id) : true;
      const colorHit = state.hiColor ? CONNS[id].tube === state.hiColor : true;
      const sel = state.sel?.type === 'conn' && state.sel.id === id;
      const hov = state.hover?.type === 'conn' && state.hover.id === id;
      f.flow = damp(f.flow, on ? (lit ? 1 : 0.35) : 0, 8, dt);
      f.sat = damp(f.sat, lit && colorHit ? 1 : 0.12, 9, dt);
      f.op = damp(f.op, lit && colorHit ? 1 : 0.28, 9, dt);
      f.glow = damp(f.glow, sel ? 0.5 : hov ? 0.3 : state.highlight?.has(id) ? 0.12 : 0, 12, dt);
      f.dir = damp(f.dir, m.rev.includes(id) ? -1 : 1, 4, dt);
      f.phase += dt * f.flow * f.dir * WATER[TUBE_WATER[id]].v * (reduceMotion ? 0.25 : 1);
      const u = t.mat.userData.u;
      u.uPhase.value = f.phase;
      u.uSat.value = f.sat;
      u.uGlow.value = f.glow;
      u.uFill.value = 0.62 + 0.38 * f.flow;
      const transp = f.op < 0.985;
      if (t.mat.transparent !== transp) {
        t.mat.transparent = transp;
        t.mat.needsUpdate = true;
      }
      t.mat.opacity = f.op;
      t.mat.depthWrite = !transp;
      // colour-code bands follow the same dimming, and glow with hover/selection
      const rm = t.ringMat;
      rm.color.copy(rm.userData.code).lerp(GREY, 1 - f.sat);
      rm.emissive.copy(rm.userData.code).multiplyScalar(f.glow * 0.8);
      if (rm.transparent !== transp) {
        rm.transparent = transp;
        rm.needsUpdate = true;
      }
      rm.opacity = f.op;
    });

    // water inside the housings and the membrane keeps moving while the unit makes water
    unitFlow = damp(unitFlow, m.on.length ? 1 : 0, 3, dt);
    chamberPhase += dt * unitFlow * (reduceMotion ? 0.2 : 0.55);
    chambers.forEach((c) => (c.u.uPhase.value = chamberPhase));

    level = damp(level, levelTarget, 2.2, dt);
    applyLevel(level + Math.sin(time * 2.2) * 0.004);
    // gauge needle breathes with the mode
    needle.rotation.z =
      damp(needle.rotation.z, state.mode === 'full' ? -0.9 : state.mode === 'tap' ? 0.2 : -0.3, 2, dt) +
      Math.sin(time * 9) * 0.004;
    // faucet drip
    if (state.mode === 'tap') {
      const k = (time * 1.6) % 1;
      drip.position.x = DRIP_X;
      drip.position.y = 4.28 - k * 1.0;
      drip.material.opacity = 1 - k;
      drip.scale.setScalar(0.6 + k * 0.6);
    } else drip.material.opacity = damp(drip.material.opacity, 0, 6, dt);

    renderer.render(scene, camera);
    // zoomed in, there is room for the full names (small screens collapse them otherwise)
    css.domElement.classList.toggle('near', camera.position.distanceTo(controls.target) < overviewDist() * 0.55);
    css.render(scene, camera);
  }

  function resize() {
    const w = host.clientWidth,
      h = host.clientHeight;
    renderer.setSize(w, h);
    css.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fitLimits();
  }
  new ResizeObserver(resize).observe(host);
  resize();

  // pause rendering when off-screen
  new IntersectionObserver(([e]) => {
    const vis = e.isIntersecting;
    if (vis && !running) {
      running = true;
      clock.getDelta();
      frame();
    } else if (!vis) running = false;
  }).observe(host);

  if (inset0) {
    setInset(inset0);
    off.x = off.tx;
    off.y = off.ty;
  }
  intro();
  frame();
  applyLevel(level);

  return {
    setInset,
    setMode,
    select,
    focus,
    overview,
    highlight,
    highlightColor,
    get mode() {
      return state.mode;
    },
  };
}
