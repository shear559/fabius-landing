(function () {
  'use strict';
  var D = window.LATTICE;
  if (!D) return;
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  // ---- Master artwork, drawn live -------------------------------------
  var host = $('master-host');
  host.innerHTML = D.master;
  var svg = host.querySelector('svg');
  svg.setAttribute('aria-hidden', 'true');
  var list = $('layer-list');
  D.layers.forEach(function (L) {
    var id = 'chk-' + L.id;
    var li = el('li');
    var label = el('label', { for: id });
    var input = el('input', { type: 'checkbox', id: id });
    input.checked = true;
    input.addEventListener('change', function () {
      var g = svg.getElementById(L.id);
      if (g) g.style.display = input.checked ? '' : 'none';
    });
    label.appendChild(input);
    label.appendChild(document.createTextNode(L.label));
    li.appendChild(label);
    list.appendChild(li);
    if (L.id === 'layer-threads') { // the tour clicks this label: the threads disappear live
      document.querySelector('.layers').removeAttribute('data-tour-step');
      label.setAttribute('data-tour-step', '1'); label.setAttribute('data-tour-action', 'click');
    }
  });
  $('layers-reset').addEventListener('click', function () {
    list.querySelectorAll('input').forEach(function (i) {
      if (!i.checked) { i.checked = true; i.dispatchEvent(new Event('change')); }
    });
  });

  // ---- Format switcher ------------------------------------------------
  var measured = {};
  (D.measured || []).forEach(function (m) { measured[m.id] = m; });
  var state = { id: 'billboard', grid: false, safe: false, zoom: false };
  var sw = $('format-switch');
  D.formats.forEach(function (F) {
    var b = el('button', { type: 'button', class: 'btn', 'aria-pressed': 'false', 'data-id': F.id }, F.name);
    if (F.id === 'story') b.setAttribute('data-tour-action', 'click');
    b.addEventListener('click', function () { state.id = F.id; render(); });
    sw.appendChild(b);
  });
  // The tour marks the switcher group; its click action lands on the Story button.
  var tourBtn = sw.querySelector('[data-id="story"]');
  sw.removeAttribute('data-tour-step');
  tourBtn.setAttribute('data-tour-step', '2');

  function toggle(btnId, key) {
    $(btnId).addEventListener('click', function () { state[key] = !state[key]; render(); });
  }
  toggle('t-grid', 'grid'); toggle('t-safe', 'safe'); toggle('t-zoom', 'zoom');

  function overlay(F) {
    var o = $('overlay');
    o.setAttribute('viewBox', '0 0 ' + F.w + ' ' + F.h);
    while (o.firstChild) o.removeChild(o.firstChild);
    var sx = F.safe.x, sy = F.safe.y, iw = F.w - 2 * sx, ih = F.h - 2 * sy;
    var sw1 = Math.max(F.w, F.h) / 540; // ~2 px on screen at fit size
    if (state.grid) {
      var col = (iw - F.gutter * (F.cols - 1)) / F.cols;
      for (var i = 0; i < F.cols; i++) {
        var r = document.createElementNS(NS, 'rect');
        r.setAttribute('x', sx + i * (col + F.gutter)); r.setAttribute('y', sy);
        r.setAttribute('width', col); r.setAttribute('height', ih);
        r.setAttribute('fill', '#cf3a8a'); r.setAttribute('fill-opacity', '.12');
        o.appendChild(r);
      }
      [1, 2].forEach(function (k) { // thirds
        var h = document.createElementNS(NS, 'line');
        h.setAttribute('x1', 0); h.setAttribute('x2', F.w); h.setAttribute('y1', F.h * k / 3); h.setAttribute('y2', F.h * k / 3);
        h.setAttribute('stroke', '#cf3a8a'); h.setAttribute('stroke-width', sw1); h.setAttribute('stroke-dasharray', sw1 * 4 + ' ' + sw1 * 4);
        o.appendChild(h);
      });
    }
    if (state.safe) {
      var m = document.createElementNS(NS, 'path');
      m.setAttribute('d', 'M0 0H' + F.w + 'V' + F.h + 'H0Z M' + sx + ' ' + sy + 'V' + (F.h - sy) + 'H' + (F.w - sx) + 'V' + sy + 'Z');
      m.setAttribute('fill', '#1c2923'); m.setAttribute('fill-opacity', '.35'); m.setAttribute('fill-rule', 'evenodd');
      o.appendChild(m);
      var s = document.createElementNS(NS, 'rect');
      s.setAttribute('x', sx); s.setAttribute('y', sy); s.setAttribute('width', iw); s.setAttribute('height', ih);
      s.setAttribute('fill', 'none'); s.setAttribute('stroke', '#cbe792'); s.setAttribute('stroke-width', sw1 * 1.5);
      o.appendChild(s);
    }
  }

  // Every ratio is shown with the WCAG AA bar it has to clear.
  var BAR = { 3: 'needs 3:1 (large text)', 4.5: 'needs 4.5:1 (body text)' };
  function ratioLine(m) {
    return m.min.toFixed(2) + ':1, ' + BAR[m.need] + ' · ' + (m.min >= m.need ? 'AA pass' : 'AA fail') + ' · ' + m.layer + ', ' + m.size + ' px';
  }

  function render() {
    var F = D.formats.filter(function (f) { return f.id === state.id; })[0];
    sw.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-id') === F.id)); });
    $('t-grid').setAttribute('aria-pressed', String(state.grid));
    $('t-safe').setAttribute('aria-pressed', String(state.safe));
    $('t-zoom').setAttribute('aria-pressed', String(state.zoom));
    var c = $('canvas');
    c.style.setProperty('--ar', F.w / F.h);
    c.style.setProperty('--w', F.w + 'px');
    c.style.setProperty('--h', F.h + 'px');
    $('preview').classList.toggle('zoomed', state.zoom);
    var png = F.files[0].href, webp = F.files[1].href;
    $('pic-webp').setAttribute('srcset', webp);
    var img = $('pic-img');
    img.setAttribute('src', png); img.setAttribute('width', F.w); img.setAttribute('height', F.h);
    img.setAttribute('alt', 'Lattice key visual, ' + F.name + ' format, ' + F.w + ' by ' + F.h + ' pixels');
    overlay(F);
    var M = measured[F.id];
    var meta = $('meta');
    meta.textContent = '';
    var dl = el('dl');
    function row(k, v, cls) { dl.appendChild(el('dt', {}, k)); var d = el('dd', cls ? { class: cls } : {}, v); dl.appendChild(d); }
    row('Format', F.name);
    row('Size', F.w + ' × ' + F.h + ' px');
    row('Safe area', F.id === 'story' ? '250 px top and bottom, 6 % sides' : '6 % each side (' + F.safe.x + ' × ' + F.safe.y + ' px)');
    row('Grid', F.cols + ' columns, ' + F.gutter + ' px gutter');
    if (M && M.large) row('Lowest contrast, large text', ratioLine(M.large), M.large.min >= 3 ? 'pass' : '');
    if (M && M.body) row('Lowest contrast, body text', ratioLine(M.body), M.body.min >= 4.5 ? 'pass' : '');
    row('View', state.zoom ? '100 % (scroll to pan)' : 'Fit to width');
    meta.appendChild(dl);
    meta.appendChild(el('p', {}, F.decision));
  }
  render();

  // ---- Downloads ----------------------------------------------------------
  var body = $('dl-body');
  D.formats.forEach(function (F) {
    var tr = el('tr');
    tr.appendChild(el('th', { scope: 'row' }, F.name));
    tr.appendChild(el('td', {}, F.w + ' × ' + F.h));
    F.files.forEach(function (f) {
      var td = el('td');
      var a = el('a', { href: f.href, download: '' }, f.ext.toUpperCase() + (f.kb ? ' · ' + f.kb + ' KB' : ''));
      a.setAttribute('aria-label', 'Download ' + F.name + ' ' + f.ext.toUpperCase());
      td.appendChild(a); tr.appendChild(td);
    });
    body.appendChild(tr);
  });

  // ---- Notes ------------------------------------------------------------
  var sws = $('swatches');
  D.palette.forEach(function (p) {
    var li = el('li'); var s = el('span'); s.style.background = p.hex;
    li.appendChild(s); li.appendChild(document.createTextNode(p.name + ' ')); li.appendChild(el('code', {}, p.hex));
    sws.appendChild(li);
  });
  var uses = { 'ink/paper': 'Headlines, body', 'sage/paper': 'Second headline line (large only)', 'green/paper': 'Emphasis line, tagline', 'muted/paper': 'Studio captions', 'white/green': 'Chip text on site', 'lime/green': 'Icons on green chip', 'ink/chip': 'Note-card text', 'ink/lime': 'Text on lime' };
  var pairs = $('pairs');
  D.pairs.forEach(function (p) {
    var tr = el('tr');
    var td = el('td'); var chip = el('span', { class: 'chip', 'aria-hidden': 'true' }, 'Aa');
    chip.style.color = p.fgHex; chip.style.background = p.bgHex;
    td.appendChild(chip); td.appendChild(document.createTextNode(p.fg + ' on ' + p.bg)); tr.appendChild(td);
    tr.appendChild(el('td', {}, p.ratio.toFixed(2) + ':1, needs ' + p.need + ':1 (' + p.basis + ')'));
    tr.appendChild(el('td', {}, uses[p.fg + '/' + p.bg] || ''));
    pairs.appendChild(tr);
  });
  var ms = $('measured');
  (D.measured || []).forEach(function (m) {
    var F = D.formats.filter(function (f) { return f.id === m.id; })[0];
    var parts = [m.large, m.body].filter(Boolean).map(function (x) {
      return x.min.toFixed(2) + ':1, ' + BAR[x.need] + ', ' + x.layer;
    });
    ms.appendChild(el('li', {}, F.name + ': ' + parts.join('; ') + ' · ' + (m.pass ? 'AA pass' : 'AA fail') + (m.safe ? ', inside safe area' : ', outside safe area')));
  });
  var ts = $('type-scale');
  D.formats.forEach(function (F) {
    var tr = el('tr'); tr.appendChild(el('th', { scope: 'row' }, F.name));
    [F.type.display, F.type.sub, F.type.body, F.type.eyebrow].forEach(function (v) { tr.appendChild(el('td', {}, v + ' px')); });
    ts.appendChild(tr);
  });
  var dec = $('decisions');
  D.formats.forEach(function (F) { dec.appendChild(el('dt', {}, F.name + ' · ' + F.w + ' × ' + F.h)); dec.appendChild(el('dd', {}, F.decision)); });
})();
