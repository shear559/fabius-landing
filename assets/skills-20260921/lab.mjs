// The fifteen-skill lab. Every text that came out of a model run is inserted with textContent
// (never innerHTML): run outputs are data, not markup. Generated pages run only in sandboxed frames.
import { route, LADDER } from './runtime/route.mjs';

const ROOT = document.querySelector('[data-lab]');

const BASE = '/assets/skills-20260921/';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SVGNS = 'http://www.w3.org/2000/svg';

// ── tiny DOM helpers ────────────────────────────────────────────────────────────────────
function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) n.append(k.nodeType ? k : document.createTextNode(String(k)));
  return n;
}
function svg(tag, attrs = {}, ...kids) {
  const n = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) { if (k === 'text') n.textContent = v; else n.setAttribute(k, v); }
  for (const k of kids.flat()) if (k) n.append(k);
  return n;
}
const icon = (id) => { const s = svg('svg', { viewBox: id === 'emblem' ? '0 0 100 100' : '0 0 44 48', 'aria-hidden': 'true' }); s.append(svg('use', { href: '#' + id })); return s; };
const fmt = (n, d = 0) => Number(n).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });

// ── safe markdown (a strict subset) ─────────────────────────────────────────────────────
function inline(text, marks) {
  const frag = document.createDocumentFragment();
  const rx = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0, m;
  const plain = (s) => { if (marks) marks(frag, s); else frag.append(s); };
  while ((m = rx.exec(text))) {
    if (m.index > last) plain(text.slice(last, m.index));
    const t = m[0];
    if (m[1]) frag.append(el('code', { text: t.slice(1, -1) }));
    else if (m[2]) { const b = el('strong'); b.append(inline(t.slice(2, -2), marks)); frag.append(b); }
    else if (m[3]) { const i = el('em'); i.append(inline(t.slice(1, -1), marks)); frag.append(i); }
    else {
      const [, label, href] = t.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (/^https?:\/\//.test(href)) frag.append(el('a', { href, target: '_blank', rel: 'noopener noreferrer', text: label }));
      else frag.append(el('span', { text: label }));
    }
    last = rx.lastIndex;
  }
  if (last < text.length) plain(text.slice(last));
  return frag;
}
function markdown(src, marks) {
  const out = el('div', { class: 'v-doc' });
  const lines = String(src).replace(/\r/g, '').split('\n');
  let i = 0;
  const isTable = (l) => /^\s*\|.*\|\s*$/.test(l);
  while (i < lines.length) {
    const l = lines[i];
    if (/^```/.test(l)) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++; out.append(el('pre', {}, el('code', { text: buf.join('\n') }))); continue;
    }
    const h = l.match(/^(#{1,6})\s+(.*)$/);
    if (h) { const n = el('h' + Math.min(h[1].length + 1, 4)); n.append(inline(h[2], marks)); out.append(n); i++; continue; }
    if (isTable(l) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const cells = (row) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const table = el('table'), thead = el('thead'), tbody = el('tbody');
      const hr = el('tr'); cells(l).forEach((c) => { const th = el('th'); th.append(inline(c, marks)); hr.append(th); }); thead.append(hr);
      i += 2;
      while (i < lines.length && isTable(lines[i])) { const tr = el('tr'); cells(lines[i]).forEach((c) => { const td = el('td'); td.append(inline(c, marks)); tr.append(td); }); tbody.append(tr); i++; }
      table.append(thead, tbody); out.append(table); continue;
    }
    if (/^\s*([-*+]|\d+[.)])\s+/.test(l)) {
      const ordered = /^\s*\d+[.)]/.test(l);
      const list = el(ordered ? 'ol' : 'ul');
      while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) {
        let item = lines[i].replace(/^\s*([-*+]|\d+[.)])\s+/, ''); i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) item += ' ' + lines[i++].trim();
        const li = el('li'); li.append(inline(item.replace(/^\[( |x)\]\s*/, (s) => (s.includes('x') ? '☑ ' : '☐ ')), marks)); list.append(li);
      }
      out.append(list); continue;
    }
    if (/^>\s?/.test(l)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      const q = el('blockquote'); q.append(inline(buf.join(' '), marks)); out.append(q); continue;
    }
    if (!l.trim() || /^(-{3,}|\*{3,})$/.test(l.trim())) { i++; continue; }
    const buf = [l]; i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|>|\s*([-*+]|\d+[.)])\s)/.test(lines[i]) && !isTable(lines[i])) buf.push(lines[i++]);
    const p = el('p'); p.append(inline(buf.join(' '), marks)); out.append(p);
  }
  return out;
}

// hover/focus popover for marks inside a document
function attachPop(host) {
  let pop = null;
  const show = (m) => {
    hide(); pop = el('div', { class: 'v-pop', role: 'tooltip' }, el('small', { text: m.dataset.src || '' }), m.dataset.pop || '');
    host.style.position = 'relative'; host.append(pop);
    const r = m.getBoundingClientRect(), hr = host.getBoundingClientRect();
    pop.style.left = Math.max(8, Math.min(r.left - hr.left + host.scrollLeft, host.clientWidth - 370)) + 'px';
    pop.style.top = (r.bottom - hr.top + host.scrollTop + 8) + 'px';
  };
  const hide = () => { pop?.remove(); pop = null; };
  host.addEventListener('mouseover', (e) => { const m = e.target.closest('mark[data-pop]'); if (m) show(m); });
  host.addEventListener('mouseout', (e) => { if (e.target.closest('mark[data-pop]')) hide(); });
  host.addEventListener('focusin', (e) => { const m = e.target.closest('mark[data-pop]'); if (m) show(m); });
  host.addEventListener('focusout', hide);
}

// ── panels (one renderer per kind of output) ───────────────────────────────────────────
const P = {};
P.md = (p) => { const box = el('div', { class: 'v-box' }); box.append(markdown(p.text)); return box; };
P.term = (p) => el('div', { class: 'v-box' }, el('pre', { class: 'v-term', text: p.text }));
P.diff = (p) => {
  const box = el('div', { class: 'v-box' }), pre = el('div', { class: 'v-diff' });
  for (const line of String(p.text).split('\n')) {
    const cls = /^(\+\+\+|---|diff |index )/.test(line) ? 'meta' : line.startsWith('@@') ? 'hunk' : line.startsWith('+') ? 'add' : line.startsWith('-') ? 'del' : '';
    pre.append(el('div', { class: cls, text: line || ' ' }));
  }
  box.append(pre); return box;
};
P.stats = (p) => el('div', { class: 'v-stats' }, p.items.map((s) => el('div', { class: 'v-stat' }, el('b', { class: s.tone || '', text: s.value }), el('span', { text: s.label }))));
P.lead = (p) => { const n = el('p', { class: 'v-lead' }); n.append(inline(p.text)); return n; };
P.frame = (p) => {
  const wrap = el('div', { class: 'v-frame-wrap', 'data-device': 'desktop' });
  const frame = el('iframe', { class: 'v-frame', title: p.title, loading: 'lazy', sandbox: 'allow-scripts allow-forms', referrerpolicy: 'no-referrer', src: p.src });
  const tabs = el('div', { class: 'v-tabs', role: 'group', 'aria-label': 'Preview width' });
  for (const d of ['desktop', 'phone']) tabs.append(el('button', { type: 'button', 'aria-pressed': String(d === 'desktop'), text: d === 'desktop' ? 'Desktop' : 'Phone',
    onclick: (e) => { wrap.dataset.device = d; tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); } }));
  wrap.append(tabs, el('div', { class: 'v-frame-shell' }, el('div', { class: 'v-frame-bar' }, el('span', { text: p.bar || p.title }), el('a', { href: p.src, target: '_blank', rel: 'noopener', text: 'Open ↗' })), frame));
  if (p.note) wrap.append(el('p', { class: 'v-note', text: p.note }));
  return wrap;
};
P.table = (p) => {
  const t = el('table', { class: 'v-grid-table' });
  t.append(el('thead', {}, el('tr', {}, p.head.map((h) => el('th', { text: h })))));
  const b = el('tbody');
  for (const row of p.rows) b.append(el('tr', {}, row.map((c) => typeof c === 'object' ? el('td', { class: c.tone || '', text: c.text }) : el('td', { text: c }))));
  t.append(b); return el('div', { class: 'v-box' }, t);
};
P.cited = (p) => {
  // documents whose "file:line" citations resolve against the shipped source files
  const box = el('div', { class: 'v-box' });
  const rx = /([\w./-]+\.(?:md|txt|csv)):(\d+)/g;
  const marks = (frag, s) => {
    let last = 0, m;
    while ((m = rx.exec(s))) {
      if (m.index > last) frag.append(s.slice(last, m.index));
      const src = p.sources[m[1]] || p.sources[m[1].split('/').pop()];
      const line = src ? src[Number(m[2]) - 1] : null;
      frag.append(line != null ? el('mark', { class: 'cite', tabindex: '0', 'data-src': `${m[1]} · line ${m[2]}`, 'data-pop': line || '(empty line)', text: m[0] }) : m[0]);
      last = rx.lastIndex;
    }
    rx.lastIndex = 0;
    if (last < s.length) frag.append(s.slice(last));
  };
  box.append(markdown(p.text, marks)); attachPop(box); return box;
};
P.facts = (p) => {
  // copy where every number is traced to the fact sheet line that holds it
  const box = el('div', { class: 'v-box' });
  const rx = /\$?\d[\d,.]*(?:\s?(?:%|minutes|days|spots|marinas|testers|weeks|a month|a year))?/g;
  const marks = (frag, s) => {
    let last = 0, m;
    while ((m = rx.exec(s))) {
      if (m.index > last) frag.append(s.slice(last, m.index));
      // list numbering ("1.") and option labels ("Option 2") are not claims
      if (/^\d\.$/.test(m[0]) || (/^\d$/.test(m[0]) && /(option|#)\s*$/i.test(s.slice(0, m.index)))) { frag.append(m[0]); last = rx.lastIndex; continue; }
      const num = m[0].replace(/[^\d.]/g, '');
      const hit = p.facts.find((f) => f.replace(/,/g, '').match(new RegExp(`(?<![\\d.])${num.replace('.', '\\.')}(?![\\d])`)));
      frag.append(el('mark', { class: hit ? '' : 'cite', tabindex: '0', 'data-src': hit ? 'FACTS.md' : 'no fact line', 'data-pop': hit || 'This number is not in the fact sheet.', text: m[0] }));
      last = rx.lastIndex;
    }
    rx.lastIndex = 0;
    if (last < s.length) frag.append(s.slice(last));
  };
  box.append(markdown(p.text, marks)); attachPop(box); return box;
};
P.graph = (p) => {
  // nodes carry their own x/y (n8n stores positions; the cohors plan is laid out by level).
  // A flow much wider than tall is re-laid top to bottom: columns become rows, rows become lanes,
  // and error nodes move below their last source so every error path drains down one gutter.
  const pad = 30, w = 210, h = 64;
  const span = (a) => Math.max(...a) - Math.min(...a);
  let nodes = p.nodes.map((n) => ({ ...n }));
  const vertical = span(nodes.map((n) => n.x)) > 2.5 * span(nodes.map((n) => n.y));
  if (vertical) {
    const ranker = (vals, tol) => { const groups = []; for (const v of [...new Set(vals)].sort((a, b) => a - b)) { const g = groups[groups.length - 1]; if (g && v - g[g.length - 1] <= tol) g.push(v); else groups.push([v]); } return (v) => groups.findIndex((g) => g.includes(v)); };
    const rx = ranker(nodes.map((n) => n.x), 40), ry = ranker(nodes.map((n) => n.y), 40);
    nodes.forEach((n) => { n.rank = rx(n.x); n.lane = ry(n.y); });
    const isErr = (n) => n.kind === 'error';
    const byId0 = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const feeders = p.edges.filter((e) => isErr(byId0[e.to] || {}) && !isErr(byId0[e.from] || {})).map((e) => byId0[e.from]?.rank ?? 0);
    const base = feeders.length ? Math.max(...feeders) + 1 : 0;
    nodes.filter(isErr).sort((a, b) => a.rank - b.rank).forEach((n, i) => { n.rank = base + i; });
    nodes.forEach((n) => { n.x = n.lane * (w + 40); n.y = n.rank * (h + 30); });
  }
  const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs) - pad, minY = Math.min(...ys) - pad, W = Math.max(...xs) - minX + w + pad + (vertical ? 50 : 0), H = Math.max(...ys) - minY + h + pad;
  // never drawn larger than natural size, so every graph shares one type scale
  const s = svg('svg', { class: 'v-svg', viewBox: `${minX} ${minY} ${W} ${H}`, role: 'img', 'aria-label': p.label, style: `max-width:${Math.round(W)}px;margin-inline:auto` });
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  s.append(svg('defs', {}, svg('marker', { id: 'gArrow', viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto' }, svg('path', { d: 'M1 1 L9 5 L1 9', fill: 'none', stroke: '#9ade2b', 'stroke-width': '1.6' }))));
  for (const e of p.edges) {
    const a = byId[e.from], b = byId[e.to]; if (!a || !b) continue;
    let d, lx, ly;
    if (vertical) {
      const acx = a.x + w / 2, bcx = b.x + w / 2, amy = a.y + h / 2;
      if (b.kind === 'error' && a.kind !== 'error') d = `M${a.x + w} ${amy} H${bcx - 12} Q${bcx} ${amy} ${bcx} ${amy + 12} V${b.y - 4}`;
      else if (a.lane === b.lane && b.rank - a.rank === 1) d = `M${acx} ${a.y + h} V${b.y - 4}`;
      else if (b.rank > a.rank && a.lane !== b.lane) d = `M${acx} ${a.y + h} C ${acx} ${a.y + h + 26}, ${bcx} ${b.y - 30}, ${bcx} ${b.y - 4}`;
      else { const r = Math.max(a.x, b.x) + w, bulge = r + 40; d = `M${a.x + w} ${amy} C ${bulge} ${amy}, ${bulge} ${b.y + h / 2}, ${b.x + w + 4} ${b.y + h / 2}`; }
      lx = (acx + bcx) / 2; ly = (a.y + h + b.y) / 2;
    } else {
      const x1 = a.x + w, y1 = a.y + h / 2, x2 = b.x - 4, y2 = b.y + h / 2, mx = (x1 + x2) / 2;
      const back = x2 < x1;
      d = back ? `M${a.x + w / 2} ${a.y + h} C ${a.x + w / 2} ${a.y + h + 60}, ${b.x + w / 2} ${b.y + h + 60}, ${b.x + w / 2} ${b.y + h + 4}` : `M${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
      lx = back ? (a.x + b.x + w) / 2 : mx; ly = (y1 + y2) / 2 - 6;
    }
    s.append(svg('path', { d, fill: 'none', stroke: e.kind === 'error' ? '#ff8a73' : '#9ade2b', 'stroke-width': '1.8', 'stroke-dasharray': e.kind === 'error' ? '6 5' : null, opacity: '.8', 'marker-end': 'url(#gArrow)' }));
    if (e.label) s.append(svg('text', { x: lx, y: ly, 'text-anchor': 'middle', 'font-size': '11', text: e.label }));
  }
  for (const n of nodes) {
    const tone = n.kind === 'error' ? '#ff8a73' : n.kind === 'human' ? '#ffd479' : n.kind === 'trigger' ? '#7fd6dc' : '#9ade2b';
    const g = svg('g', {}, svg('title', { text: n.sub ? `${n.label} · ${n.sub}` : n.label }));
    g.append(svg('rect', { x: n.x, y: n.y, width: w, height: h, rx: '12', fill: '#16211a', stroke: tone, 'stroke-width': '1.5' }));
    g.append(svg('text', { x: n.x + 14, y: n.y + 26, 'font-size': '14', 'font-weight': '600', fill: '#fff', text: n.label.length > 22 ? n.label.slice(0, 21) + '…' : n.label }));
    if (n.sub) g.append(svg('text', { x: n.x + 14, y: n.y + 46, 'font-size': '11', fill: '#95a292', text: n.sub.length > 28 ? n.sub.slice(0, 27) + '…' : n.sub }));
    s.append(g);
  }
  return el('div', { class: 'v-box v-graph', style: 'padding:10px' }, s);
};
P.scatter = (p) => {
  // volcano: x = log2 fold change, y = −log10 p; called genes and planted responders marked
  const W = 720, H = 420, L = 56, B = 44, T = 16, R = 16;
  const xs = p.points.map((d) => d.x), ys = p.points.map((d) => d.y);
  const xMax = Math.max(4, Math.ceil(Math.max(...xs.map(Math.abs)))), yMax = Math.max(4, Math.ceil(Math.max(...ys)));
  const sx = (v) => L + (v + xMax) / (2 * xMax) * (W - L - R), sy = (v) => H - B - v / yMax * (H - B - T);
  const s = svg('svg', { class: 'v-svg', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': p.label });
  for (let v = -xMax; v <= xMax; v += 1) s.append(svg('line', { x1: sx(v), x2: sx(v), y1: T, y2: H - B, stroke: 'rgba(255,255,255,.06)' }), svg('text', { x: sx(v), y: H - B + 18, 'text-anchor': 'middle', 'font-size': '11', text: String(v) }));
  for (let v = 0; v <= yMax; v += Math.max(1, Math.round(yMax / 6))) s.append(svg('line', { x1: L, x2: W - R, y1: sy(v), y2: sy(v), stroke: 'rgba(255,255,255,.06)' }), svg('text', { x: L - 8, y: sy(v) + 4, 'text-anchor': 'end', 'font-size': '11', text: String(v) }));
  s.append(svg('text', { x: (L + W - R) / 2, y: H - 8, 'text-anchor': 'middle', 'font-size': '12', text: p.xLabel }), svg('text', { x: 14, y: (T + H - B) / 2, 'text-anchor': 'middle', 'font-size': '12', transform: `rotate(-90 14 ${(T + H - B) / 2})`, text: p.yLabel }));
  const g = svg('g');
  const order = [...p.points].sort((a, b) => (a.called === b.called ? 0 : a.called ? 1 : -1));
  for (const d of order) g.append(svg('circle', { cx: sx(d.x), cy: sy(d.y), r: d.called ? 3.6 : 2.2, fill: d.called ? '#9ade2b' : 'rgba(200,210,195,.35)', stroke: d.truth ? '#ffd479' : 'none', 'stroke-width': d.truth ? '1.6' : null, 'data-truth': d.truth ? '1' : null }));
  s.append(g);
  const box = el('div', { class: 'v-box', style: 'padding:12px' }, s);
  if (p.truthToggle) {
    const btn = el('button', { type: 'button', class: 'v-btn ghost', 'aria-pressed': 'false', text: 'Reveal the planted responders',
      onclick: () => { const on = btn.getAttribute('aria-pressed') !== 'true'; btn.setAttribute('aria-pressed', String(on)); btn.textContent = on ? 'Hide the planted responders' : 'Reveal the planted responders'; g.querySelectorAll('[data-truth]').forEach((c) => c.setAttribute('stroke-opacity', on ? '1' : '0')); } });
    g.querySelectorAll('[data-truth]').forEach((c) => c.setAttribute('stroke-opacity', '0'));
    return el('div', {}, box, el('div', { style: 'margin-top:10px' }, btn), p.note ? el('p', { class: 'v-note', text: p.note }) : null);
  }
  return box;
};
P.lines = (p) => {
  // line chart for equity curves; optional shaded split (in-sample vs out-of-sample)
  const W = 760, H = 380, L = 60, B = 40, T = 18, R = 18;
  const n = p.x.length, all = p.series.flatMap((s) => s.values);
  const lo = Math.min(...all), hi = Math.max(...all);
  const sx = (i) => L + i / (n - 1) * (W - L - R), sy = (v) => H - B - (v - lo) / (hi - lo || 1) * (H - B - T);
  const s = svg('svg', { class: 'v-svg', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': p.label });
  if (p.split != null) s.append(svg('rect', { x: sx(p.split), y: T, width: W - R - sx(p.split), height: H - B - T, fill: 'rgba(24,174,181,.08)' }), svg('text', { x: W - R - 6, y: T + 16, 'text-anchor': 'end', 'font-size': '11', fill: '#7fd6dc', text: p.splitLabel || 'out of sample' }));
  // enough decimals that five gridlines never share a label
  const dec = hi - lo >= 20 ? 0 : hi - lo >= 2 ? 1 : 2;
  for (let k = 0; k <= 4; k++) { const v = lo + (hi - lo) * k / 4; s.append(svg('line', { x1: L, x2: W - R, y1: sy(v), y2: sy(v), stroke: 'rgba(255,255,255,.06)' }), svg('text', { x: L - 8, y: sy(v) + 4, 'text-anchor': 'end', 'font-size': '11', text: fmt(v, dec) })); }
  const ticks = p.xTicks || [0, Math.floor(n / 2), n - 1];
  for (const i of ticks) s.append(svg('text', { x: sx(i), y: H - B + 20, 'text-anchor': i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle', 'font-size': '11', text: p.x[i] }));
  p.series.forEach((ser) => {
    const d = ser.values.map((v, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ');
    s.append(svg('path', { d, fill: 'none', stroke: ser.color, 'stroke-width': ser.width || 2, 'stroke-dasharray': ser.dash || null }));
  });
  const legend = el('div', { class: 'st-legend', style: 'margin-top:10px' }, p.series.map((ser) => el('span', { style: `--c:${ser.color}`, text: ser.name })));
  return el('div', { class: 'v-box', style: 'padding:12px' }, s, legend);
};
P.heat = (p) => {
  // confusion matrix, rows = true label, cols = predicted
  const k = p.labels.length, cell = 88, L = 150, T = 70;
  const W = L + k * cell + 20, H = T + k * cell + 20;
  const max = Math.max(...p.matrix.flat());
  const s = svg('svg', { class: 'v-svg', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': p.label, style: 'max-width:620px' });
  p.labels.forEach((lab, j) => s.append(svg('text', { x: L + j * cell + cell / 2, y: T - 12, 'text-anchor': 'middle', 'font-size': '11', text: lab.replace('_', ' ') })));
  s.append(svg('text', { x: L + k * cell / 2, y: 20, 'text-anchor': 'middle', 'font-size': '11.5', fill: '#95a292', text: 'predicted →' }));
  p.matrix.forEach((row, i) => {
    s.append(svg('text', { x: L - 10, y: T + i * cell + cell / 2 + 4, 'text-anchor': 'end', 'font-size': '11', text: p.labels[i].replace('_', ' ') }));
    row.forEach((v, j) => {
      const a = v / max;
      s.append(svg('rect', { x: L + j * cell + 2, y: T + i * cell + 2, width: cell - 4, height: cell - 4, rx: '8', fill: i === j ? `rgba(118,185,0,${0.12 + a * 0.8})` : `rgba(255,138,115,${v ? 0.1 + a * 0.9 : 0.03})` }));
      s.append(svg('text', { x: L + j * cell + cell / 2, y: T + i * cell + cell / 2 + 6, 'text-anchor': 'middle', 'font-size': '17', 'font-weight': '600', fill: '#fff', text: String(v) }));
    });
  });
  return el('div', { class: 'v-box', style: 'padding:12px' }, s);
};
P.seal = (p) => {
  // recompute every leaf and the Merkle root in the browser, with the run's own scheme; edit a file to break it
  const wrap = el('div');
  const enc = new TextEncoder();
  const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const unhex = (h) => new Uint8Array(h.match(/../g).map((x) => parseInt(x, 16)));
  const sha = async (bytes) => new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const files = p.files.map((f) => ({ ...f }));
  const select = el('select', { class: 'v-btn ghost', 'aria-label': 'File to edit', style: 'min-height:38px' }, files.map((f, i) => el('option', { value: String(i), text: f.path })));
  const area = el('textarea', { class: 'v-edit', spellcheck: 'false', 'aria-label': 'File contents' });
  const rows = el('div', { class: 'v-seal' });
  const verdict = el('p', { class: 'v-verdict ok', role: 'status', 'aria-live': 'polite' });
  const sigLine = el('p', { class: 'v-note' });
  let cur = 0;
  area.value = files[0].text;
  const leafOf = async (f) => {
    const path = enc.encode(f.path), body = enc.encode(f.text);
    const buf = new Uint8Array(path.length + 1 + body.length); buf.set(path, 0); buf.set(body, path.length + 1);
    return sha(buf);
  };
  async function recompute() {
    files[cur].text = area.value;
    const sorted = [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    const leaves = [];
    rows.textContent = '';
    for (const f of sorted) {
      const leaf = await leafOf(f), h = hex(leaf), ok = h === f.leaf;
      leaves.push(leaf);
      rows.append(el('div', { class: ok ? 'ok' : 'bad' }, el('span', { text: f.path }), el('code', { text: h }), el('i', { 'aria-label': ok ? 'matches' : 'changed', text: ok ? '✓' : '✗' })));
    }
    let level = leaves;
    while (level.length > 1) {
      if (level.length % 2) level = [...level, level[level.length - 1]];
      const next = [];
      for (let i = 0; i < level.length; i += 2) { const c = new Uint8Array(64); c.set(level[i], 0); c.set(level[i + 1], 32); next.push(await sha(c)); }
      level = next;
    }
    const root = hex(level[0]), ok = root === p.root;
    rows.append(el('div', { class: ok ? 'ok' : 'bad' }, el('span', { text: 'Merkle root' }), el('code', { text: root }), el('i', { text: ok ? '✓' : '✗' })));
    verdict.className = 'v-verdict ' + (ok ? 'ok' : 'bad');
    verdict.textContent = ok ? `Seal holds. The root your browser computed matches the signed root (${p.root.slice(0, 12)}…).` : 'Seal broken. A single changed byte gives a different leaf, and the root no longer matches the signed one.';
    if (ok && p.sig && p.pub && crypto.subtle) {
      try {
        const key = await crypto.subtle.importKey('raw', unhex(p.pub), { name: 'Ed25519' }, false, ['verify']);
        const good = await crypto.subtle.verify({ name: 'Ed25519' }, key, unhex(p.sig), p.signed === 'root-hex' ? enc.encode(p.root) : unhex(p.root));
        sigLine.textContent = good ? 'Ed25519 signature over the root: verified in your browser.' : 'Ed25519 signature: did not verify in this browser.';
      } catch { sigLine.textContent = 'This browser cannot check Ed25519 signatures; the bundled verify.mjs checked it (see the checks).'; }
    } else sigLine.textContent = ok ? '' : 'The signature covers the original root, so it cannot cover this one.';
  }
  select.addEventListener('change', () => { files[cur].text = area.value; cur = Number(select.value); area.value = files[cur].text; recompute(); });
  let t; area.addEventListener('input', () => { clearTimeout(t); t = setTimeout(recompute, 120); });
  const reset = el('button', { type: 'button', class: 'v-btn ghost', text: 'Restore the original files', onclick: () => { p.files.forEach((f, i) => { files[i].text = f.text; }); area.value = files[cur].text; recompute(); } });
  wrap.append(el('p', { class: 'v-lead' }, 'Change any character below. Your browser rehashes every file with the seal\'s own scheme and rebuilds the Merkle root.'),
    el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px' }, select, reset), area, rows, verdict, sigLine);
  recompute();
  return wrap;
};
P.council = (p) => {
  const wrap = el('div');
  const ops = el('div', { style: 'display:grid;gap:10px' });
  p.opinions.forEach((o, i) => {
    const d = el('details', { class: 'v-box', style: 'padding:0 14px' }, el('summary', { style: 'cursor:pointer;min-height:44px;display:flex;align-items:center;gap:10px;font:600 13px var(--mono);color:#fff' }, `Seat ${i + 1} · ${o.model}`, el('span', { style: 'color:#95a292;font-weight:400', text: o.short })));
    d.append(markdown(o.answer)); ops.append(d);
  });
  wrap.append(el('p', { class: 'v-cap', text: 'Stage 1 · first opinions, answered independently' }), ops);
  wrap.append(el('p', { class: 'v-cap', style: 'margin-top:18px', text: 'Stage 2 · blind peer review (each seat ranks every answer; its own vote on itself is removed)' }));
  wrap.append(P.table({ head: ['Seat', 'Points', 'What the reviewers said'], rows: p.leaderboard.map((e) => [e.model, String(e.points), e.reasons?.[0] || '']) }));
  wrap.append(el('p', { class: 'v-cap', style: 'margin-top:18px', text: `Stage 3 · the chairman (${p.chairman}) synthesizes` }));
  const fin = el('div', { class: 'v-box' }); fin.append(markdown(p.final)); wrap.append(fin);
  return wrap;
};

// ── the router widget ───────────────────────────────────────────────────────────────────
function routerWidget(tiles) {
  const box = ROOT.querySelector('[data-lab-router]'); if (!box) return;
  const input = box.querySelector('input'), layersEl = box.querySelector('[data-route-layers]'), rungs = [...box.querySelectorAll('[data-route-rungs] li')];
  const rungName = box.querySelector('[data-route-rung]'), tierEl = box.querySelector('[data-route-tier]'), why = box.querySelector('[data-route-why]');
  const RUNG = { inline: 'answer inline', tool: 'one tool call', retrieval: 'retrieval', plan: 'a written plan', subagent: 'a single subagent', swarm: 'a swarm' };
  function show() {
    const text = input.value.trim() || input.placeholder;
    const r = route(text);
    layersEl.textContent = '';
    for (const l of ['fabius', ...r.layers]) layersEl.append(el('span', { class: l === 'fabius' || l === 'fabius-parcus' ? 'core' : '', text: l }));
    const idx = LADDER.indexOf(r.rung);
    rungs.forEach((li, i) => { li.classList.toggle('on', i < idx); li.classList.toggle('stop', i === idx); });
    rungName.textContent = `${RUNG[r.rung]} · stops before ${RUNG[LADDER[Math.min(idx + 1, LADDER.length - 1)]]}`;
    tierEl.querySelectorAll('span').forEach((s) => { const on = s.dataset.tier === r.tier; s.classList.toggle('on', on); s.toggleAttribute('aria-current', on); });
    why.textContent = r.rationale.tier.replace(/^R11 → /, '');
    const set = new Set(r.layers);
    tiles.forEach((t) => t.classList.toggle('lit', set.has(t.dataset.skill)));
  }
  let tm; input.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(show, 90); });
  box.querySelectorAll('[data-try]').forEach((b) => b.addEventListener('click', () => { input.value = b.dataset.try; show(); input.focus(); }));
  show();
}

// ── the stage ───────────────────────────────────────────────────────────────────────────
let playing = null;
function renderStage(stage, run) {
  if (playing) { clearInterval(playing); playing = null; }
  stage.textContent = '';
  const receipt = el('dl', { class: 'st-receipt' }, run.receipt.map(([k, v]) => el('div', {}, el('dt', { text: k }), el('dd', { text: v }))));
  stage.append(el('header', { class: 'st-head' }, el('div', { class: 'st-id' }, icon(run.icon), el('div', {}, el('p', { class: 'st-skill', text: run.skill }), el('h3', { class: 'st-title', text: run.title }))), receipt));
  const ask = el('div', { class: 'st-ask' }, el('p', { class: 'st-label', text: 'What it was asked' }), el('blockquote', { text: run.ask }));
  ask.append(el('details', {}, el('summary', { text: 'The full brief, word for word' }), el('pre', { text: run.brief })));
  stage.append(ask);
  const view = el('div', { class: 'st-view' });
  const panels = run.panels;
  const holder = el('div');
  if (panels.length > 1) {
    const tabs = el('div', { class: 'v-tabs', role: 'group', 'aria-label': 'Outputs' });
    panels.forEach((pn, i) => tabs.append(el('button', { type: 'button', 'aria-pressed': String(i === 0), text: pn.tab,
      onclick: (e) => { tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); holder.textContent = ''; holder.append(...buildPanel(pn)); } })));
    view.append(tabs);
  }
  holder.append(...buildPanel(panels[0]));
  view.append(holder);
  const side = el('aside', { class: 'st-side', 'aria-label': 'Rules and checks' },
    el('section', {}, el('h4', { text: 'What the skill held to' }), el('ul', { class: 'st-rules' }, run.rules.map((r) => el('li', {}, el('b', { text: r.rule }), r.evidence)))),
    el('section', {}, el('h4', { text: 'Checks we ran afterwards' }), el('ul', { class: 'st-checks' }, run.checks.map((c) => el('li', { class: c.state }, el('i', { 'aria-label': c.state, text: c.state === 'pass' ? '✓' : c.state === 'fail' ? '✗' : '!' }), el('span', {}, c.name, c.detail ? el('small', { text: c.detail }) : null))))),
    el('section', {}, el('h4', { text: 'Everything it produced' }), el('div', { class: 'st-files' }, run.files.map((f) => el('a', { href: f.href, target: '_blank', rel: 'noopener', text: f.label })))));
  stage.append(el('div', { class: 'st-body' }, view, side));
  stage.append(traceStrip(run));
}
function buildPanel(pn) { return pn.parts.map((part) => P[part.type](part)); }

function traceStrip(run) {
  const wrap = el('div', { class: 'st-trace' });
  const ticks = el('div', { class: 'st-ticks', role: 'img', 'aria-label': `${run.trace.length} steps over ${run.seconds} seconds` });
  const total = Math.max(1, run.seconds);
  const kinds = { skill: 'k-skill', write: 'k-write', run: 'k-run', read: 'k-read' };
  const marks = run.trace.map((s) => { const i = el('i', { class: kinds[s.kind] || '' }); i.style.left = `calc(${(s.t / total) * 100}% - 1px)`; ticks.append(i); return i; });
  const cursor = el('span', { class: 'st-cursor' }); ticks.append(cursor);
  const now = el('p', { class: 'st-now', 'aria-live': 'off' });
  const btn = el('button', { type: 'button', class: 'st-play', text: '▶ Replay the run' });
  const setStep = (k) => {
    const s = run.trace[k]; if (!s) return;
    marks.forEach((m, j) => m.classList.toggle('done', j <= k));
    cursor.style.left = `${(s.t / total) * 100}%`;
    now.textContent = ''; now.append(el('b', { text: `${fmtTime(s.t)}  ${s.tool}` }), '  ' + s.label);
  };
  const fmtTime = (t) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`;
  btn.addEventListener('click', () => {
    if (playing) { clearInterval(playing); playing = null; btn.textContent = '▶ Replay the run'; return; }
    if (reduce) { setStep(run.trace.length - 1); return; }
    let k = 0; btn.textContent = '❚❚ Pause';
    playing = setInterval(() => { setStep(k++); if (k >= run.trace.length) { clearInterval(playing); playing = null; btn.textContent = '▶ Replay the run'; } }, Math.max(90, Math.min(420, 11000 / run.trace.length)));
  });
  now.textContent = `${run.trace.length} steps in ${fmtTime(run.seconds)}. Press replay to watch them in order.`;
  const legend = el('div', { class: 'st-legend' }, el('span', { style: '--c:#ffd479', text: 'skill loaded' }), el('span', { style: '--c:#9ade2b', text: 'wrote a file' }), el('span', { style: '--c:#7fd6dc', text: 'ran a command' }), el('span', { style: '--c:#8f9a8c', text: 'read' }));
  wrap.append(btn, ticks, now, legend);
  return wrap;
}

// ── boot ────────────────────────────────────────────────────────────────────────────────
async function boot() {
  const data = await (await fetch(BASE + 'data.json', { cache: 'no-cache' })).json();
  const grid = ROOT.querySelector('[data-lab-grid]'), stage = ROOT.querySelector('[data-lab-stage]');
  // the static links stay for readers without scripts; with scripts the grid becomes a tab list
  grid.textContent = ''; grid.setAttribute('role', 'tablist'); grid.setAttribute('aria-label', 'The fifteen skills');
  stage.setAttribute('role', 'tabpanel'); stage.hidden = false;
  const box = ROOT.querySelector('[data-lab-router]'); if (box) box.hidden = false;
  const sum = ROOT.querySelector('[data-lab-sum]');
  if (sum) {
    const steps = data.runs.reduce((n, r) => n + r.trace.length, 0), secs = data.runs.reduce((n, r) => n + r.seconds, 0);
    const checks = data.runs.flatMap((r) => r.checks), pass = checks.filter((c) => c.state === 'pass').length;
    sum.textContent = '';
    for (const [v, k] of [[data.runs.length, 'real runs'], [fmt(steps), 'tool steps'], [`${Math.round(secs / 60)} min`, 'of model work'], [`${pass}/${checks.length}`, 'checks passed'], [data.plugin, data.model]])
      sum.append(el('span', {}, el('b', { text: String(v) }), ' ' + k));
  }
  const tiles = data.runs.map((run, i) => {
    const b = el('button', { type: 'button', class: 'lab-tile', role: 'tab', id: `lab-tab-${run.key}`, 'aria-controls': 'lab-stage', 'aria-selected': String(i === 0), tabindex: i === 0 ? '0' : '-1', 'data-skill': run.skill },
      icon(run.icon), el('b', { text: run.skill }), el('small', { text: run.role }), el('em', { text: run.headline }));
    b.addEventListener('click', () => select(i, true));
    grid.append(b);
    return b;
  });
  function select(i, focus) {
    tiles.forEach((t, j) => { t.setAttribute('aria-selected', String(j === i)); t.tabIndex = j === i ? 0 : -1; });
    stage.setAttribute('aria-labelledby', tiles[i].id);
    renderStage(stage, data.runs[i]);
    if (focus) tiles[i].focus();
  }
  grid.addEventListener('keydown', (e) => {
    const i = tiles.findIndex((t) => t === document.activeElement); if (i < 0) return;
    const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (k) { e.preventDefault(); const j = (i + k + tiles.length) % tiles.length; tiles[j].focus(); select(j, false); }
    if (e.key === 'Home') { e.preventDefault(); select(0, true); }
    if (e.key === 'End') { e.preventDefault(); select(tiles.length - 1, true); }
  });
  select(0, false);
  routerWidget(tiles);
}

if (ROOT) boot().catch((e) => { console.error(e); const s = ROOT.querySelector('[data-lab-status]'); if (s) s.textContent = 'The demonstrations could not load. Each run is still linked above.'; });
