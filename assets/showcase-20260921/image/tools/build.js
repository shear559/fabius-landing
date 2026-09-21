// Builds master.svg, formats/*.svg and data.js from one source of truth.
// Usage: node product/tools/build.js   (run from any directory)
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

// ---- Tokens: every value is read from lattice/styles.css -------------------
const T = {
  paper: '#f7f8f2', white: '#ffffff', ink: '#1c2923', muted: '#607067', line: '#d9e1d4',
  green: '#284d36', lime: '#cbe792', wash: '#e9efde', mint: '#9eddbb', sky: '#abd9db',
  orchid: '#d5c2e8', paintLight: '#e8f7c4', paintShadow: '#749b72',
  sage: '#6b8067',      // .hero h1 span
  chip: '#edf1c5',      // .paper-chip
  leaf: '#7e9362', stem: '#667a48', // .leaf i / .leaf:before
  orbLime: '#e2f5ac', orbSage: '#a8c499', // .orb-one
  chipLine: '#ced8c7',  // .notebook border
  soft: '#dce5d4',      // .connection-chip small
};

// ---- Geometry: the 2:1 lattice taken from the site's logo path ------------
// Logo: M4 8 16 2l12 6v16l-12 6-12-6Z M4 8l12 7 12-7 M16 15v15 M4 24l12-7 12 7
const S = 2400;            // master canvas
const K = 30;              // logo unit -> px
const G = 120;             // lattice step (12 logo units / 3)
const CX = 1200, CY = 1260;
const L = (x, y) => [CX + (x - 16) * K, CY + (y - 16) * K];
const X0 = 1200, Y0 = 840; // lattice origin = logo top vertex (16,2)
const V = (m, n) => [X0 + m * G, Y0 + n * G / 2];
const f = (n) => +n.toFixed(1);
const pts = (a) => a.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');

function defs(grainHref, grainTile) {
  return `<defs>
  <filter id="lt-blur" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="90"/></filter>
  <filter id="lt-shadow" x="-30%" y="-30%" width="160%" height="170%"><feOffset dy="36"/><feGaussianBlur stdDeviation="34"/><feComponentTransfer><feFuncA type="linear" slope="0.34"/></feComponentTransfer><feColorMatrix type="matrix" values="0 0 0 0 0.145 0 0 0 0 0.247 0 0 0 0 0.212 0 0 0 1 0"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <radialGradient id="lt-orb-lime" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="${T.orbLime}"/><stop offset=".55" stop-color="${T.orbSage}" stop-opacity=".47"/><stop offset="1" stop-color="${T.orbSage}" stop-opacity="0"/></radialGradient>
  <linearGradient id="lt-wash" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${T.mint}"/><stop offset="1" stop-color="${T.sky}"/></linearGradient>
  <linearGradient id="lt-face-top" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${T.paintLight}"/><stop offset="1" stop-color="${T.lime}"/></linearGradient>
  <linearGradient id="lt-face-left" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${T.mint}"/><stop offset="1" stop-color="${T.sky}"/></linearGradient>
  <linearGradient id="lt-face-right" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${T.sky}"/><stop offset="1" stop-color="${T.orchid}"/></linearGradient>
  <linearGradient id="lt-chip" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${T.green}"/><stop offset="1" stop-color="#3e7052"/></linearGradient>
  <radialGradient id="lt-fade" cx="50%" cy="50%" r="50%"><stop offset=".45" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
  <mask id="lt-lattice-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${S}" height="${S}"><rect width="${S}" height="${S}" fill="url(#lt-fade)"/></mask>
  <pattern id="lt-grain" patternUnits="userSpaceOnUse" width="${grainTile}" height="${grainTile}"><image href="${grainHref}" width="${grainTile}" height="${grainTile}"/></pattern>
</defs>`;
}

function latticeLayer() {
  const lines = [];
  for (let x = X0 % G - G; x <= S + G; x += G) lines.push(`M${x} 0V${S}`);
  // slope +/-0.5 lines through every vertex
  for (let c = -S; c <= 2 * S; c += G) {
    const b = Y0 - 0.5 * X0 + c; // y = 0.5x + b
    lines.push(`M0 ${f(b)}L${S} ${f(b + S / 2)}`);
    const b2 = Y0 + 0.5 * X0 + c - S; // y = -0.5x + b2
    lines.push(`M0 ${f(b2)}L${S} ${f(b2 - S / 2)}`);
  }
  return `<g id="layer-lattice" data-layer="Lattice grid" mask="url(#lt-lattice-mask)"><path d="${lines.join('')}" fill="none" stroke="${T.green}" stroke-opacity=".16" stroke-width="2"/></g>`;
}

function cube() {
  const P = (x, y) => L(x, y);
  const top = [P(4, 8), P(16, 2), P(28, 8), P(16, 15)];
  const left = [P(4, 8), P(16, 15), P(16, 30), P(4, 24)];
  const right = [P(28, 8), P(16, 15), P(16, 30), P(28, 24)];
  const d = (a) => 'M' + a.map(([x, y]) => `${f(x)} ${f(y)}`).join('L');
  return `<g id="layer-cube" data-layer="Notebook cube">
  <polygon points="${pts(left)}" fill="url(#lt-face-left)" opacity=".88"/>
  <polygon points="${pts(right)}" fill="url(#lt-face-right)" opacity=".88"/>
  <polygon points="${pts(top)}" fill="url(#lt-face-top)"/>
  <path d="${d([P(4, 8), P(16, 2), P(28, 8), P(28, 24), P(16, 30), P(4, 24)])}Z ${d([P(4, 8), P(16, 15), P(28, 8)])} ${d([P(16, 15), P(16, 30)])} ${d([P(4, 24), P(16, 17), P(28, 24)])}" fill="none" stroke="${T.green}" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/>
</g>`;
}

const THREADS = [
  [[-8, -4], [-7, -3], [-6, -2], [-5, -1], [-5, 1], [-4, 2], [-3, 3]],
  [[6, -4], [5, -3], [4, -2], [4, 0], [3, 1], [3, 3]],
  [[-7, 15], [-6, 14], [-5, 13], [-4, 12], [-3, 11]],
  [[5, 19], [4, 18], [3, 17], [2, 16], [1, 15], [0, 14]],
];
const QUIET = [ // quieter side-threads that branch off
  [[-5, -1], [-4, -2], [-3, -3], [-3, -5]],
  [[-5, 13], [-5, 17], [-4, 18]],
  [[4, -2], [5, -1], [6, 0], [7, 1]],
  [[3, 17], [4, 16], [5, 15], [6, 14], [6, 12]],
];
function threadLayer() {
  const main = THREADS.map((t) => `<polyline points="${pts(t.map((v) => V(...v)))}"/>`).join('');
  const quiet = QUIET.map((t) => `<polyline points="${pts(t.map((v) => V(...v)))}"/>`).join('');
  const nodes = [];
  THREADS.forEach((t) => t.slice(1, -1).forEach((v) => { const [x, y] = V(...v); nodes.push(`<circle cx="${x}" cy="${y}" r="9" fill="${T.green}"/>`); }));
  const ends = THREADS.map((t) => V(...t[0])).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="44" fill="${T.lime}" fill-opacity=".55"/><circle cx="${x}" cy="${y}" r="24" fill="${T.white}" stroke="${T.green}" stroke-width="8"/><circle cx="${x}" cy="${y}" r="9" fill="${T.green}"/>`);
  const qends = QUIET.map((t) => V(...t[t.length - 1])).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="14" fill="${T.white}" stroke="${T.green}" stroke-width="5"/>`);
  return `<g id="layer-threads" data-layer="Threads">
  <g fill="none" stroke="${T.green}" stroke-width="5" stroke-dasharray="2 16" stroke-linecap="round" opacity=".7">${quiet}</g>
  <g fill="none" stroke="${T.green}" stroke-width="8" stroke-linejoin="round" stroke-linecap="round">${main}</g>
  ${nodes.join('')}${qends.join('')}${ends.join('')}
</g>`;
}

// Leaf: pointed oval, after .leaf i { border-radius: 80% 0 80% 0 }
const leafPath = (len, w) => `M0 0C${len * .25} ${-w} ${len * .75} ${-w} ${len} 0C${len * .75} ${w} ${len * .25} ${w} 0 0Z`;
function growthLayer() {
  const [bx, by] = V(0, 0); // top vertex of the cube
  const stem = `M${bx} ${by}C${bx - 30} ${by - 180} ${bx + 110} ${by - 320} ${bx + 40} ${by - 560}`;
  const leaves = [
    [0.18, -1, 34, 150], [0.34, 1, -28, 170], [0.52, -1, 40, 160], [0.68, 1, -34, 150], [0.84, -1, 30, 120], [1.0, 1, -70, 110],
  ];
  // sample the cubic bezier
  const p0 = [bx, by], p1 = [bx - 30, by - 180], p2 = [bx + 110, by - 320], p3 = [bx + 40, by - 560];
  const at = (t) => [0, 1].map((i) => (1 - t) ** 3 * p0[i] + 3 * (1 - t) ** 2 * t * p1[i] + 3 * (1 - t) * t * t * p2[i] + t ** 3 * p3[i]);
  const ls = leaves.map(([t, side, rot, len]) => {
    const [x, y] = at(t);
    const ang = side < 0 ? 200 + rot : -20 + rot;
    const fill = side < 0 ? T.leaf : T.paintShadow;
    return `<g transform="translate(${f(x)} ${f(y)}) rotate(${ang})"><path d="${leafPath(len, len * .26)}" fill="${fill}"/><path d="M10 0H${len - 16}" stroke="${T.paintLight}" stroke-width="3" stroke-linecap="round" opacity=".7"/></g>`;
  });
  return `<g id="layer-growth" data-layer="Growth">
  <path d="${stem}" fill="none" stroke="${T.stem}" stroke-width="9" stroke-linecap="round"/>
  ${ls.join('')}
</g>`;
}

const bars = (x, y, widths, gap, h, color, op) => widths.map((w, i) => `<rect x="${x}" y="${y + i * gap}" width="${w}" height="${h}" rx="${h / 2}" fill="${color}" opacity="${op}"/>`).join('');
function notesLayer(omit) {
  // Field-notes chip (lime), top right, fed by thread 2
  const [ax, ay] = V(6, -4);
  const chip = `<g id="note-chip" transform="translate(${ax + 20} ${ay - 470}) rotate(7)" filter="url(#lt-shadow)">
    <rect width="340" height="420" rx="8" fill="${T.chip}"/>
    ${bars(36, 40, [150], 0, 10, T.ink, .55)}
    ${bars(36, 88, [230, 170], 40, 22, T.ink, .82)}
    <g transform="translate(170 250)"><path d="M0 70L-14 -60" stroke="${T.stem}" stroke-width="3"/>
      <g transform="translate(-10 -46) rotate(-15)"><path d="${leafPath(56, 15)}" fill="${T.leaf}"/></g>
      <g transform="translate(-6 -18) rotate(200)"><path d="${leafPath(56, 15)}" fill="${T.leaf}"/></g>
      <g transform="translate(-3 8) rotate(-15)"><path d="${leafPath(56, 15)}" fill="${T.leaf}"/></g>
      <g transform="translate(0 34) rotate(200)"><path d="${leafPath(56, 15)}" fill="${T.leaf}"/></g></g>
    ${bars(36, 372, [190], 0, 10, T.ink, .45)}
  </g>`;
  // Research note (white), lower left, fed by thread 3
  const [cx, cy] = V(-7, 15);
  const note = `<g id="note-card" transform="translate(${cx - 250} ${cy + 20}) rotate(-4)" filter="url(#lt-shadow)">
    <rect width="420" height="470" rx="12" fill="${T.white}" stroke="${T.chipLine}" stroke-width="2"/>
    <rect width="420" height="56" rx="12" fill="#f3f5ee"/><rect y="44" width="420" height="12" fill="#f3f5ee"/>
    <path d="M0 56H420" stroke="${T.line}" stroke-width="2"/>
    ${[0, 1, 2].map((i) => `<circle cx="${28 + i * 18}" cy="28" r="5" fill="#bcc8b6"/>`).join('')}
    ${bars(36, 92, [110], 0, 8, T.muted, .6)}
    ${bars(36, 124, [290, 220], 44, 26, T.ink, .86)}
    ${bars(36, 232, [340, 320, 250], 22, 8, T.muted, .5)}
    <rect x="36" y="318" width="4" height="40" fill="#b3ca9d"/>${bars(54, 326, [260, 180], 20, 8, T.ink, .6)}
    <rect x="36" y="384" width="348" height="58" rx="6" fill="none" stroke="${T.line}" stroke-width="2"/>
    <rect x="52" y="398" width="30" height="30" rx="4" fill="none" stroke="${T.green}" stroke-width="3"/>
    ${bars(98, 402, [140, 100], 16, 7, T.ink, .6)}
  </g>`;
  // Connection chip (green), lower right, fed by thread 4
  const [dx, dy] = V(5, 19);
  const g = `<g id="note-link" transform="translate(${dx - 60} ${dy + 40}) rotate(2)" filter="url(#lt-shadow)">
    <rect width="440" height="150" rx="16" fill="url(#lt-chip)" stroke="#ffffff66" stroke-width="2"/>
    <g transform="translate(78 75)" stroke="${T.lime}" stroke-width="5" fill="none">
      <path d="M-26 -20L0 4L28 -18M0 4L-4 30"/>
      <circle cx="-26" cy="-20" r="11" fill="${T.green}"/><circle cx="28" cy="-18" r="11" fill="${T.green}"/><circle cx="0" cy="4" r="11" fill="${T.green}"/><circle cx="-4" cy="30" r="9" fill="${T.green}"/></g>
    ${bars(140, 48, [150], 0, 10, T.soft, .8)}${bars(140, 80, [250], 0, 16, T.white, .95)}
  </g>`;
  // A format may leave out a note its crop would only show as a sliver (see FORMATS[].omit).
  const keep = (id, svg) => (omit.includes(id) ? '' : svg);
  return `<g id="layer-notes" data-layer="Notes">${keep('note-chip', chip)}${keep('note-card', note)}${keep('note-link', g)}</g>`;
}

function washLayer() {
  return `<g id="layer-wash" data-layer="Paint wash" filter="url(#lt-blur)">
  <ellipse cx="1520" cy="1060" rx="880" ry="820" fill="url(#lt-orb-lime)"/>
  <ellipse cx="760" cy="1640" rx="720" ry="520" fill="${T.mint}" opacity=".42"/>
  <ellipse cx="1760" cy="1720" rx="560" ry="460" fill="${T.orchid}" opacity=".55"/>
  <ellipse cx="1900" cy="1300" rx="420" ry="520" fill="${T.sky}" opacity=".45"/>
</g>`;
}

// art(): the master illustration's layers. grain may be omitted by a format that adds its own.
function art({ grainHref, grainTile, grain = true, omit = [] }) {
  return [
    `<rect id="layer-paper" width="${S}" height="${S}" fill="${T.paper}"/>`,
    washLayer(), latticeLayer(), threadLayer(), cube(), growthLayer(), notesLayer(omit),
    grain ? `<rect id="layer-grain" data-layer="Grain" width="${S}" height="${S}" fill="url(#lt-grain)" style="mix-blend-mode:overlay"/>` : '',
  ].join('\n');
}

const LAYERS = [
  ['layer-wash', 'Paint wash'], ['layer-lattice', 'Lattice grid'], ['layer-threads', 'Threads'],
  ['layer-cube', 'Notebook cube'], ['layer-growth', 'Growth'], ['layer-notes', 'Notes'], ['layer-grain', 'Grain'],
];

function masterSVG(grainHref) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img" aria-labelledby="lt-title">
<title id="lt-title">Lattice key visual: a notebook cube on an isometric lattice, threads connecting notes to it, a sprig growing from its top.</title>
${defs(grainHref, 360)}
${art({ grainHref, grainTile: 360 })}
</svg>`;
}

// ---- Formats ------------------------------------------------------------
// Copy: only lines the Lattice site states.
const COPY = {
  eyebrow: 'A quiet place for a curious mind',
  h1: 'Collect the pieces.', h2: 'Find the connection.',
  tagline: 'Make room for the connection.',
  lead1: 'A notebook for the thought that', lead2: 'becomes something bigger.',
  note: 'Local-first. Your notes. Your next idea.',
  fiction: 'Lattice is a fictional product demonstration.',
  wordmark: 'lattice',
};

// Type ladder (px at export size). Weights follow the site: 500 display, 400 body, 500 eyebrow caps.
const TYPE = {
  billboard: { display: 96, sub: 40, eyebrow: 22, body: 26, mark: 52 },
  social: { display: 92, sub: 36, eyebrow: 22, body: 26, mark: 44 },
  story: { display: 112, sub: 40, eyebrow: 24, body: 28, mark: 48 },
  square: { display: 84, sub: 34, eyebrow: 20, body: 24, mark: 42 },
  card: { display: 62, sub: 28, eyebrow: 18, body: 20, mark: 36 },
};

function logo(x, y, size, color) { // the site's brand mark, same path
  const s = size / 32;
  return `<g class="mark" transform="translate(${x} ${y}) scale(${s})"><path d="M4 8 16 2l12 6v16l-12 6-12-6ZM4 8l12 7 12-7M16 15v15M4 24l12-7 12 7" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/></g>`;
}
let tid = 0;
function text(layer, x, y, str, o) {
  const ls = o.ls != null ? o.ls : (o.size >= 60 ? -0.055 : o.size >= 28 ? -0.02 : 0);
  const anchor = o.anchor || 'start';
  return `<text class="tx" data-layer="${layer}" x="${x}" y="${y}" font-size="${o.size}" font-weight="${o.weight || 400}" fill="${o.fill || T.ink}" letter-spacing="${f(ls * o.size)}" text-anchor="${anchor}"${o.caps ? ' style="text-transform:uppercase"' : ''}>${str}</text>`;
}
function eyebrow(x, y, size) {
  return `<circle cx="${x + size * .25}" cy="${y - size * .36}" r="${size * .25}" fill="${T.ink}"/>` +
    text('eyebrow', x + size * .95, y, COPY.eyebrow.toUpperCase(), { size, weight: 500, ls: 0.12 });
}
function wordmark(x, y, size) {
  return logo(x, y - size * .92, size * 1.05, T.ink) + text('wordmark', x + size * 1.25, y, COPY.wordmark, { size, weight: 550, ls: -0.05 });
}

// Each format: the master art placed through a crop window, a paper fade that clears the
// text zone, then the type. grid = columns inside the safe area (used for the overlay too).
const FORMATS = [
  {
    id: 'billboard', name: 'Billboard', w: 1920, h: 1080, safe: { x: 115.2, y: 64.8 }, cols: 12, gutter: 24,
    art: { x: 900, y: 0, w: 1020, h: 1080, view: [235, 40, 2125, 2250] },
    omit: ['note-card'], // it would sit half-faded under the type fade
    fade: { type: 'x', paper: 900, clear: 1180 },
    decision: 'Wide screen, read at a distance: the headline takes columns 1–6 on flat paper, the lattice and cube fill the right half, and the threads run off the edge toward the reader.',
    body(t) {
      return wordmark(116, 124, t.mark) +
        eyebrow(116, 382, t.eyebrow) +
        text('headline', 118, 514, COPY.h1, { size: t.display, weight: 500 }) +
        text('headline-2', 118, 622, COPY.h2, { size: t.display, weight: 500, fill: T.sage }) +
        text('lead', 116, 730, COPY.lead1, { size: t.sub, fill: T.ink }) +
        text('lead-2', 116, 782, COPY.lead2, { size: t.sub, fill: T.ink }) +
        text('note', 116, 944, COPY.note, { size: t.body, fill: T.green, weight: 500 }) +
        text('fiction', 116, 994, COPY.fiction, { size: t.body - 4, fill: T.ink });
    },
  },
  {
    id: 'social', name: 'Social post', w: 1080, h: 1350, safe: { x: 64.8, y: 81 }, cols: 6, gutter: 24,
    art: { x: 0, y: 0, w: 1080, h: 820, view: [300, 413, 1800, 1367] },
    omit: ['note-chip', 'note-card'], // both would only show as corner slivers
    fade: { type: 'y', paper: 820, clear: 620 },
    decision: 'Feed post, stopped by the thumb: the art fills the top three-fifths so the cube reads first, and the two-line headline sits on paper below it with the eyebrow as a quiet lead-in.',
    body(t) {
      return eyebrow(66, 846, t.eyebrow) +
        text('headline', 67, 948, COPY.h1, { size: t.display, weight: 500 }) +
        text('headline-2', 67, 1042, COPY.h2, { size: t.display, weight: 500, fill: T.sage }) +
        text('lead', 66, 1122, COPY.lead1, { size: t.sub }) +
        text('lead-2', 66, 1168, COPY.lead2, { size: t.sub }) +
        wordmark(66, 1256, t.mark) +
        text('fiction', 1014, 1252, COPY.fiction, { size: t.body - 4, fill: T.ink, anchor: 'end' });
    },
  },
  {
    id: 'story', name: 'Story', w: 1080, h: 1920, safe: { x: 64.8, y: 250 }, cols: 6, gutter: 24,
    art: { x: 0, y: 1060, w: 1080, h: 860, view: [236, 660, 1929, 1536] },
    omit: ['note-link'], // the note card bleeds off the lower-left corner on purpose; the green chip would be a sliver
    fade: { type: 'y', paper: 1060, clear: 1150 },
    decision: 'Vertical and full-screen: type stacks inside the 250 px top band limit, the growth sprig points up into the headline, and the art bleeds off the bottom behind the platform controls. The white note card enters from the lower-left corner with about two-thirds of it showing, a deliberate bleed.',
    body(t) {
      return wordmark(66, 318, t.mark) +
        eyebrow(66, 450, t.eyebrow) +
        text('headline', 67, 580, 'Collect', { size: t.display, weight: 500 }) +
        text('headline', 67, 690, 'the pieces.', { size: t.display, weight: 500 }) +
        text('headline-2', 67, 800, 'Find the', { size: t.display, weight: 500, fill: T.sage }) +
        text('headline-2', 67, 910, 'connection.', { size: t.display, weight: 500, fill: T.sage }) +
        text('note', 66, 990, COPY.note, { size: t.body, fill: T.green, weight: 500 }) +
        text('fiction', 66, 1036, COPY.fiction, { size: t.body - 6, fill: T.ink });
    },
  },
  {
    id: 'square', name: 'Square', w: 1080, h: 1080, safe: { x: 64.8, y: 64.8 }, cols: 6, gutter: 24,
    art: { x: 0, y: 0, w: 1080, h: 1080, view: [180, 330, 2040, 2040] },
    omit: ['note-card', 'note-link'], // they only peeked out around the panel
    panels: [{ x: 64.8, y: 740, w: 950.4, h: 275.2 }],
    decision: 'Grid tile, seen small: the whole master shows, centred on the cube, and the tagline sits on a paper note in the lower band, the same note-card move the site uses.',
    body(t) {
      return eyebrow(108, 816, t.eyebrow) +
        wordmark(800, 990, t.mark) +
        text('tagline', 102, 910, 'Make room for', { size: t.display, weight: 500 }) +
        text('tagline', 102, 986, 'the connection.', { size: t.display, weight: 500, fill: T.green });
    },
  },
  {
    id: 'card', name: 'Link card', w: 1200, h: 630, safe: { x: 72, y: 37.8 }, cols: 12, gutter: 16,
    art: { x: 660, y: 0, w: 540, h: 630, view: [347, 100, 1800, 2100] },
    omit: ['note-chip', 'note-card', 'note-link'], // at 600 px wide only the cube should read
    fade: { type: 'x', paper: 660, clear: 840 },
    decision: 'Shown small beside a link: one message, two lines of display type on the left half, the cube and its sprig whole on the right, with the note cards left out so it still reads at 600 px wide.',
    body(t) {
      return wordmark(74, 110, t.mark) +
        text('headline', 74, 300, COPY.h1, { size: t.display, weight: 500 }) +
        text('headline-2', 74, 376, COPY.h2, { size: t.display, weight: 500, fill: T.sage }) +
        text('note', 74, 470, COPY.note, { size: t.body + 4, fill: T.ink }) +
        text('fiction', 74, 574, COPY.fiction, { size: t.body - 2, fill: T.ink });
    },
  },
];

function formatSVG(F, fontHref, grainHref) {
  const t = TYPE[F.id];
  const a = F.art;
  let fade = '';
  if (F.fade) { // solid paper on the type side of `paper`, a gradient to clear at `clear`
    const { type, paper, clear } = F.fade;
    const [lo, hi] = [Math.min(paper, clear), Math.max(paper, clear)];
    const g = type === 'x'
      ? `<linearGradient id="fmt-fade" gradientUnits="userSpaceOnUse" x1="${paper}" y1="0" x2="${clear}" y2="0">`
      : `<linearGradient id="fmt-fade" gradientUnits="userSpaceOnUse" x1="0" y1="${paper}" x2="0" y2="${clear}">`;
    const solid = paper < clear ? [0, paper] : [paper, (type === 'x' ? F.w : F.h)];
    const r = (a, b, fill) => type === 'x' ? `<rect x="${a}" width="${b - a}" height="${F.h}" fill="${fill}"/>` : `<rect y="${a}" width="${F.w}" height="${b - a}" fill="${fill}"/>`;
    fade = `<defs>${g}<stop offset="0" stop-color="${T.paper}"/><stop offset="1" stop-color="${T.paper}" stop-opacity="0"/></linearGradient></defs>${r(solid[0], solid[1], T.paper)}${r(lo, hi, 'url(#fmt-fade)')}`;
  }
  const panels = (F.panels || []);
  const panel = panels.map((p) => `<g filter="url(#lt-shadow)"><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="12" fill="${T.paper}"/></g>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${F.w}" height="${F.h}" viewBox="0 0 ${F.w} ${F.h}" data-format="${F.id}">
<style>@font-face{font-family:Rubik;src:url('${fontHref}') format('woff2');font-weight:300 900}text{font-family:Rubik,Arial,sans-serif}</style>
${defs(grainHref, 180)}
<rect width="${F.w}" height="${F.h}" fill="${T.paper}"/>
<g id="art"><svg x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" viewBox="${a.view.join(' ')}" preserveAspectRatio="xMidYMid slice" overflow="hidden">${art({ grainHref, grainTile: 180, grain: false, omit: F.omit || [] })}</svg></g>
${fade}${panel}
<rect id="grain" width="${F.w}" height="${F.h}" fill="url(#lt-grain)" style="mix-blend-mode:overlay"/>
<g id="type">${F.body(t)}</g>
</svg>`;
}

// ---- Contrast (WCAG 2.x) for the notes' token pairs ------------------------
const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// ---- Write ------------------------------------------------------------------
fs.writeFileSync(path.join(ROOT, 'master.svg'), masterSVG('assets/grain.png'));
for (const F of FORMATS) fs.writeFileSync(path.join(ROOT, 'formats', `${F.id}.svg`), formatSVG(F, '../assets/rubik.woff2', '../assets/grain.png'));

// need: the WCAG AA bar that applies to the pair's use (large text 3:1, body 4.5:1, graphics 3:1).
const pairs = [['ink', 'paper', 4.5, 'body'], ['sage', 'paper', 3, 'large text'], ['green', 'paper', 4.5, 'body'], ['muted', 'paper', 4.5, 'body'], ['white', 'green', 4.5, 'body'], ['lime', 'green', 3, 'graphics'], ['ink', 'chip', 4.5, 'body'], ['ink', 'lime', 4.5, 'body']]
  .map(([fg, bg, need, basis]) => ({ fg, bg, fgHex: T[fg], bgHex: T[bg], ratio: +ratio(T[fg], T[bg]).toFixed(2), need, basis }));
let measured = null;
try { measured = JSON.parse(fs.readFileSync(path.join(ROOT, 'measure', 'contrast-report.json'), 'utf8')); } catch (e) { /* first build */ }
const data = {
  master: masterSVG('assets/grain.png').replace(/ width="2400" height="2400"/, ''),
  layers: LAYERS.map(([id, label]) => ({ id, label })),
  formats: FORMATS.map((F) => ({ id: F.id, name: F.name, w: F.w, h: F.h, files: ['png', 'webp'].map((ext) => { const n = `exports/lattice-${F.id}-${F.w}x${F.h}.${ext}`; let kb = null; try { kb = Math.round(fs.statSync(path.join(ROOT, n)).size / 1024); } catch (e) { /* not rendered yet */ } return { ext, href: n, kb }; }), safe: F.safe, cols: F.cols, gutter: F.gutter, decision: F.decision, type: TYPE[F.id] })),
  palette: ['paper', 'ink', 'green', 'sage', 'lime', 'chip', 'mint', 'sky', 'orchid', 'muted'].map((k) => ({ name: k, hex: T[k] })),
  pairs, measured: measured && measured.formats.map((m) => ({ id: m.id, large: m.lowestLarge, body: m.lowestBody, pass: m.pass, safe: m.safeOk })),
};
fs.writeFileSync(path.join(ROOT, 'data.js'), `// Generated by tools/build.js. Do not edit by hand.\nwindow.LATTICE = ${JSON.stringify(data)};\n`);
fs.writeFileSync(path.join(ROOT, 'tools', 'formats.json'), JSON.stringify(FORMATS.map(({ id, w, h, safe }) => ({ id, w, h, safe })), null, 2));
console.log('built master.svg, formats/', FORMATS.map((F) => F.id).join(', '), '| token pairs:', pairs.map((p) => `${p.fg}/${p.bg} ${p.ratio}`).join(', '));
