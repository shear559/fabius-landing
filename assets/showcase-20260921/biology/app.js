/* Differential expression explorer. Data: window.DE_DATA (written by analysis.py). No network use. */
(function () {
  "use strict";
  var D = window.DE_DATA;
  var S = D.stats;
  var F = {};
  D.fields.forEach(function (f, i) { F[f] = i; });
  var FDR = 0.05;
  var NS = "http://www.w3.org/2000/svg";

  // ------------------------------------------------------------ genes
  var genes = D.genes.map(function (r, i) {
    var g = {};
    D.fields.forEach(function (f) { g[f] = r[F[f]]; });
    g.i = i;
    g.tested = g.pvalue !== null;
    g.sig = g.tested && g.padj !== null && g.padj < FDR;
    g.cls = !g.sig ? "ns" : g.lfc > 0 ? "up" : "down";
    return g;
  });
  var tested = genes.filter(function (g) { return g.tested; });
  var byId = {};
  genes.forEach(function (g) { byId[g.gene] = g; });
  var tq = S.test.ci_quantile;

  // ------------------------------------------------------------ helpers
  function $(id) { return document.getElementById(id); }
  function svg(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] !== undefined) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function h(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function lin(d0, d1, r0, r1) {
    var f = function (v) { return r0 + (v - d0) / (d1 - d0) * (r1 - r0); };
    f.d = [d0, d1];
    return f;
  }
  function niceTicks(a, b, n) {
    var span = b - a, step = Math.pow(10, Math.floor(Math.log10(span / n)));
    var err = span / n / step;
    if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
    var out = [];
    for (var v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  function fmtP(p) {
    if (p === null || p === undefined) return "–";
    if (p >= 0.001) return p.toFixed(p >= 0.1 ? 2 : 3);
    var e = Math.floor(Math.log10(p)), m = p / Math.pow(10, e);
    return m.toFixed(1) + "×10" + sup(e);
  }
  function sup(n) {
    var map = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
    return String(n).split("").map(function (c) { return map[c]; }).join("");
  }
  function f2(v, d) { return v === null || v === undefined ? "–" : (v > 0 && d !== false ? "+" : "") + v.toFixed(2).replace("-", "−"); }
  function fnum(v) { return v >= 100 ? Math.round(v).toLocaleString("en") : v.toFixed(1); }
  function fold(l) { var f = Math.pow(2, Math.abs(l)); return (l < 0 ? "÷" : "×") + f.toFixed(1); }

  function axes(g, x, y, W, H, m, xt, yt, xl, yl, xfmt, yfmt) {
    var gg = svg("g", { "class": "grid" }, g);
    yt.forEach(function (t) { svg("line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t) }, gg); });
    xt.forEach(function (t) { svg("line", { x1: x(t), x2: x(t), y1: m.t, y2: H - m.b }, gg); });
    var ax = svg("g", { "class": "axis" }, g);
    svg("line", { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b }, ax);
    svg("line", { x1: m.l, x2: m.l, y1: m.t, y2: H - m.b }, ax);
    xt.forEach(function (t) {
      var tx = svg("text", { x: x(t), y: H - m.b + 16, "text-anchor": "middle" }, ax);
      tx.textContent = xfmt ? xfmt(t) : String(t).replace("-", "−");
    });
    yt.forEach(function (t) {
      var tx = svg("text", { x: m.l - 6, y: y(t) + 4, "text-anchor": "end" }, ax);
      tx.textContent = yfmt ? yfmt(t) : String(t).replace("-", "−");
    });
    var a = svg("text", { x: (m.l + W - m.r) / 2, y: H - 6, "text-anchor": "middle", "class": "axis-label" }, g);
    a.textContent = xl;
    var b = svg("text", { x: 14, y: (m.t + H - m.b) / 2, "text-anchor": "middle", "class": "axis-label",
      transform: "rotate(-90 14 " + (m.t + H - m.b) / 2 + ")" }, g);
    b.textContent = yl;
  }

  // ------------------------------------------------------------ tooltip
  var tip = $("tip");
  function showTip(g, clientX, clientY) {
    tip.innerHTML = "<b>" + g.gene + "</b>" + (g.sig ? " · " + (g.lfc > 0 ? "up" : "down") + " at FDR 5 %" : "") +
      "<br>log₂FC " + f2(g.lfc) + " (95 % CI " + f2(g.lfc - tq * g.lfcSE) + " to " + f2(g.lfc + tq * g.lfcSE) + ")" +
      "<br>mean count " + fnum(g.baseMean) + " · p " + fmtP(g.pvalue) + " · adj. p " + fmtP(g.padj);
    tip.hidden = false;
    var r = tip.getBoundingClientRect();
    var x = clientX + 14, y = clientY + 14;
    if (x + r.width > window.innerWidth - 8) x = clientX - r.width - 14;
    if (y + r.height > window.innerHeight - 8) y = clientY - r.height - 14;
    tip.style.left = Math.max(8, x) + "px";
    tip.style.top = Math.max(8, y) + "px";
  }
  function hideTip() { tip.hidden = true; }

  // ------------------------------------------------------------ gene scatter (volcano + MA)
  var charts = [];
  var selected = null;

  function geneScatter(el, opt) {
    var W = 560, H = 400, m = { l: 52, r: 14, t: 12, b: 44 };
    var pts = tested.map(function (g) { return { g: g, xv: opt.x(g), yv: opt.y(g) }; });
    var xs = pts.map(function (p) { return p.xv; }), ys = pts.map(function (p) { return p.yv; });
    var xd = opt.xDomain || [Math.min.apply(null, xs), Math.max.apply(null, xs)];
    var yd = opt.yDomain || [Math.min.apply(null, ys), Math.max.apply(null, ys)];
    var x = lin(xd[0], xd[1], m.l, W - m.r), y = lin(yd[0], yd[1], H - m.b, m.t);
    var root = svg("svg", { viewBox: "0 0 " + W + " " + H, tabindex: "0", role: "img",
      "aria-label": opt.label, "aria-describedby": "live" }, null);
    axes(root, x, y, W, H, m, niceTicks(xd[0], xd[1], 6), niceTicks(yd[0], yd[1], 5), opt.xl, opt.yl, opt.xfmt, null);
    (opt.refs || []).forEach(function (r) {
      if (r.y !== undefined) svg("line", { "class": "ref", x1: m.l, x2: W - m.r, y1: y(r.y), y2: y(r.y) }, root);
      if (r.x !== undefined) svg("line", { "class": "ref", x1: x(r.x), x2: x(r.x), y1: m.t, y2: H - m.b }, root);
    });
    var gp = svg("g", {}, root);
    ["ns", "down", "up"].forEach(function (c) {
      pts.forEach(function (p) {
        if (p.g.cls !== c) return;
        p.px = x(p.xv); p.py = y(p.yv);
        svg("circle", { cx: p.px.toFixed(1), cy: p.py.toFixed(1), r: c === "ns" ? 2.2 : 3.6, "class": "pt-" + c }, gp);
      });
    });
    // labels for significant genes: measured boxes, placed at the nearest free spot around the point
    // (never over another label, point or leader line); a leader line joins any label set away from
    // its point; a label with no free spot is left out (the point stays hoverable and keyboard-reachable).
    var gl = svg("g", {}, root);
    function layoutLabels() {
      while (gl.firstChild) gl.removeChild(gl.firstChild);
      if (!opt.labelSig) return;
      var pad = 2, rects = [], segs = [];
      var obst = pts.map(function (p) { return { x: p.px, y: p.py, r: (p.g.sig ? 3.6 : 2.2) + pad }; });
      function hitsPoint(b) {
        return obst.some(function (o) {
          var cx = Math.max(b.x, Math.min(o.x, b.x + b.w)), cy = Math.max(b.y, Math.min(o.y, b.y + b.h));
          return (cx - o.x) * (cx - o.x) + (cy - o.y) * (cy - o.y) < o.r * o.r;
        });
      }
      function overlaps(a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; }
      function segHitsRect(s, b) {
        for (var t = 0; t <= 1.0001; t += 0.1) {
          var x0 = s[0] + (s[2] - s[0]) * t, y0 = s[1] + (s[3] - s[1]) * t;
          if (x0 > b.x && x0 < b.x + b.w && y0 > b.y && y0 < b.y + b.h) return true;
        }
        return false;
      }
      var dirs = [[1, -1], [-1, -1], [1, 1], [-1, 1], [1, 0], [-1, 0], [0, -1], [0, 1]];
      pts.filter(function (p) { return p.g.sig; }).sort(function (a, b) { return a.g.pvalue - b.g.pvalue; }).forEach(function (p) {
        var t = svg("text", { x: 0, y: 0, "class": "lab" }, gl);
        t.textContent = p.g.gene.replace("GENE", "");
        var bb = t.getBBox(), w = bb.width + 2, hh = bb.height, asc = -bb.y;
        var outward = p.xv < 0 ? -1 : 1, best = null;
        for (var dist = 5; dist <= 60 && !best; dist += 5) {
          for (var k = 0; k < dirs.length && !best; k++) {
            var dx = dirs[k][0] * outward, dy = dirs[k][1];
            var bx = dx > 0 ? p.px + dist : dx < 0 ? p.px - dist - w : p.px - w / 2;
            var by = dy > 0 ? p.py + dist : dy < 0 ? p.py - dist - hh : p.py - hh / 2;
            var b = { x: bx, y: by, w: w, h: hh };
            if (bx < m.l || bx + w > W - m.r || by < m.t || by + hh > H - m.b) continue;
            if (hitsPoint(b) || rects.some(function (r) { return overlaps(r, b); })) continue;
            if (segs.some(function (sg) { return segHitsRect(sg, b); })) continue;
            // leader from the point's edge to the nearest point of the box
            var lx = Math.max(b.x, Math.min(p.px, b.x + b.w)), ly = Math.max(b.y, Math.min(p.py, b.y + b.h));
            var seg = null;
            if (dist > 8) {
              var L0 = Math.hypot(lx - p.px, ly - p.py);
              seg = [p.px + (lx - p.px) * 4.5 / L0, p.py + (ly - p.py) * 4.5 / L0, lx, ly];
              if (rects.some(function (r) { return segHitsRect(seg, r); })) continue;
            }
            best = { b: b, seg: seg };
          }
        }
        if (!best) { gl.removeChild(t); return; }
        rects.push(best.b);
        t.setAttribute("x", (best.b.x + 1).toFixed(1));
        t.setAttribute("y", (best.b.y + asc).toFixed(1));
        if (best.seg) {
          segs.push(best.seg);
          svg("line", { "class": "leader", x1: best.seg[0].toFixed(1), y1: best.seg[1].toFixed(1), x2: best.seg[2].toFixed(1), y2: best.seg[3].toFixed(1) }, gl);
        }
      });
    }
    var hl = svg("circle", { r: 7, "class": "hl", visibility: "hidden" }, root);
    var sl = svg("circle", { r: 8, "class": "sel", visibility: "hidden" }, root);
    el.appendChild(root);
    layoutLabels();

    var order = pts.slice().sort(function (a, b) { return a.xv - b.xv || a.yv - b.yv; });
    var sigOrder = order.filter(function (p) { return p.g.sig; });
    var cursor = null;
    function byGene(g) { for (var k = 0; k < pts.length; k++) if (pts[k].g === g) return pts[k]; return null; }
    function highlight(p) {
      if (!p) { hl.setAttribute("visibility", "hidden"); return; }
      hl.setAttribute("cx", p.px); hl.setAttribute("cy", p.py); hl.setAttribute("visibility", "visible");
    }
    function toClient(p) {
      var pt = root.createSVGPoint(); pt.x = p.px; pt.y = p.py;
      var c = pt.matrixTransform(root.getScreenCTM());
      return c;
    }
    function nearest(evt) {
      var pt = root.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
      var loc = pt.matrixTransform(root.getScreenCTM().inverse());
      var best = null, bd = 144; // within 12 viewBox units
      pts.forEach(function (p) {
        var d = (p.px - loc.x) * (p.px - loc.x) + (p.py - loc.y) * (p.py - loc.y);
        if (p.g.sig) d *= 0.6;
        if (d < bd) { bd = d; best = p; }
      });
      return best;
    }
    root.addEventListener("pointermove", function (e) {
      var p = nearest(e);
      highlight(p);
      root.style.cursor = p ? "pointer" : "default";
      if (p) showTip(p.g, e.clientX, e.clientY); else hideTip();
    });
    root.addEventListener("pointerleave", function () { highlight(cursor); hideTip(); });
    root.addEventListener("click", function (e) { var p = nearest(e); if (p) selectGene(p.g, false); });
    function focusPoint(p) {
      cursor = p; highlight(p);
      var c = toClient(p);
      showTip(p.g, c.x, c.y);
      $("live").textContent = p.g.gene + ", log2 fold change " + p.g.lfc.toFixed(2) + ", adjusted p " + fmtP(p.g.padj) + (p.g.sig ? ", significant" : "");
    }
    root.addEventListener("keydown", function (e) {
      var list, idx;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") list = order;
      else if (e.key === "ArrowUp" || e.key === "ArrowDown") list = sigOrder;
      else if ((e.key === "Enter" || e.key === " ") && cursor) { e.preventDefault(); selectGene(cursor.g, false); return; }
      else if (e.key === "Escape") { cursor = null; highlight(null); hideTip(); return; }
      else return;
      e.preventDefault();
      if (!list.length) return;
      idx = cursor ? list.indexOf(cursor) : -1;
      if (idx < 0) {
        // start from the selected gene, or the first significant gene
        var start = selected && byGene(selected);
        idx = start && list.indexOf(start) >= 0 ? list.indexOf(start) : (list === order && sigOrder.length ? order.indexOf(sigOrder[0]) : 0);
      } else {
        var fwd = e.key === "ArrowRight" || e.key === "ArrowUp";
        idx = (idx + (fwd ? 1 : -1) + list.length) % list.length;
      }
      focusPoint(list[idx]);
    });
    root.addEventListener("focus", function () {
      if (!cursor) {
        var p = (selected && byGene(selected)) || sigOrder[0] || order[0];
        focusPoint(p);
      }
    });
    root.addEventListener("blur", function () { hideTip(); });
    return {
      root: root,
      relabel: layoutLabels,
      reanchor: function () { if (cursor) { var c = toClient(cursor); showTip(cursor.g, c.x, c.y); } else hideTip(); },
      select: function (g) {
        var p = byGene(g);
        if (!p) { sl.setAttribute("visibility", "hidden"); return; }
        sl.setAttribute("cx", p.px); sl.setAttribute("cy", p.py); sl.setAttribute("visibility", "visible");
      }
    };
  }

  // ------------------------------------------------------------ header
  // simulated sensitivity: [low, high] share detected across the simulated shares of changed genes
  function powerAt(fold) {
    var v = (S.power || []).map(function (sc) {
      for (var k = 0; k < sc.folds.length; k++) if (sc.folds[k].fold === fold) return sc.folds[k].power;
      return null;
    }).filter(function (x) { return x !== null; });
    return v.length ? [Math.min.apply(null, v), Math.max.apply(null, v)] : null;
  }
  function pctRange(r) {
    var lo = Math.round(100 * r[0]), hi = Math.round(100 * r[1]);
    return lo === hi ? lo + " %" : lo + "–" + hi + " %";
  }
  function header() {
    var n = S.n_sig;
    var sig = tested.filter(function (g) { return g.sig; });
    var ciNear = Math.min.apply(null, sig.map(function (g) { return Math.abs(g.lfc) - tq * g.lfcSE; }));
    var shr = sig.map(function (g) { return Math.abs(g.lfcShrunk); });
    var p2 = powerAt(2), p4 = powerAt(4);
    $("lede").innerHTML = "At a false discovery rate of 5 %, <strong>" + n + " of " + S.n_tested.toLocaleString("en") +
      " tested genes</strong> change with the treatment: " + S.n_up + " up and " + S.n_down + " down. Their estimated changes are " +
      Math.pow(2, S.abs_lfc_sig_range[0]).toFixed(1) + "- to " + Math.pow(2, S.abs_lfc_sig_range[1]).toFixed(1) + "-fold, and every 95 % interval excludes changes smaller than " +
      Math.pow(2, ciNear).toFixed(1) + "-fold." +
      (p2 ? " <strong>The test is strict:</strong> in simulations of this design it finds only " + pctRange(p4) + " of true 4-fold changes and " + pctRange(p2) +
        " of true 2-fold changes. Read the " + n + " as the clearest responders, not the whole response." : "");
    var k = [
      ["Significant genes (FDR 5 %)", n, S.n_up + " up · " + S.n_down + " down"],
      ["Median |log₂FC| of hits", S.abs_lfc_sig_median.toFixed(2), "≈ " + Math.pow(2, S.abs_lfc_sig_median).toFixed(1) + "-fold; shrunken " +
        Math.pow(2, Math.min.apply(null, shr)).toFixed(1) + "–" + Math.pow(2, Math.max.apply(null, shr)).toFixed(1) + "-fold"],
      ["True 4-fold changes detected", p4 ? pctRange(p4) : "–", p2 ? "2-fold: " + pctRange(p2) + " (simulated)" : ""],
      ["Genes with a run effect", S.run_effect.n_run_fdr05, "at FDR 5 % (low power at 3 df)"],
      ["Outlier counts (Cook's)", S.cooks.n_genes_flagged, "genes flagged; lenient cut-off at 3 df"],
      ["Test degrees of freedom", S.test.df.toFixed(1), S.test.residual_df + " residual + " + S.test.prior_df.toFixed(1) + " borrowed"]
    ];
    var dl = $("kpis");
    k.forEach(function (r) {
      var d = h("div");
      d.appendChild(h("dt", {}, r[0]));
      d.appendChild(h("dd", {}, r[1] + "<small>" + r[2] + "</small>"));
      dl.appendChild(d);
    });
    sensPanel();
  }

  // how conservative the test is: share of simulated true changes detected, by fold size
  function sensPanel() {
    if (!S.power || !S.power.length) return;
    var sc = S.power.slice().sort(function (a, b) { return a.pi - b.pi; });
    var html = "<h2 id=\"h-sens\">How many real changes would this test catch?</h2>" +
      "<p>Share of simulated true changes found at FDR 5&nbsp;%, by size. The bar spans two scenarios: " +
      sc.map(function (x) { return Math.round(100 * x.pi) + " % of genes changed (" + x.mean_called.toFixed(0) + " genes called per data set)"; }).join(" and ") +
      ". The real data gave " + S.n_sig + ", between the two.</p>" +
      '<table class="sens-t"><caption class="sr-only">Share of true changes detected, by fold change</caption><thead><tr><th scope="col">True change</th><th scope="col">Detected</th><th scope="col"><span class="sr-only">Range bar, 0 to 100 %</span></th></tr></thead><tbody>' +
      sc[0].folds.map(function (f) {
        var r = powerAt(f.fold), lo = Math.round(100 * r[0]), hi = Math.round(100 * r[1]);
        return "<tr><th scope=\"row\">" + f.fold + "-fold</th><td>" + pctRange(r) + "</td><td class=\"bar-cell\" aria-hidden=\"true\"><span class=\"track\"><span class=\"rng\" style=\"left:" + lo + "%;width:" + Math.max(1, hi - lo) + "%\"></span></span></td></tr>";
      }).join("") + "</tbody></table>" +
      '<p class="note">Either direction; the direction must also be right. Detection is higher for highly expressed genes (see Methods).</p>';
    $("sens").innerHTML = html;
  }

  // ------------------------------------------------------------ gene panel
  function genePanel(g) {
    var box = $("gene-plot");
    box.innerHTML = "";
    var W = 420, H = 300, m = { l: 58, r: 16, t: 14, b: 46 };
    var vals = g.norm.map(function (v) { return Math.log10(v + 1); });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var pad = Math.max(0.15, (hi - lo) * 0.15);
    var y = lin(Math.max(0, lo - pad), hi + pad, H - m.b, m.t);
    var xpos = { control: m.l + (W - m.l - m.r) * 0.27, treated: m.l + (W - m.l - m.r) * 0.73 };
    var root = svg("svg", { viewBox: "0 0 " + W + " " + H, role: "img",
      "aria-label": "Normalised counts for " + g.gene + ": " + S.samples.map(function (s, j) { return s + " " + fnum(g.norm[j]); }).join(", ") }, box);
    // ticks at round counts (1, 2, 5 × 10^k), positioned on the log10(count + 1) scale
    var yl = [], cands = [];
    for (var e = 0; e <= 6; e++) [1, 2, 5].forEach(function (k) { cands.push(k * Math.pow(10, e)); });
    cands.forEach(function (v) { var t = Math.log10(v + 1); if (t >= y.d[0] && t <= y.d[1]) yl.push(v); });
    if (yl.length > 5) yl = yl.filter(function (v) { return String(v).charAt(0) !== "2"; });
    var gg = svg("g", { "class": "grid" }, root);
    yl.forEach(function (v) { svg("line", { x1: m.l, x2: W - m.r, y1: y(Math.log10(v + 1)), y2: y(Math.log10(v + 1)) }, gg); });
    var ax = svg("g", { "class": "axis" }, root);
    svg("line", { x1: m.l, x2: m.l, y1: m.t, y2: H - m.b }, ax);
    svg("line", { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b }, ax);
    yl.forEach(function (v) {
      var tx = svg("text", { x: m.l - 6, y: y(Math.log10(v + 1)) + 4, "text-anchor": "end" }, ax);
      tx.textContent = v >= 1000 ? (v / 1000) + "k" : String(v);
    });
    ["control", "treated"].forEach(function (c) {
      var t = svg("text", { x: xpos[c], y: H - m.b + 18, "text-anchor": "middle", "class": "axis-label" }, root);
      t.textContent = c;
      var idx = S.conditions.map(function (cc, j) { return cc === c ? j : -1; }).filter(function (j) { return j >= 0; });
      var mean = idx.reduce(function (a, j) { return a + vals[j]; }, 0) / idx.length;
      svg("line", { x1: xpos[c] - 42, x2: xpos[c] + 42, y1: y(mean), y2: y(mean), stroke: "#1b2330", "stroke-width": 2 }, root);
      idx.forEach(function (j, k) {
        var cx = xpos[c] + (k - 1) * 22, cy = y(vals[j]);
        var col = c === "treated" ? "#b83d0a" : "#1f55c4";
        if (S.runs[j] === "A") svg("circle", { cx: cx, cy: cy, r: 6, fill: col }, root);
        else svg("rect", { x: cx - 5.5, y: cy - 5.5, width: 11, height: 11, fill: "#fff", stroke: col, "stroke-width": 2.2 }, root);
        var lt = svg("text", { x: cx + 9, y: cy + 4, "class": "lab" }, root);
        lt.textContent = S.samples[j].replace("ctrl_", "c").replace("trt_", "t");
      });
    });
    var al = svg("text", { x: 14, y: (m.t + H - m.b) / 2, "text-anchor": "middle", "class": "axis-label",
      transform: "rotate(-90 14 " + (m.t + H - m.b) / 2 + ")" }, root);
    al.textContent = "normalised count (log scale)";
    var lg = svg("text", { x: m.l, y: H - 6 }, root);
    lg.textContent = "● run A   □ run B   — group mean (log scale)";

    var ci0 = g.lfc - tq * g.lfcSE, ci1 = g.lfc + tq * g.lfcSE;
    var dir = !g.sig ? "not significant at FDR 5 %" : g.lfc > 0 ? "higher in treated" : "lower in treated";
    var cls = !g.sig ? "" : g.lfc > 0 ? "up-t" : "down-t";
    var html = '<p class="gene-title">' + g.gene + ' <span class="badge ' + cls + '">' + dir + "</span></p>" +
      '<dl class="stat-list">' +
      "<dt>log₂ fold change</dt><dd>" + f2(g.lfc) + " (" + fold(g.lfc) + ")</dd>" +
      "<dt>95 % interval</dt><dd>" + f2(ci0) + " to " + f2(ci1) + " (" + fold(ci0) + " to " + fold(ci1) + ")</dd>" +
      "<dt>Shrunken log₂FC</dt><dd>" + f2(g.lfcShrunk) + "</dd>" +
      "<dt>p / adjusted p</dt><dd>" + fmtP(g.pvalue) + " / " + fmtP(g.padj) + "</dd>" +
      "<dt>Mean normalised count</dt><dd>" + fnum(g.baseMean) + "</dd>" +
      "<dt>Dispersion used</dt><dd>" + g.disp.toFixed(3) + " (gene-wise " + g.dispGW.toFixed(3) + ", trend " + g.dispTrend.toFixed(3) + ")</dd>" +
      "<dt>Run B vs A (log₂)</dt><dd>" + f2(g.runLfc) + ", adj. p " + fmtP(g.runPadj) + "</dd>" +
      "<dt>Cook's outlier</dt><dd>" + (g.cooksFlag ? "yes — inspect the counts" : "no") + "</dd></dl>" +
      '<p class="caveat">The interval is the uncertainty of the fold change given this model; the shrunken value pulls noisy estimates toward zero and is the better single guess for ranking. Counts are divided by each sample\'s size factor.</p>';
    $("gene-stats").innerHTML = html;
  }

  function selectGene(g, scroll) {
    selected = g;
    genePanel(g);
    charts.forEach(function (c) { c.select(g); });
    Array.prototype.forEach.call(document.querySelectorAll("#tbl tbody tr"), function (tr) {
      tr.classList.toggle("is-sel", tr.dataset.gene === g.gene);
    });
    if (scroll) $("gene-section").scrollIntoView({ block: "start" });
  }

  // ------------------------------------------------------------ table
  var cols = [
    { k: "gene", t: "Gene", fmt: null },
    { k: "baseMean", t: "Mean count", fmt: function (g) { return fnum(g.baseMean); } },
    { k: "lfc", t: "log₂FC", fmt: function (g) { return '<span class="' + (g.sig ? g.cls + "-t" : "") + '">' + f2(g.lfc) + "</span>"; } },
    { k: "ci", t: "95 % CI", sort: false, fmt: function (g) { return f2(g.lfc - tq * g.lfcSE) + " to " + f2(g.lfc + tq * g.lfcSE); } },
    { k: "lfcShrunk", t: "Shrunken", fmt: function (g) { return f2(g.lfcShrunk); } },
    { k: "pvalue", t: "p", fmt: function (g) { return fmtP(g.pvalue); } },
    { k: "padj", t: "Adj. p", fmt: function (g) { return fmtP(g.padj); } }
  ];
  var sortKey = "padj", sortDir = 1, limit = 25, rows = [];
  function buildHead() {
    var tr = document.querySelector("#tbl thead tr");
    cols.forEach(function (c) {
      var th = h("th", { scope: "col" });
      if (c.sort === false) th.textContent = c.t;
      else {
        var b = h("button", { type: "button" }, c.t);
        b.addEventListener("click", function () {
          if (sortKey === c.k) sortDir = -sortDir;
          else { sortKey = c.k; sortDir = (c.k === "gene" || c.k === "pvalue" || c.k === "padj") ? 1 : -1; }
          limit = 25; renderTable();
        });
        th.appendChild(b);
      }
      th.dataset.k = c.k;
      tr.appendChild(th);
    });
  }
  function renderTable() {
    var q = $("q").value.trim().toUpperCase();
    var thr = parseFloat($("fdr").value), dir = $("dir").value;
    rows = tested.filter(function (g) {
      if (q && g.gene.indexOf(q) < 0) return false;
      if (!(g.padj <= thr)) return false;
      if (dir === "up" && !(g.lfc > 0)) return false;
      if (dir === "down" && !(g.lfc < 0)) return false;
      return true;
    });
    var key = sortKey === "lfc" || sortKey === "lfcShrunk" ? function (g) { return Math.abs(g[sortKey]); } : function (g) { return g[sortKey]; };
    rows.sort(function (a, b) {
      var x = key(a), y = key(b);
      if (x < y) return -sortDir; if (x > y) return sortDir;
      return a.pvalue - b.pvalue;
    });
    Array.prototype.forEach.call(document.querySelectorAll("#tbl thead th"), function (th) {
      if (th.dataset.k === sortKey) th.setAttribute("aria-sort", sortDir > 0 ? "ascending" : "descending");
      else th.removeAttribute("aria-sort");
    });
    var tb = document.querySelector("#tbl tbody");
    tb.innerHTML = "";
    rows.slice(0, limit).forEach(function (g) {
      var tr = h("tr");
      tr.dataset.gene = g.gene;
      if (selected === g) tr.className = "is-sel";
      cols.forEach(function (c, ci) {
        var td = h(ci === 0 ? "th" : "td", ci === 0 ? { scope: "row" } : {});
        if (ci === 0) {
          var b = h("button", { type: "button", "class": "gene", "aria-label": "Show " + g.gene + " in gene detail" }, g.gene);
          b.addEventListener("click", function () { selectGene(g, true); });
          td.appendChild(b);
        } else td.innerHTML = c.fmt(g);
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    if (!rows.length) {
      var tr0 = h("tr"); var td0 = h("td", { colspan: String(cols.length) }, "No genes match these filters.");
      td0.style.textAlign = "left"; tr0.appendChild(td0); tb.appendChild(tr0);
    }
    var abs = sortKey === "lfc" || sortKey === "lfcShrunk" ? " (by absolute value)" : "";
    $("count").textContent = rows.length + " gene" + (rows.length === 1 ? "" : "s") + " shown" +
      (rows.length > limit ? " (first " + limit + ")" : "") + " · sorted by " +
      cols.filter(function (c) { return c.k === sortKey; })[0].t + abs;
    $("more").hidden = rows.length <= limit;
  }

  // ------------------------------------------------------------ QC charts
  var cCol = { control: "#1f55c4", treated: "#b83d0a" };
  function marker(parent, cx, cy, run, col, r) {
    if (run === "A") return svg("circle", { cx: cx, cy: cy, r: r, fill: col }, parent);
    return svg("rect", { x: cx - r, y: cy - r, width: 2 * r, height: 2 * r, fill: "#fff", stroke: col, "stroke-width": 2.2 }, parent);
  }
  function libChart() {
    var W = 520, rowH = 34, m = { l: 70, r: 96, t: 8, b: 36 }, H = m.t + m.b + rowH * S.samples.length;
    var max = Math.max.apply(null, S.library_size);
    var x = lin(0, max * 1.05, m.l, W - m.r);
    var root = svg("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Library sizes: " +
      S.samples.map(function (s, j) { return s + " " + (S.library_size[j] / 1e6).toFixed(2) + " million reads, size factor " + S.size_factors[j]; }).join("; ") }, $("libs"));
    var ticks = niceTicks(0, max * 1.05, 4);
    var gg = svg("g", { "class": "grid" }, root);
    ticks.forEach(function (t) { svg("line", { x1: x(t), x2: x(t), y1: m.t, y2: H - m.b }, gg); });
    ticks.forEach(function (t) { var tx = svg("text", { x: x(t), y: H - m.b + 16, "text-anchor": "middle" }, root); tx.textContent = (t / 1e6).toFixed(1); });
    var al = svg("text", { x: (m.l + W - m.r) / 2, y: H - 4, "text-anchor": "middle", "class": "axis-label" }, root);
    al.textContent = "reads (millions)";
    S.samples.forEach(function (s, j) {
      var yy = m.t + j * rowH + 6;
      svg("rect", { x: m.l, y: yy, width: x(S.library_size[j]) - m.l, height: rowH - 14, fill: cCol[S.conditions[j]], "fill-opacity": S.runs[j] === "A" ? 1 : 0.55 }, root);
      var t = svg("text", { x: m.l - 8, y: yy + (rowH - 14) / 2 + 4, "text-anchor": "end", "class": "axis-label" }, root);
      t.textContent = s;
      var v = svg("text", { x: x(S.library_size[j]) + 6, y: yy + (rowH - 14) / 2 + 4 }, root);
      v.textContent = "sf " + S.size_factors[j].toFixed(2) + " · " + S.runs[j];
    });
  }
  function pcaChart() {
    var W = 520, H = 340, m = { l: 52, r: 20, t: 14, b: 44 };
    var sc = S.pca.scores, ve = S.pca.var_explained;
    var xs = sc.map(function (p) { return p[0]; }), ys = sc.map(function (p) { return p[1]; });
    function dom(a) { var lo = Math.min.apply(null, a), hi = Math.max.apply(null, a), p = (hi - lo) * 0.2; return [lo - p, hi + p]; }
    var xd = dom(xs), yd = dom(ys);
    var x = lin(xd[0], xd[1], m.l, W - m.r), y = lin(yd[0], yd[1], H - m.b, m.t);
    var root = svg("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "PCA of samples. PC1 explains " +
      Math.round(ve[0] * 100) + " percent of variance, PC2 " + Math.round(ve[1] * 100) + " percent. " +
      S.samples.map(function (s, j) { return s + " at PC1 " + sc[j][0].toFixed(1) + ", PC2 " + sc[j][1].toFixed(1); }).join("; ") }, $("pca"));
    axes(root, x, y, W, H, m, niceTicks(xd[0], xd[1], 5), niceTicks(yd[0], yd[1], 5),
      "PC1 (" + Math.round(ve[0] * 100) + " % of variance)", "PC2 (" + Math.round(ve[1] * 100) + " %)");
    var placed = [];
    S.samples.forEach(function (s, j) {
      marker(root, x(sc[j][0]), y(sc[j][1]), S.runs[j], cCol[S.conditions[j]], 6);
      var right = x(sc[j][0]) < W - 110, ly = y(sc[j][1]) + 4;
      while (placed.some(function (q) { return Math.abs(q[0] - x(sc[j][0])) < 70 && Math.abs(q[1] - ly) < 13; })) ly += 14;
      placed.push([x(sc[j][0]), ly]);
      var t = svg("text", { x: x(sc[j][0]) + (right ? 10 : -10), y: ly, "text-anchor": right ? "start" : "end", "class": "lab" }, root);
      t.textContent = s + " (" + S.runs[j] + ")";
    });
    var lg = svg("text", { x: m.l + 4, y: m.t + 12 }, root);
    lg.textContent = "blue = control · orange = treated · ● run A · □ run B";
  }
  function distChart() {
    var n = S.samples.length, cell = 44, m = { l: 62, t: 62 }, W = m.l + n * cell + 10, H = m.t + n * cell + 10;
    var d = S.sample_dist, all = [];
    d.forEach(function (r, i) { r.forEach(function (v, j) { if (i !== j) all.push(v); }); });
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    var root = svg("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Sample distance matrix. Closest pair " +
      "within treated; distances range " + lo.toFixed(1) + " to " + hi.toFixed(1) + "." }, $("dist"));
    root.style.maxWidth = "380px";
    S.samples.forEach(function (s, i) {
      var t = svg("text", { x: m.l - 6, y: m.t + i * cell + cell / 2 + 4, "text-anchor": "end", "class": "lab" }, root);
      t.textContent = s;
      var t2 = svg("text", { x: m.l + i * cell + cell / 2, y: m.t - 8, "text-anchor": "start", "class": "lab",
        transform: "rotate(-45 " + (m.l + i * cell + cell / 2) + " " + (m.t - 8) + ")" }, root);
      t2.textContent = s;
      S.samples.forEach(function (s2, j) {
        var v = d[i][j], k = i === j ? 1 : 1 - (v - lo) / (hi - lo);
        var l = Math.round(96 - k * 62);
        svg("rect", { x: m.l + j * cell, y: m.t + i * cell, width: cell - 1, height: cell - 1, fill: i === j ? "#eceef2" : "hsl(170 55% " + l + "%)" }, root);
        if (i !== j) {
          var tv = svg("text", { x: m.l + j * cell + cell / 2, y: m.t + i * cell + cell / 2 + 4, "text-anchor": "middle" }, root);
          tv.textContent = v.toFixed(1);
          tv.style.fill = l < 55 ? "#ffffff" : "#1b2330";
          tv.style.fontSize = "11px";
        }
      });
    });
  }
  function dispChart() {
    var W = 520, H = 340, m = { l: 56, r: 14, t: 12, b: 44 };
    var pts = tested.filter(function (g) { return g.dispGW > 1e-6 && g.baseMean > 0; });
    var xs = pts.map(function (g) { return Math.log10(g.baseMean); });
    var xd = [Math.floor(Math.min.apply(null, xs) * 2) / 2, Math.ceil(Math.max.apply(null, xs) * 2) / 2];
    var yd = [-3, 1];
    var x = lin(xd[0], xd[1], m.l, W - m.r), y = lin(yd[0], yd[1], H - m.b, m.t);
    var root = svg("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Dispersion against mean count on log scales. Trend: dispersion = " +
      S.dispersion.trend_a0.toFixed(3) + " + " + S.dispersion.trend_a1.toFixed(2) + " / mean. " + S.dispersion.n_disp_outliers + " genes kept their own higher dispersion." }, $("disp"));
    function pw(t) { var v = Math.pow(10, t); return v >= 1 ? String(Math.round(v)) : String(+v.toPrecision(1)); }
    axes(root, x, y, W, H, m, niceTicks(xd[0], xd[1], 5).filter(function (t) { return t % 1 === 0; }), [-3, -2, -1, 0, 1],
      "mean normalised count", "dispersion", pw, null);
    // re-label y ticks as powers of ten
    Array.prototype.forEach.call(root.querySelectorAll(".axis text"), function (t) {
      if (t.getAttribute("text-anchor") === "end") t.textContent = pw(parseFloat(t.textContent.replace("−", "-")));
    });
    var clip = function (v) { return Math.max(yd[0], Math.min(yd[1], Math.log10(v))); };
    var g1 = svg("g", {}, root), g2 = svg("g", {}, root);
    pts.forEach(function (g) {
      svg("circle", { cx: x(Math.log10(g.baseMean)).toFixed(1), cy: y(clip(g.dispGW)).toFixed(1), r: 1.8, fill: "#8b94a1", "fill-opacity": 0.45 }, g1);
      svg("circle", { cx: x(Math.log10(g.baseMean)).toFixed(1), cy: y(clip(g.disp)).toFixed(1), r: 1.6, fill: "#1f55c4", "fill-opacity": 0.55 }, g2);
    });
    var path = [];
    for (var t = xd[0]; t <= xd[1] + 1e-9; t += 0.05) {
      var mu = Math.pow(10, t), a = S.dispersion.trend_a0 + S.dispersion.trend_a1 / mu;
      path.push((path.length ? "L" : "M") + x(t).toFixed(1) + " " + y(clip(a)).toFixed(1));
    }
    svg("path", { d: path.join(" "), fill: "none", stroke: "#b83d0a", "stroke-width": 2.5 }, root);
    var lg = svg("text", { x: W - m.r - 4, y: m.t + 12, "text-anchor": "end" }, root);
    lg.textContent = "trend α = " + S.dispersion.trend_a0.toFixed(3) + " + " + S.dispersion.trend_a1.toFixed(2) + "/mean";
  }
  function runBox() {
    var c = S.design.cells, sens = S.sensitivity, loo = sens.leave_one_out;
    var html = "<h3>Can the sequencing run be separated from the treatment?</h3>" +
      '<table><caption class="sr-only">Samples per condition and run</caption><thead><tr><th scope="col"></th><th scope="col">run A</th><th scope="col">run B</th></tr></thead><tbody>' +
      '<tr><th scope="row">control</th><td>' + c["control/A"] + "</td><td>" + c["control/B"] + "</td></tr>" +
      '<tr><th scope="row">treated</th><td>' + c["treated/A"] + "</td><td>" + c["treated/B"] + "</td></tr></tbody></table>" +
      "<p><strong>Partly.</strong> Run and condition are not fully confounded: every condition × run cell has at least one sample, so a model with both terms (<code>~ run + condition</code>) can be fitted, and it is. " +
      "The correlation between the two factors is " + S.design.corr_condition_run.toFixed(2) + ", which widens the standard error of the treatment effect by a factor of only " +
      Math.sqrt(S.design.var_inflation_condition).toFixed(2) + ". But the separation rests on two samples, ctrl_3 (the only control in run B) and trt_1 (the only treated sample in run A). " +
      "Leaving out ctrl_3, the fold changes agree with the full analysis only at r = " + loo.ctrl_3.lfc_r.toFixed(2) + " (" + loo.ctrl_3.n_sig + " significant genes); leaving out trt_1, r = " + loo.trt_1.lfc_r.toFixed(2) +
      " (" + loo.trt_1.n_sig + " genes). Leaving out any other sample, r = " + looOthers().lo.toFixed(2) + "–" + looOthers().hi.toFixed(2) + ".</p>" +
      "<p>In this data the run effect looks small: no gene has a run effect at FDR 5 %, though with 3 residual df that test can only catch large run effects (median |log₂ run effect| " + S.run_effect.median_abs_run_lfc.toFixed(2) +
      ", which is within the noise of 3 residual degrees of freedom), and the PCA separates samples by condition on PC1, not by run. Ignoring run gives " + sens.no_run_n_sig +
      " significant genes, " + sens.no_run_overlap + " of them shared with the main list; the main analysis keeps run in the model because the design calls for it. " +
      "Whether run and treatment <em>interact</em> cannot be tested usefully: that model leaves " + S.design.interaction_residual_df + " residual degrees of freedom.</p>";
    $("runbox").innerHTML = html;
  }

  function looOthers() {
    var r = Object.keys(S.sensitivity.leave_one_out).filter(function (k) { return k !== "ctrl_3" && k !== "trt_1"; })
      .map(function (k) { return S.sensitivity.leave_one_out[k].lfc_r; });
    return { lo: Math.min.apply(null, r), hi: Math.max.apply(null, r) };
  }
  function looRange() {
    var n = Object.keys(S.sensitivity.leave_one_out).map(function (k) { return S.sensitivity.leave_one_out[k].n_sig; });
    return Math.min.apply(null, n) + "–" + Math.max.apply(null, n);
  }

  // ------------------------------------------------------------ methods
  function powerItem() {
    if (!S.power || !S.power.length) return "";
    var sc = S.power.slice().sort(function (a, b) { return b.pi - a.pi; });
    var bands = sc[0].folds[0].by_mean.map(function (b) { var k = function (v) { return v >= 1000 ? v / 1000 + "k" : String(v); };
      return "mean " + (b.hi === null ? "≥ " + k(b.lo) : b.lo === 0 ? "&lt; " + k(b.hi) : k(b.lo) + "–" + k(b.hi)); });
    var tables = sc.map(function (x) {
      return '<div class="table-wrap power-wrap" tabindex="0" role="region" aria-label="Simulated detection, ' + Math.round(100 * x.pi) + ' % of genes changed"><table class="power-t"><caption>' +
        Math.round(100 * x.pi) + " % of genes changed</caption><thead><tr><th scope=\"col\">True change</th><th scope=\"col\">All genes</th>" +
        bands.map(function (b) { return "<th scope=\"col\">" + b + "</th>"; }).join("") + "</tr></thead><tbody>" +
        x.folds.map(function (f) {
          return "<tr><th scope=\"row\">" + f.fold + "-fold</th><td>" + Math.round(100 * f.power) + " %</td>" +
            f.by_mean.map(function (b) { return "<td>" + Math.round(100 * b.power) + " %" + (b.n < 30 ? "*" : "") + "</td>"; }).join("") + "</tr>";
        }).join("") + "</tbody></table></div>";
    }).join("");
    return "<li><strong>How conservative is the test?</strong> The same simulation was repeated with every true change set to one of " +
      sc[0].folds.map(function (f) { return f.fold; }).join(", ") + "-fold (equal shares, random direction, run effect included), and with two shares of changed genes, " +
      sc.map(function (x) { return Math.round(100 * x.pi) + " % (" + x.n_rep + " data sets, on average " + x.mean_called.toFixed(1) + " genes called, realised FDR " + Math.round(100 * x.fdr) + " %)"; }).join(" and ") +
      ", because how many genes change affects how strict Benjamini–Hochberg is. The real list of " + S.n_sig + " falls between the two. A gene counts as detected only if it is called with the right direction. " +
      "Each cell is the share detected; each fold size has " + Math.min.apply(null, sc.map(function (x) { return Math.min.apply(null, x.folds.map(function (f) { return f.n; })); })) + "–" +
      Math.max.apply(null, sc.map(function (x) { return Math.max.apply(null, x.folds.map(function (f) { return f.n; })); })) + " true changes per scenario (* fewer than 30 in that mean-count band, so rough). Mean is the mean normalised count; the 11 listed genes have means of 139–4,978." +
      tables +
      "The numbers depend on the simulation matching reality: the assumed dispersion trend, how fold sizes are spread, and independent genes.</li>";
  }
  function methods() {
    var st = S.selftest;
    var sens = S.sensitivity;
    var simTxt = st ? "On data simulated from this experiment's own size factors, means, dispersion trend and a run effect (" + st.length + " repeats, 10 % true changes), this procedure gave a realised FDR of " +
      Math.round(100 * Math.min.apply(null, st.map(function (r) { return r.fdr; }))) + "–" + Math.round(100 * Math.max.apply(null, st.map(function (r) { return r.fdr; }))) +
      " % and found " + Math.round(100 * Math.min.apply(null, st.map(function (r) { return r.power; }))) + "–" + Math.round(100 * Math.max.apply(null, st.map(function (r) { return r.power; }))) +
      " % of the truly changed genes (true changes drawn from 1.4- to 5.7-fold). The usual normal reference would have given a realised FDR of " + Math.round(100 * Math.min.apply(null, st.map(function (r) { return r.fdr_normal_ref; }))) + "–" +
      Math.round(100 * Math.max.apply(null, st.map(function (r) { return r.fdr_normal_ref; }))) + " %, well above the 5 % promised." : "";
    $("methods").innerHTML =
      "<h3>What was done</h3><ol>" +
      "<li><strong>Input.</strong> Raw integer counts for " + S.n_genes.toLocaleString("en") + " genes in 6 samples. " + S.n_filtered + " genes with fewer than 10 reads in total were not tested.</li>" +
      "<li><strong>Library size.</strong> Median-of-ratios size factors (DESeq2's method, from the " + S.n_sf_genes.toLocaleString("en") + " genes with no zero count). They range " +
      Math.min.apply(null, S.size_factors).toFixed(2) + "–" + Math.max.apply(null, S.size_factors).toFixed(2) + " and track the raw library sizes (" +
      (Math.min.apply(null, S.library_size) / 1e6).toFixed(2) + "–" + (Math.max.apply(null, S.library_size) / 1e6).toFixed(2) + " M reads). They enter the model as offsets; counts are never rescaled before fitting.</li>" +
      "<li><strong>Model.</strong> A negative-binomial GLM per gene, <code>counts ~ run + condition</code>, fitted by iteratively reweighted least squares. The treatment effect is the condition coefficient, reported as log₂(treated / control).</li>" +
      "<li><strong>Dispersion.</strong> Gene-wise estimates by Cox–Reid adjusted profile likelihood; a trend α = a₀ + a₁/mean fitted to them; then empirical-Bayes shrinkage toward the trend (prior variance of log dispersion " + S.dispersion.sigma2_prior.toFixed(2) +
      ", which is DESeq2's floor: the observed spread was no larger than sampling noise with 3 residual df would produce). " + S.dispersion.n_disp_outliers + " genes whose own estimate sits far above the trend keep it.</li>" +
      "<li><strong>Test.</strong> Wald statistic for the condition coefficient, compared with a t distribution on " + S.test.df.toFixed(1) + " degrees of freedom (" + S.test.residual_df + " residual + " + S.test.prior_df.toFixed(1) +
      " contributed by the dispersion prior), then Benjamini–Hochberg at 5 %. 95 % intervals use the same t quantile (" + S.test.ci_quantile.toFixed(2) + ").</li>" +
      "<li><strong>Why not the standard normal reference?</strong> " + simTxt + " With it, " + sens.normal_n_sig + " genes would be called; all " + sens.normal_overlap + " of the main list are among them. Using only the 3 residual df calls " + sens.t3_n_sig + " genes; that ignores the information shared across genes.</li>" +
      powerItem() +
      "<li><strong>Shrunken fold changes.</strong> A normal prior on the log fold change (width set from the upper 5 % of estimates, SD " + S.lfc_prior_sd.toFixed(2) + " log₂ units) gives a more conservative point estimate for ranking and plotting. Tests and intervals use the unshrunken estimate.</li>" +
      "<li><strong>Outliers.</strong> Cook's distance per gene and sample against the F(3, 3) 99 % cut-off (" + S.cooks.cutoff.toFixed(1) + "): " + S.cooks.n_genes_flagged + " genes flagged. With 3 residual df this cut-off is lenient and catches only extreme single counts. At sample level, PCA and sample distances show no sample standing apart; ctrl_1 and ctrl_2 differ most along PC2 (" + Math.round(S.pca.var_explained[1] * 100) + " % of variance), which is consistent with replicate spread rather than a run effect (both are in run A).</li>" +
      "<li><strong>Implementation.</strong> The DESeq2 procedure was re-implemented in Python (numpy, scipy) because R and DESeq2 were not available here; it was not checked against DESeq2 itself.</li></ol>" +
      "<h3>What this design cannot tell you</h3><ul>" +
      "<li><strong>Absent from the list is not unchanged.</strong> With 3 replicates and a median dispersion of " + S.dispersion.median_disp.toFixed(2) + ", a true 2-fold change is almost never detected (" + pctRange(powerAt(2)) + " in simulation) and a true 4-fold change is missed more often than it is found (" + pctRange(powerAt(4)) + " detected). The smallest estimated change in the list is " + Math.pow(2, S.abs_lfc_sig_range[0]).toFixed(1) + "-fold. The list is a floor, not the extent of the response.</li>" +
      "<li><strong>Fold changes of the listed genes are probably overestimated.</strong> When power is this low, the genes that pass tend to be those whose noise happened to push the estimate outward (the winner's curse). The shrunken estimates, and the lower ends of the intervals, are the safer guides to size.</li>" +
      "<li><strong>A listed gene can still be a false positive.</strong> FDR 5 % bounds the expected share of false positives in the list: for " + S.n_sig + " genes, fewer than one on average. " + (st ? "In simulation the realised FDR was " + Math.round(100 * Math.min.apply(null, st.map(function (r) { return r.fdr; }))) + "–" + Math.round(100 * Math.max.apply(null, st.map(function (r) { return r.fdr; }))) + " %, " : "") + "but that assumes the simulation matches reality, and it cannot say which gene, if any, is false.</li>" +
      "<li><strong>The list is fragile.</strong> Leaving out any one sample (2 residual df instead of 3) shrinks the list to " + looRange() + " genes. Leaving out ctrl_3 or trt_1, the two samples that break the link between run and treatment, also scrambles the fold changes (r = " +
      S.sensitivity.leave_one_out.ctrl_3.lfc_r.toFixed(2) + " and " + S.sensitivity.leave_one_out.trt_1.lfc_r.toFixed(2) + " with the full analysis, against " + looOthers().lo.toFixed(2) + "–" + looOthers().hi.toFixed(2) + " for the others). More replicates, balanced across runs, would fix this.</li>" +
      "<li><strong>One dose, one time point, one culture set-up.</strong> Nothing here says whether responses are direct or downstream, transient or lasting, or dose-dependent, or whether they hold in other strains or conditions.</li>" +
      "<li><strong>RNA abundance, relative.</strong> Counts measure steady-state RNA relative to the rest of the library. Normalisation assumes most genes do not change; a global shift in transcription would be invisible. Nothing is said about protein or activity.</li>" +
      "<li><strong>Run is only partly a technical factor.</strong> If run also marks a different culture batch or day, it is absorbed in the same term; the design cannot tell the two apart, nor test a run × treatment interaction.</li>" +
      "<li><strong>No biology.</strong> Gene IDs are anonymous. The page makes no claim about what any gene does, which pathways are involved, or why.</li></ul>";
  }

  // ------------------------------------------------------------ boot
  header();
  var thrP = (function () { var s = tested.filter(function (g) { return g.sig; }); return s.length ? Math.max.apply(null, s.map(function (g) { return g.pvalue; })) : null; })();
  var maxAbs = Math.max.apply(null, tested.map(function (g) { return Math.abs(g.lfc); }));
  var L = Math.ceil(maxAbs + 0.2);
  var maxY = Math.max.apply(null, tested.map(function (g) { return -Math.log10(g.pvalue); }));
  charts.push(geneScatter($("volcano"), {
    x: function (g) { return g.lfc; }, y: function (g) { return -Math.log10(g.pvalue); },
    xDomain: [-L, L], yDomain: [0, Math.ceil(maxY + 0.5)], labelSig: true,
    xl: "log₂ fold change (treated / control)", yl: "−log₁₀ p",
    refs: (thrP ? [{ y: -Math.log10(thrP) }] : []).concat([{ x: 0 }]),
    label: "Volcano plot of " + tested.length + " genes; " + S.n_sig + " significant. Use arrow keys to move between genes."
  }));
  var xs = tested.map(function (g) { return Math.log10(g.baseMean); });
  charts.push(geneScatter($("ma"), {
    x: function (g) { return Math.log10(g.baseMean); }, y: function (g) { return g.lfc; },
    xDomain: [Math.floor(Math.min.apply(null, xs)), Math.ceil(Math.max.apply(null, xs))], yDomain: [-L, L],
    xl: "mean normalised count", yl: "log₂ fold change", refs: [{ y: 0 }],
    xfmt: function (t) { var v = Math.pow(10, t); return v >= 1000 ? (v / 1000) + "k" : String(v); },
    label: "MA plot of " + tested.length + " genes. Use arrow keys to move between genes."
  }));
  buildHead();
  renderTable();
  $("q").addEventListener("input", function () { limit = 25; renderTable(); });
  $("fdr").addEventListener("change", function () { limit = 25; renderTable(); });
  $("dir").addEventListener("change", function () { limit = 25; renderTable(); });
  $("more").addEventListener("click", function () { limit += 50; renderTable(); });
  var top = tested.slice().sort(function (a, b) { return a.pvalue - b.pvalue; })[0];
  $("top-gene-btn").textContent = "Show the strongest hit (" + top.gene + ")";
  $("top-gene-btn").addEventListener("click", function () { selectGene(top, false); });
  selectGene(top, false);
  libChart(); pcaChart(); distChart(); dispChart(); runBox(); methods();
  // label sizes change at the narrow-screen breakpoint, so re-place labels when it is crossed
  var lastW = window.innerWidth <= 600;
  window.addEventListener("resize", function () {
    var nw = window.innerWidth <= 600;
    if (nw !== lastW) { lastW = nw; charts.forEach(function (c) { c.relabel(); }); }
  });
  window.addEventListener("scroll", function () {
    // keep the keyboard tooltip attached to its point; pointer tooltips just close
    var c = charts.filter(function (ch) { return ch.root === document.activeElement; })[0];
    if (c) c.reanchor(); else hideTip();
  }, { passive: true });
})();
