// Facts come from the Bbagua EUR-50 manual, product page, and photos of the actual unit taken apart.
// The real tubes are all white; colours here are a code shown as bands at each tube end.
// Restrictor: inline capsule on the drain line (photo). Check valve: inside the 4-way valve's product IN port (blow test).
// Pre-filters: the three cups hang from one moulded head; stage 1 → 2 → 3 run through it, no tubes (product photos).
// Not yet photographed: faucet, drain collar, the unit installed (positions schematic).
// 4-way valve: marked half = product pair (one-way, blow test), screw half = feed pair.

export const TUBES = {
  orange: { hex: 0xe4741f, css: '#e4741f', name: 'Orange' },
  teal: { hex: 0x10a0b4, css: '#10a0b4', name: 'Teal' },
  purple: { hex: 0x8a4fd0, css: '#8a4fd0', name: 'Purple' },
  blue: { hex: 0x2f7be0, css: '#2f7be0', name: 'Blue' },
  yellow: { hex: 0xf0c020, css: '#f0c020', name: 'Yellow' },
  black: { hex: 0x22272b, css: '#22272b', name: 'Black' },
};

// What the water looks like inside each tube, from tap water to clean product.
// c: water colour, s: speck colour, n: how many specks (0 = clear), v: relative speed
export const WATER = {
  raw: { c: 0x7c9794, s: 0x8c6a44, n: 1.0, v: 1 },
  sed: { c: 0x6c9fb0, s: 0x9b8a6c, n: 0.35, v: 1 },
  gac: { c: 0x579fc8, s: 0xa9b8bf, n: 0.12, v: 1 },
  feed: { c: 0x3d95d8, s: 0xffffff, n: 0, v: 1 },
  clean: { c: 0x1f7ad6, s: 0xffffff, n: 0, v: 0.7 },
  reject: { c: 0x6d8291, s: 0xdfe4e7, n: 0.8, v: 0.6 },
};
export const TUBE_WATER = {
  k1: 'raw',
  k4: 'feed',
  kG: 'feed',
  k4b: 'feed',
  k5: 'feed',
  k6: 'clean',
  k7: 'clean',
  k8: 'clean',
  k10: 'clean',
  k11: 'reject',
  k12: 'reject',
};

// Part details. conn: [code colour, text]. life: replace interval in years. facts: [label, value].
export const PARTS = {
  SRC: {
    k: 'Inlet',
    t: 'Cold supply + adapter',
    d: 'Chrome tee between the angle stop and the cold hose. Its blue lever turns the unit’s water on and off.',
    conn: [['orange', 'Out → stage 1']],
    facts: [
      ['Mains pressure', '3–5 bar'],
      ['Below 3 bar', 'pump model EUR-50 BP'],
      ['5 bar or more', 'fit a 4.5 bar regulator'],
      ['Water', 'cold only, 5–38 °C'],
      ['Max salts', '1,500 ppm'],
    ],
    schematic: true,
  },
  S1: {
    k: 'Stage 1',
    t: 'Sediment 5 µm',
    d: 'Spun polypropylene that catches sand, rust and particles. Right cup. The water goes on to stage 2 through a channel inside the shared head, not a tube. Unscrew the cup to change the cartridge.',
    life: [1],
    conn: [['orange', 'In (middle of the head’s right end) ← cold supply']],
    flush: true,
  },
  S2: {
    k: 'Stage 2',
    t: 'Granular carbon',
    d: 'Loose carbon granules in a ribbed shell with blue caps. Removes chlorine, taste and smell. Middle cup. Fed from stage 1 and feeding stage 3 inside the shared head, so it has no ports of its own. Unscrew the cup to change the cartridge.',
    life: [1],
    conn: [],
    flush: true,
  },
  S3: {
    k: 'Stage 3',
    t: 'Carbon block',
    d: 'Compressed carbon in a white net, the last pre-filter. Left cup, under the gauge. Fed from stage 2 inside the shared head. Unscrew the cup to change the cartridge.',
    life: [1],
    conn: [['teal', 'Out (middle of the head’s left end) → T-fitting on the shelf (gauge + valve)']],
    flush: true,
  },
  GT: {
    k: 'Fitting',
    t: 'Gauge T-fitting',
    d: 'Back-left corner of the shelf. Splits the pre-filtered water between the gauge and the 4-way valve.',
    conn: [
      ['teal', '← stage 3'],
      ['teal', '→ pressure gauge'],
      ['teal', '→ 4-way valve, screw half IN'],
    ],
  },
  GA: {
    k: 'Gauge',
    t: 'Pressure gauge',
    d: 'On the front of the bracket. Shows the water pressure after the three pre-filters, before the membrane.',
    conn: [['teal', '← gauge T-fitting']],
    facts: [
      ['Scale', 'kg/cm²'],
      ['Normal mains', '3–5 bar'],
    ],
  },
  V: {
    k: 'Valve',
    t: '4-way valve',
    d: 'Two halves, one pair each. The screw half carries pre-filtered water to the membrane and shuts when the tank is full. The marked half carries clean water back, one way only.',
    conn: [],
  },
  S4: {
    k: 'Stage 4',
    t: 'RO membrane',
    d: 'Removes most dissolved salts. Lies on the bracket in two clips. Water goes in at the screw-cap end. At the other end, the upper port gives clean water and the lower one salty waste.',
    life: [2, 4],
    conn: [
      ['teal', 'Cap end ← valve screw half OUT'],
      ['purple', 'Upper port: clean water → valve marked half IN'],
      ['black', 'Lower port: salty waste → restrictor → drain'],
    ],
    facts: [['Rating', '50–75 GPD, check the label']],
    flush: true,
  },
  S5: {
    k: 'Stage 5',
    t: 'Coconut carbon post-filter',
    d: 'Final polish for taste, on the way to the faucet. Clipped above the membrane.',
    life: [2],
    conn: [
      ['blue', 'In ← T-fitting (screwed straight on)'],
      ['yellow', 'Out → faucet'],
    ],
    flush: true,
  },
  CV: {
    k: 'Fitting',
    t: 'Check valve',
    d: 'Stops tank water flowing back into the membrane. Built into the IN port of the 4-way valve’s marked half: a cream insert with a small hole. Air only passes one way.',
    conn: [
      ['purple', 'In ← membrane upper port'],
      ['purple', 'Out → T-fitting'],
    ],
  },
  FR: {
    k: 'Fitting',
    t: 'Flow restrictor',
    d: 'Cream capsule on the drain line. Its narrow passage lets salty waste out slowly, which keeps pressure on the membrane. White tube in from the membrane, black tube out to the drain.',
    conn: [
      ['black', 'In ← membrane lower port (white tube, ~25 cm)'],
      ['black', 'Out → black drain tube'],
    ],
  },
  DR: {
    k: 'Drain',
    t: 'Drain collar',
    d: 'Clamps on the sink waste pipe, ideally after the trap.',
    conn: [['black', 'In ← black tube from the restrictor']],
    facts: [['Hole', '6 mm']],
    schematic: true,
  },
  J: {
    k: 'Fitting',
    t: 'T-fitting',
    d: 'Screwed onto the post-filter inlet. Joins clean water from the valve, the tank and the post-filter.',
    conn: [
      ['purple', '← valve marked half OUT'],
      ['blue', '↔ tank'],
      ['blue', '→ post-filter (direct)'],
    ],
  },
  TK: {
    k: 'Storage',
    t: 'Pressure tank',
    d: 'Clean water is stored above a rubber diaphragm. The air below it pushes the water out when you open the faucet. The blue lever on top shuts the tank off.',
    conn: [['blue', 'Top valve ↔ T-fitting']],
    facts: [
      ['Usable', '8 L'],
      ['Air pre-charge', '0.3–0.5 kg/cm² empty'],
      ['Air valve', 'recessed under the tank'],
      ['', 'Factory set. Leave it alone.'],
    ],
  },
  FT: {
    k: 'Outlet',
    t: 'Osmosis faucet',
    d: 'Separate tap on the sink.',
    conn: [['yellow', 'In ← post-filter']],
    facts: [['Hole', '12 mm']],
    schematic: true,
  },
};

export const FLUSH = [
  ['Flush', 'Undo the stage 3 → gauge T tube at the T, run it into a bucket until the black water stops. Reconnect.'],
  ['Fill', 'Let the unit run 4 hours.'],
  ['Dump', 'Empty the tank.'],
  ['Repeat', '2–4 times, until it runs clear.'],
];

export const CONNS = {
  k1: { n: 'Water in', tube: 'orange', from: 'Adapter valve', to: 'Head inlet, right end' },
  k4: { n: 'Stage 3 out', tube: 'teal', from: 'Head outlet, left end', to: 'Gauge T-fitting' },
  kG: { n: 'Gauge line', tube: 'teal', from: 'Gauge T-fitting', to: 'Pressure gauge' },
  k4b: { n: 'Into the valve', tube: 'teal', from: 'Gauge T-fitting', to: 'Valve screw half, IN (bottom)' },
  k5: { n: 'To the membrane', tube: 'teal', from: 'Valve screw half, OUT (top)', to: 'Membrane cap end' },
  k6: {
    n: 'Clean water back',
    tube: 'purple',
    from: 'Membrane upper port',
    to: 'Valve marked half, IN (bottom, check valve inside)',
  },
  k7: {
    n: 'To the T-fitting',
    tube: 'purple',
    from: 'Valve marked half, OUT (top)',
    to: 'T-fitting on the post-filter',
  },
  k8: { n: 'Tank tube', tube: 'blue', from: 'T-fitting', to: 'Tank valve' },
  k10: { n: 'To the faucet', tube: 'yellow', from: 'Post-filter outlet', to: 'Faucet' },
  k11: { n: 'Salty waste out', tube: 'black', from: 'Membrane lower port', to: 'Restrictor' },
  k12: { n: 'Drain tube', tube: 'black', from: 'Restrictor', to: 'Drain collar (black tube)' },
};

export const MODES = {
  making: {
    on: ['k1', 'k4', 'k4b', 'k5', 'k6', 'k7', 'k8', 'k11', 'k12'],
    rev: [],
    lvl: 0.45,
    txt: 'Filling the tank. Clean water to the tank, salty waste to the drain.',
  },
  full: { on: [], rev: [], lvl: 0.95, txt: 'Tank full. The valve shuts off the incoming water. Nothing flows.' },
  tap: {
    on: ['k1', 'k4', 'k4b', 'k5', 'k6', 'k7', 'k8', 'k10', 'k11', 'k12'],
    rev: ['k8'],
    lvl: 0.25,
    txt: 'Faucet open. Tank → post-filter → glass, and the unit refills.',
  },
};

const dot = (c) => `<i class="d" style="--c:${TUBES[c].css}"></i>`;

// Guided tour: mode, highlighted tubes, part to focus on, caption
export const TOUR = [
  {
    mode: 'making',
    tubes: ['k1'],
    focus: 'SRC',
    t: 'Cold in',
    c: `Cold water leaves the supply valve through the ${dot('orange')}orange-coded tube.`,
  },
  {
    mode: 'making',
    tubes: ['k1'],
    focus: 'S1',
    t: 'Stage 1 · Sediment',
    c: 'Catches sand and rust. The three cups share one head: the water passes to stage 2 inside it, with no tube.',
  },
  {
    mode: 'making',
    tubes: [],
    focus: 'S2',
    t: 'Stage 2 · Granular carbon',
    c: 'Removes chlorine, taste and smell, then on to stage 3 through the head.',
  },
  {
    mode: 'making',
    tubes: ['k4', 'kG', 'k4b'],
    focus: 'S3',
    t: 'Stage 3 · Carbon block',
    c: `The last pre-filter. ${dot('teal')}Teal up to a T: one branch to the <b>gauge</b>, one to the 4-way valve.`,
  },
  {
    mode: 'making',
    tubes: ['k4b', 'k5'],
    focus: 'V',
    t: '4-way valve · on the way in',
    c: 'The pre-filtered water crosses the valve’s <b>screw half</b>, <b class="in">IN</b> to <b class="out">OUT</b>, then goes on to the membrane.',
  },
  {
    mode: 'making',
    tubes: ['k5', 'k6', 'k11'],
    focus: 'S4',
    t: 'Stage 4 · Membrane',
    c: 'Splits the water in two: <b>clean water</b> from the upper port at the far end, <b>salty waste</b> from the lower one.',
  },
  {
    mode: 'making',
    tubes: ['k11', 'k12'],
    focus: 'FR',
    t: 'Salty waste to the drain',
    c: `Through the <b>restrictor</b>, which keeps pressure on the membrane, then the ${dot('black')}black tube to the drain.`,
  },
  {
    mode: 'making',
    tubes: ['k6', 'k7', 'k8'],
    focus: 'J',
    t: 'Clean water to the tank',
    c: `${dot('purple')}Back through the valve’s <b>marked half</b>, whose check valve stops it flowing back, to the T, then ${dot('blue')}into the tank.`,
  },
  {
    mode: 'full',
    tubes: [],
    focus: 'TK',
    t: 'Tank full',
    c: 'The water has pushed the diaphragm down and squeezed the air. That pressure makes the valve shut off the incoming water, and everything stops.',
  },
  {
    mode: 'tap',
    tubes: ['k8', 'k10'],
    focus: 'S5',
    t: 'Faucet open',
    c: `The air pushes the water out: tank → T → <b>stage 5 post-filter</b> → ${dot('yellow')}faucet. The unit starts refilling.`,
  },
];
