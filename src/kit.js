import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Follows the system theme, live. fn(isDark) runs now and on every change. */
const darkMQ = matchMedia('(prefers-color-scheme: dark)');
export function onTheme(fn) {
  fn(darkMQ.matches);
  darkMQ.addEventListener('change', (e) => fn(e.matches));
}

export const v3 = (p) => (p.isVector3 ? p.clone() : new THREE.Vector3(p[0], p[1], p[2] ?? 0));

/** Polyline with rounded corners, as a THREE.CurvePath (arc-length parametrised). */
export function roundedPath(pts, r = 0.16) {
  const P = pts.map(v3);
  const path = new THREE.CurvePath();
  let cur = P[0].clone();
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1],
      b = P[i],
      c = P[i + 1];
    if (!c) {
      path.add(new THREE.LineCurve3(cur, b.clone()));
      break;
    }
    const l1 = a.distanceTo(b),
      l2 = b.distanceTo(c),
      rr = Math.min(r, l1 / 2, l2 / 2);
    const p1 = b.clone().add(a.clone().sub(b).setLength(rr));
    const p2 = b.clone().add(c.clone().sub(b).setLength(rr));
    if (cur.distanceTo(p1) > 1e-4) path.add(new THREE.LineCurve3(cur, p1));
    path.add(new THREE.QuadraticBezierCurve3(p1, b.clone(), p2));
    cur = p2;
  }
  return path;
}

/* ---------- materials ---------- */
export const M = {
  plastic: (c = 0xf2f5f6) =>
    new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.38, clearcoat: 0.55, clearcoatRoughness: 0.3 }),
  matte: (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 }),
  chrome: () => new THREE.MeshStandardMaterial({ color: 0xf4f6f8, metalness: 1, roughness: 0.14 }),
  glass: (c = 0xeaf6fa, o = 0.22) =>
    new THREE.MeshPhysicalMaterial({
      color: c,
      roughness: 0.08,
      metalness: 0,
      clearcoat: 1,
      transparent: true,
      opacity: o,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
};

/** Small GLSL helpers shared by the water shaders. */
export const GLSL_NOISE = `
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
// specks: one per grid cell (if the cell is picked), soft round dot
float specks(vec2 g, float amount, float size) {
  vec2 id = floor(g), f = fract(g) - .5;
  vec2 o = vec2(h21(id + 7.1), h21(id + 3.3)) - .5;
  return step(h21(id), amount) * (1. - smoothstep(size * .55, size, length(f - o * .5)));
}`;

/** White tube material. Water shows through the wall: its colour says how filtered it is,
 *  specks ride along with dirty water, and the stream moves with the flow. */
export const TUBE_WHITE = 0xf2f0ea;
export function flowMaterial(code, base = TUBE_WHITE, water = {}) {
  const m = new THREE.MeshPhysicalMaterial({ color: base, roughness: 0.4, clearcoat: 0.55, clearcoatRoughness: 0.25 });
  const u = {
    uPhase: { value: 0 },
    uFill: { value: 0.6 },
    uFront: { value: 2 },
    uLen: { value: 1 },
    uSee: { value: water.see ?? 1 },
    uSat: { value: 1 },
    uGlow: { value: 0 },
    uCode: { value: new THREE.Color(code) },
    uWater: { value: new THREE.Color(water.c ?? 0x449bd6) },
    uSpeck: { value: new THREE.Color(water.s ?? 0xffffff) },
    uSpeckN: { value: water.n ?? 0 },
  };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader =
      'varying vec2 vTubeUV;\n' +
      sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vTubeUV = uv;');
    sh.fragmentShader =
      `uniform float uPhase, uFill, uFront, uLen, uSee, uSat, uGlow, uSpeckN;
uniform vec3 uCode, uWater, uSpeck;
varying vec2 vTubeUV;
${GLSL_NOISE}
` +
      sh.fragmentShader
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
        diffuseColor.rgb = mix(diffuseColor.rgb, uCode, clamp(uGlow * 1.6, 0., .85));`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
        {
          float x = vTubeUV.x * uLen, ang = vTubeUV.y * 6.2832;
          float front = uFront * uLen;
          float filled = 1. - smoothstep(front - .2, front, x);
          // the wall reads white at the rim, the water shows where the tube faces you
          float facing = abs(dot(normal, normalize(vViewPosition)));
          float a = uFill * uSee * filled * smoothstep(.05, .6, facing);
          float c = cos(ang), s = sin(ang);
          float broad = vnoise(vec2(x * 1.4 - uPhase * 1.1, c * .9 + s * .4));
          float fine = vnoise(vec2(x * 5. - uPhase * 2.3, c * 2.2 + 5.));
          vec3 w = uWater * (.78 + .26 * broad) + vec3(.12) * smoothstep(.68, .94, fine);
          float sp = specks(vec2(x * 10. - uPhase * 2.4, vTubeUV.y * 10.), uSpeckN * .5, .2);
          w = mix(w, uSpeck, sp * .9);
          // a little foam on the water front while it fills
          float foam = smoothstep(front - .5, front - .05, x) * filled * step(uFront, 1.);
          w = mix(w, vec3(.93, .96, 1.), foam * .7);
          w = mix(vec3(dot(w, vec3(.299, .587, .114))), w, uSat);
          diffuseColor.rgb = mix(diffuseColor.rgb, w * .82, a * .92);
          totalEmissiveRadiance += w * a * .06;
        }
        { float g = dot(diffuseColor.rgb, vec3(.299,.587,.114)); diffuseColor.rgb = mix(vec3(g), diffuseColor.rgb, uSat); }`,
        );
  };
  return m;
}

const nutGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.11, 6);
const ringGeo = new THREE.CylinderGeometry(0.066, 0.066, 0.09, 20);
const nutMat = new THREE.MeshPhysicalMaterial({ color: 0xebe3cc, roughness: 0.5, clearcoat: 0.3 });

/** White tube with a hex nut and a colour-code band at each end. */
export function makeTube(points, code, { radius = 0.055, corner = 0.16, nuts = true, base, water } = {}) {
  const nutAt = Array.isArray(nuts) ? nuts : [nuts, nuts];
  const curve = roundedPath(points, corner);
  const len = curve.getLength();
  const radial = 12,
    seg = Math.max(8, Math.ceil(len * 40));
  const geo = new THREE.TubeGeometry(curve, seg, radius, radial, false);
  const mat = flowMaterial(code, base, water);
  mat.userData.u.uLen.value = len;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.userData.stride = radial * 6;
  mesh.userData.total = geo.index.count;
  const hit = new THREE.Mesh(
    new THREE.TubeGeometry(curve, seg, radius * 2.6, 6, false),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
  );
  mesh.add(hit);
  const extras = [];
  const ringMat = new THREE.MeshStandardMaterial({ color: code, roughness: 0.45 });
  ringMat.userData.code = new THREE.Color(code);
  const up = new THREE.Vector3(0, 1, 0);
  [
    [0, 1],
    [1, -1],
  ].forEach(([t, sgn], end) => {
    const nut = nutAt[end];
    const p = curve.getPointAt(t),
      tan = curve.getTangentAt(t).multiplyScalar(sgn); // tan points into the tube
    const q = new THREE.Quaternion().setFromUnitVectors(up, tan.clone().normalize());
    if (nut) {
      const n = new THREE.Mesh(nutGeo, nutMat);
      n.position.copy(p).addScaledVector(tan, 0.055);
      n.quaternion.copy(q);
      n.castShadow = true;
      mesh.add(n);
      extras.push(n);
    }
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(p).addScaledVector(tan, nut ? 0.17 : 0.08);
    ring.quaternion.copy(q);
    mesh.add(ring);
    extras.push(ring);
  });
  return { mesh, hit, curve, len, mat, ringMat, extras };
}

/** Reveal a tube along its length, 0..1 */
export function setTubeReveal(mesh, t) {
  const { stride, total } = mesh.userData;
  mesh.geometry.setDrawRange(0, t >= 1 ? Infinity : Math.floor((total / stride) * t) * stride);
  mesh.children.forEach((c, i) => {
    if (i > 0) c.visible = t > 0.97;
  });
}

/* ---------- labels ---------- */
export function label(html, cls = 'lbl') {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = cls;
  el.innerHTML = html;
  const obj = new CSS2DObject(el);
  return obj;
}

/* ---------- tweens ---------- */
export const ease = {
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  out: (t) => 1 - (1 - t) ** 3,
  // quick to start, gentle to land: camera moves feel immediate without a jerk
  smooth: (t) => 1 - (1 - t) ** 4,
  back: (t) => {
    const c = 1.5;
    return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
  },
};

export class Tweens {
  constructor() {
    this.list = [];
  }
  add(dur, fn, { delay = 0, e = ease.inOut, key, done } = {}) {
    if (key) this.list = this.list.filter((t) => t.key !== key);
    if (reduceMotion) {
      fn(1);
      done?.();
      return;
    }
    this.list.push({ t: -delay, dur, fn, e, key, done });
  }
  update(dt) {
    this.list = this.list.filter((tw) => {
      tw.t += dt;
      if (tw.t < 0) return true;
      const k = Math.min(1, tw.t / tw.dur);
      tw.fn(tw.e(k));
      if (k >= 1) {
        tw.done?.();
        return false;
      }
      return true;
    });
  }
  get busy() {
    return this.list.length > 0;
  }
}

/** Approach a target value smoothly every frame */
export const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
