import * as THREE from 'three';
import { GLSL_NOISE } from './kit.js';

/* Cut faces inside the cutaways. Each face is shaded from its own local position, so one flat
   polygon can show water, filter media and the core without any extra geometry.

   radial (filter housings, axis Y, local y: 0 at the sump top, -2.5 at the bottom):
     water enters around the cartridge, passes inward through the media, rises up the core.
   axial (membrane, axis X through the local origin):
     feed runs along the spiral leaves and turns into reject, clean water collects in the centre tube. */

const SHARED = `
uniform float uPhase, uLevel, uSpeckN, uMedia, uSat;
uniform vec3 uIn, uOut, uRej, uSpeck;
varying vec3 vLoc;
${GLSL_NOISE}
vec3 waterTone(vec3 c, vec2 p) { return c * (.86 + .24 * vnoise(p)); }
const vec3 AIR = vec3(.9, .92, .93);
`;

const RADIAL = `
  float r = length(vLoc.xz), y = vLoc.y, ph = uPhase;
  const float RC = .37, RM = .12, TOP = -.14, BOT = -2.36;
  float capH = uMedia < .5 ? 0. : uMedia < 1.5 ? .2 : .09;
  vec3 col;
  float tIn = clamp((RC - r) / (RC - RM), 0., 1.);
  bool cart = r < RC && y < TOP && y > BOT;
  if (!cart) {
    // around the cartridge: unfiltered water drifting down and inward
    col = waterTone(uIn, vec2(r * 7. + ph * .5, y * 2.2 + ph * .8));
    col = mix(col, uSpeck, specks(vec2(r * 26. + ph * 1.6, y * 13. + ph * 2.2), uSpeckN * .55, .26) * .9);
  } else if (r < RM - .018) {
    // centre core: filtered water rising to the outlet
    col = waterTone(uOut, vec2(r * 9., y * 3. - ph * 1.6));
    col += vec3(.14) * smoothstep(.7, .95, vnoise(vec2(r * 30., y * 7. - ph * 3.)));
  } else if (r < RM) {
    col = mix(vec3(.82, .83, .82), vec3(.5), step(.62, fract(y * 9.)));             // perforated core tube
  } else if (uMedia > .5 && (y > TOP - capH || y < BOT + capH)) {
    col = uMedia < 1.5 ? vec3(.02, .37, .67) : vec3(.86, .86, .84);                  // end caps: blue on GAC, white on the block
    if (uMedia > 1.5 && y > TOP - .025) col = vec3(.05);                               // block's black top gasket
  } else {
    vec3 pass = mix(uIn, uOut, tIn);
    float stream = smoothstep(.55, 1., vnoise(vec2((RC - r) * 22. - ph * 2.2, y * 5.)));
    if (uMedia < .5) {
      // spun polypropylene: fine concentric fibre layers, dirt trapped deepest near the outside
      float ring = smoothstep(.2, .8, fract(r * 95. + vnoise(vec2(y * 6., r * 20.)) * .6));
      col = vec3(.92, .92, .9) * (.93 + .07 * ring) + .03 * vnoise(vec2(r * 200., y * 40.));
      col = mix(col, pass, .12);
      float depth = smoothstep(RC - .16, RC, r);
      col = mix(col, vec3(.42, .3, .16), depth * depth * (.5 + .3 * vnoise(vec2(y * 14., r * 50.))));
      col = mix(col, vec3(.32, .22, .12), specks(vec2(r * 80., y * 34.), .55 * depth, .3));
    } else if (uMedia < 1.5) {
      if (r > RC - .022) {
        // ribbed white shell with slots: water gets in through them
        col = fract(y * 11.) < .72 ? vec3(.88, .88, .86) : uIn * .9;
      } else {
        // granular carbon: grains with water in the gaps
        vec2 g = vec2(r * 24., y * 24.);
        vec2 id = floor(g), f = fract(g) - .5;
        float d = length((f - (vec2(h21(id), h21(id + 4.2)) - .5) * .25) * vec2(1., .8 + .4 * h21(id + 9.)));
        float grain = 1. - smoothstep(.42, .5, d);
        col = mix(pass * .9, vec3(.035, .038, .042) + .05 * h21(id + 1.7), grain);
      }
    } else {
      // carbon block in a white net
      col = mix(vec3(.05, .055, .06), pass, .08 + .08 * vnoise(vec2(r * 90., y * 60.)));
      if (r > RC - .012) col = step(.5, fract(y * 16.)) > .5 ? vec3(.85) : col;
    }
    col = mix(col, pass * 1.08, stream * (uMedia > .5 && uMedia < 1.5 ? .15 : .35));
  }
  // water level while the housing fills
  col = y > uLevel ? (cart ? col * .96 : AIR) : col;
`;

const AXIAL = `
  float x = vLoc.x, r = length(vLoc.yz), th = atan(vLoc.y, vLoc.z), ph = uPhase;
  float t = clamp((x + 1.25) / 2.85, 0., 1.);
  vec3 col;
  if (r < .055) {
    col = waterTone(uOut, vec2(x * 3. - ph * 1.4, r * 30.));                         // product tube
    col += vec3(.14) * smoothstep(.7, .95, vnoise(vec2(x * 8. - ph * 2.6, r * 60.)));
  } else if (r < .075) {
    col = mix(vec3(.86, .85, .82), vec3(.55), step(.7, fract(x * 10.)));            // perforated
  } else if (r > .31) {
    col = vec3(.9, .88, .82);                                                         // outer wrap
  } else {
    float layer = fract((r - .075) * 34. - th / 6.2832);
    vec3 feed = mix(uIn, uRej, smoothstep(.0, 1., t));
    float sheet = smoothstep(.2, .26, layer) * (1. - smoothstep(.56, .62, layer));
    // feed runs along the channels and turns salty; clean water soaks through the sheets toward the centre
    vec3 ch = waterTone(feed, vec2(x * 3. - ph * 1.2, r * 20.));
    ch = mix(ch, uSpeck, specks(vec2(x * 14. - ph * 2., r * 34. - th * 5.), uSpeckN * t * .12, .2) * .5);
    vec3 sh = mix(vec3(.95, .93, .88), uOut, .2 + .12 * vnoise(vec2(x * 5., r * 30. + ph)));
    col = mix(ch, sh, sheet);
  }
  col = x > uLevel ? (r < .31 && r > .075 ? mix(col, AIR, .7) : AIR) : col;
`;

export function sectionMaterial(kind, { inC, outC, rejC = outC, speck = 0xffffff, speckN = 0, media = 0 }) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, side: THREE.DoubleSide });
  const u = {
    uPhase: { value: 0 },
    uLevel: { value: 9 },
    uSpeckN: { value: speckN },
    uMedia: { value: media },
    uSat: { value: 1 },
    uIn: { value: new THREE.Color(inC) },
    uOut: { value: new THREE.Color(outC) },
    uRej: { value: new THREE.Color(rejC) },
    uSpeck: { value: new THREE.Color(speck) },
  };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader =
      'varying vec3 vLoc;\n' +
      sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vLoc = position;');
    sh.fragmentShader =
      SHARED +
      sh.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
      {
        ${kind === 'radial' ? RADIAL : AXIAL}
        diffuseColor.rgb = col;
      }`,
      );
  };
  return m;
}
