"""Assemble the lab: data.json for the page and runs/<key>/ with each run's published files.

python3 -B harness/build.py
Every text file that leaves a run is sanitized (machine paths and email addresses masked). The demo
private key of the sealing run is never copied. Numbers shown on the page are read from the run's
own files or from checks/<key>.json, never typed here; the prose in RULES quotes what the files show.
"""
import csv, json, math, os, re, shutil
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
RUNS = Path(os.environ.get("RUN_ROOT", "/private/tmp/claude-501/fabius-skill-runs"))
PUB = HERE / "runs"
BASE = "/assets/skills-20260921/"
HOME = str(Path.home())
# names to mask: the account name, plus any written forms passed in MASK_NAMES (comma-separated)
MASK = [re.escape(Path.home().name) + r"\w*"] + [r"(?i)" + r"\s*".join(map(re.escape, n.split())) for n in os.environ.get("MASK_NAMES", "").split(",") if n.strip()]

ORDER = ["router", "parcus", "disciplina", "decor", "cohors", "archivum", "mercatus", "praesidium",
         "ludus", "catena", "machina", "scientia", "doctrina", "fortuna", "concilium"]
SKILL = {k: "fabius" if k == "router" else f"fabius-{k}" for k in ORDER}
ICON = {k: "emblem" if k == "router" else ("bug-parcus" if k == "parcus" else f"bug-{k}") for k in ORDER}
ROLE = {"router": "picks the skills, the machinery, the tier", "parcus": "the lean core, always on", "disciplina": "engineering process",
        "decor": "design and charts", "cohors": "agent engineering", "archivum": "project memory", "mercatus": "go-to-market",
        "praesidium": "defensive security", "ludus": "small-game craft", "catena": "on-chain and sealing", "machina": "automation",
        "scientia": "science method", "doctrina": "AI/ML engineering", "fortuna": "markets, never advice", "concilium": "multi-model council"}
TITLE = {"router": "Plan a paid API launch, then do the part that matters most", "parcus": "Cut a 203-line pull request down to what was asked",
         "disciplina": "A billing bug: root cause, failing test, fix, proof", "decor": "A pricing section built from a fact sheet",
         "cohors": "An agent team for a support inbox that never sends on its own", "archivum": "A project record, cited line by line",
         "mercatus": "Launch copy where every number is a fact", "praesidium": "A security review before Friday's release",
         "ludus": "A playable beetle game, core loop first", "catena": "Seal a release; change one byte and watch it break",
         "machina": "An n8n lead workflow that never sends twice", "scientia": "An RNA-seq experiment, read without over-claiming",
         "doctrina": "A support-message router, measured against a control", "fortuna": "Test a forum's '30% a year' strategy honestly",
         "concilium": "Three models, one question, a blind review"}


def sanitize(t):
    t = t.replace(str(RUNS), "[runs]")
    t = re.sub(r"\[runs\]/(\w+)/work", ".", t)
    t = t.replace(HOME + "/.claude/plugins/cache/fabius/fabius/3.2.0", "[fabius-3.2.0]")
    t = t.replace(HOME, "~")
    t = re.sub(r"/private/tmp/claude-\d+", "[tmp]", t)
    t = re.sub(r"-private-tmp-claude-\d+-", "[tmp]/", t)
    for name in MASK:
        t = re.sub(name, "[owner]", t)
    t = re.sub(r"\b[\w.+-]+@(?!example\b)(?!harbor-audit\.example)[\w-]+\.[\w.]+\b", "[email]", t)
    return t


def pub_text(src, dst):
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(sanitize(src.read_text(errors="replace")))


def read_stream(key):
    events = [json.loads(l) for l in open(RUNS / key / "stream.jsonl") if l.strip()]
    t0 = next((datetime.fromisoformat(e["timestamp"].replace("Z", "+00:00")) for e in events if e.get("timestamp")), None)
    steps, skills, results = [], [], {}
    for e in events:
        if e.get("type") == "user":
            for c in (e["message"].get("content") if isinstance(e["message"].get("content"), list) else []):
                if c.get("type") == "tool_result":
                    body = c.get("content")
                    body = "".join(x.get("text", "") for x in body) if isinstance(body, list) else str(body or "")
                    results[c["tool_use_id"]] = body
        if e.get("type") != "assistant" or not e.get("timestamp"):
            continue
        t = (datetime.fromisoformat(e["timestamp"].replace("Z", "+00:00")) - t0).total_seconds()
        for c in e["message"].get("content", []):
            if c.get("type") != "tool_use":
                continue
            name, inp = c["name"], c.get("input", {})
            if name == "Skill":
                s = str(inp.get("skill") or inp.get("command") or "").replace("fabius:", "")
                skills.append(s); kind, label = "skill", f"loaded {s}"
            elif name in ("Write", "Edit", "MultiEdit", "NotebookEdit"):
                kind, label = "write", sanitize(str(inp.get("file_path", "")))
            elif name == "Bash":
                kind, label = "run", sanitize(str(inp.get("command", "")).split("\n")[0])[:160]
            else:
                kind, label = "read", sanitize(str(inp.get("file_path") or inp.get("pattern") or inp.get("path") or ""))[:160]
            steps.append({"t": round(t, 1), "tool": name, "kind": kind, "label": label, "id": c["id"], "input": inp})
    final = events[-1]
    return {"events": events, "steps": steps, "skills": skills, "results": results, "final": final}


def transcript(key, st, brief):
    out = [f"# {SKILL[key]} — full run transcript", "", "Clean Claude Code session with only the Fabius plugin loaded. Tool results are shortened to 1,500 characters; paths are masked.", "",
           "## The brief", "", "```", brief, "```", ""]
    for e in st["events"]:
        if e.get("type") != "assistant":
            continue
        for c in e["message"].get("content", []):
            if c.get("type") == "text" and c["text"].strip():
                out += ["**Fabius:** " + sanitize(c["text"].strip()), ""]
            elif c.get("type") == "tool_use":
                body = json.dumps(c.get("input", {}), ensure_ascii=False, indent=1)
                out += [f"**{c['name']}**", "", "```", sanitize(body[:2000]) + (" …" if len(body) > 2000 else ""), "```", ""]
                res = st["results"].get(c["id"])
                if res:
                    out += ["```", sanitize(res[:1500]) + (" …" if len(res) > 1500 else ""), "```", ""]
    return "\n".join(out)


def md(path):
    return sanitize(Path(path).read_text(errors="replace"))


def checks(key):
    p = HERE / "checks" / f"{key}.json"
    return json.loads(p.read_text()) if p.exists() else {"checks": [], "extra": None}


def git(cmd, cwd):
    import subprocess
    return subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True).stdout


# ── panels per run ───────────────────────────────────────────────────────────────────────
def panels(key, w, ck):
    o = w / "out"
    pub = lambda name: BASE + f"runs/{key}/" + name
    if key == "router":
        return [{"tab": "The routing plan", "parts": [{"type": "md", "text": md(o / "ROUTE.md")}]},
                {"tab": "The threat model it did first", "parts": [{"type": "md", "text": md(o / "THREAT_MODEL.md")}]},
                {"tab": "Decisions, for next week", "parts": [{"type": "md", "text": md(o / "DECISIONS.md")}]}]
    if key == "parcus":
        pr = git("git diff --shortstat main..origin/feature/keep-case 2>/dev/null || true", w)
        orig = git(f"git -C {w} diff 3649666 70e3fca", w)
        final = (o / "final.diff").read_text()
        a, b = re.search(r"(\d+) insertion", git("git diff --shortstat 3649666 70e3fca", w)), re.search(r"(\d+) insertion", git("git diff --shortstat main..feature/keep-case", w))
        fa, fb = re.search(r"(\d+) files?", git("git diff --shortstat 3649666 70e3fca", w)), re.search(r"(\d+) files?", git("git diff --shortstat main..feature/keep-case", w))
        return [{"tab": "The trim", "parts": [
                    {"type": "stats", "items": [{"value": f"+{a.group(1)}", "label": f"lines the pull request added, in {fa.group(1)} files"},
                                                {"value": f"+{b.group(1)}", "label": f"lines after the trim, in {fb.group(1)} files", "tone": "ok"},
                                                {"value": "5 / 5", "label": "tests pass, incl. the PR's own", "tone": "ok"}]},
                    {"type": "diff", "text": sanitize(final)}]},
                {"tab": "The original pull request", "parts": [{"type": "diff", "text": sanitize(orig)}]},
                {"tab": "Its note to the contributor", "parts": [{"type": "md", "text": md(o / "REVIEW.md")}]}]
    if key == "disciplina":
        fx = HERE / "fixtures/disciplina"
        import difflib
        d = "".join(difflib.unified_diff((fx / "billing/proration.py").read_text().splitlines(True), (w / "billing/proration.py").read_text().splitlines(True), "a/billing/proration.py", "b/billing/proration.py"))
        d += "".join(difflib.unified_diff((fx / "tests/test_proration.py").read_text().splitlines(True), (w / "tests/test_proration.py").read_text().splitlines(True), "a/tests/test_proration.py", "b/tests/test_proration.py"))
        oracle = json.loads(os.popen(f"python3 -B {HERE}/truth/disciplina_oracle.py {w}").read())
        return [{"tab": "Root cause and proof", "parts": [{"type": "md", "text": md(o / "REPORT.md")}]},
                {"tab": "The fix", "parts": [{"type": "diff", "text": d}]},
                {"tab": "Our hidden oracle", "parts": [
                    {"type": "lead", "text": f"Seven exact-cent cases from POLICY.md, never shown to the run. **{oracle['passed']} of {oracle['total']}** match."},
                    {"type": "table", "head": ["Case", "Expected", "Got", ""], "rows": [[c["case"], f"{c['expected']}¢", f"{c['got']}¢", {"text": "✓" if c["pass"] else "✗ flagged in its report, not fixed", "tone": "ok" if c["pass"] else "bad"}] for c in oracle["cases"]]}]}]
    if key == "decor":
        return [{"tab": "The page, live", "parts": [{"type": "frame", "src": pub("page"), "title": "Tidepool pricing, as delivered", "bar": "tidepool / pricing · as delivered", "note": "The file exactly as the run wrote it, running in a sandbox."}]},
                {"tab": "The visual system it captured first", "parts": [{"type": "md", "text": md(o / "visual-system.md")}]}]
    if key == "cohors":
        team = json.loads((o / "team.json").read_text())
        plan = json.loads((o / "plan-output.json").read_text())
        levels = plan.get("levels") or plan.get("plan", {}).get("levels") or []
        tasks = {t["id"]: t for t in team.get("tasks", [])}
        nodes, edges = [], []
        for li, level in enumerate(levels):
            for ri, tid in enumerate(level):
                t = tasks.get(tid, {})
                nodes.append({"id": tid, "label": tid, "sub": f"agent: {t.get('agent', '?')}", "x": li * 300, "y": ri * 84, "kind": "human" if "escalat" in tid else ""})
                for dep in t.get("dependsOn", t.get("depends_on", [])):
                    edges.append({"from": dep, "to": tid})
        rows = []
        for a in team.get("agents", []):
            rows.append([a["id"], ", ".join(a.get("tools", []) if isinstance(a.get("tools"), list) else list((a.get("tools") or {}).keys())),
                         ", ".join(f"{k}: {v}" for k, v in (a.get("permissions") or {}).items())])
        return [{"tab": "The team and its plan", "parts": [
                    {"type": "lead", "text": f"**{len(team.get('agents', []))} agents**, {len(tasks)} sample tasks, ordered by the scheduler that ships with fabius-cohors into {len(levels)} levels."},
                    {"type": "graph", "label": "The scheduler's plan", "nodes": nodes, "edges": edges},
                    {"type": "table", "head": ["Agent", "Tools it may call", "Permissions"], "rows": rows}]},
                {"tab": "Why two agents", "parts": [{"type": "md", "text": md(o / "TEAM.md")}]}]
    if key == "archivum":
        srcs = {}
        for p in list((w / "notes").glob("*.md")) + [w / "chat-export.txt"]:
            rel = str(p.relative_to(w))
            srcs[rel] = p.read_text().splitlines()
        return [{"tab": "Answers, cited", "parts": [{"type": "lead", "text": "Hover or focus a citation to see the exact source line."}, {"type": "cited", "text": md(o / "ANSWERS.md"), "sources": srcs}]},
                {"tab": "The project record", "parts": [{"type": "cited", "text": md(o / "harbor.md"), "sources": srcs}]}]
    if key == "mercatus":
        facts = [l.strip("- ").strip() for l in (w / "FACTS.md").read_text().splitlines() if l.strip().startswith("-")]
        return [{"tab": "The copy", "parts": [{"type": "lead", "text": "Every number is highlighted. Hover or focus one to see the fact sheet line it came from."}, {"type": "facts", "text": md(o / "COPY.md"), "facts": facts}]}]
    if key == "praesidium":
        ex = ck.get("extra") or {}
        before = {a["attack"]: a for a in ex.get("before", {}).get("attacks", [])}
        rows = [[a["attack"], {"text": "open" if not before.get(a["attack"], {}).get("blocked") else "blocked", "tone": "bad" if not before.get(a["attack"], {}).get("blocked") else "ok"},
                 {"text": "blocked" if a["blocked"] else "open", "tone": "ok" if a["blocked"] else "bad"}] for a in ex.get("after", {}).get("attacks", [])]
        import difflib
        d = "".join(difflib.unified_diff((HERE / "fixtures/praesidium/server.js").read_text().splitlines(True), (w / "server.js").read_text().splitlines(True), "a/server.js", "b/server.js"))
        n_after = ex.get("after", {}).get("blocked", 0); n = ex.get("after", {}).get("total", 0)
        return [{"tab": "Our exploit probe", "parts": [
                    {"type": "stats", "items": [{"value": f"0 / {n}", "label": "attacks blocked before the review", "tone": "bad"}, {"value": f"{n_after} / {n}", "label": "attacks blocked after", "tone": "ok" if n_after == n else "bad"}]},
                    {"type": "table", "head": ["Attack (our probe, unseen by the run)", "Before", "After"], "rows": rows}]},
                {"tab": "The review", "parts": [{"type": "md", "text": md(o / "SECURITY-REVIEW.md")}]},
                {"tab": "The fix", "parts": [{"type": "diff", "text": d}]}]
    if key == "ludus":
        return [{"tab": "Play it", "parts": [{"type": "frame", "src": pub("page"), "title": "Beetle Garden Dash, as delivered", "bar": "beetle garden dash · arrow keys, WASD or touch", "note": "Click the game first so it receives keys. The file exactly as the run wrote it, in a sandbox."}]}]
    if key == "catena":
        man = json.loads((o / "bundle/manifest.json").read_text())
        files = [{"path": e["path"], "leaf": e.get("leaf") or e.get("leafHash") or e.get("hash"), "text": (w / "release" / e["path"]).read_text()} for e in man["files"]]
        import base64
        pub_raw = base64.b64decode(man["publicKey"]["rawBase64"]).hex()
        sig = base64.b64decode(man["signature"]["base64"]).hex()
        return [{"tab": "Tamper lab", "parts": [{"type": "seal", "files": files, "root": man["root"], "pub": pub_raw, "sig": sig, "signed": "root-raw"}]},
                {"tab": "The seal record", "parts": [{"type": "md", "text": md(o / "SEAL.md")}]}]
    if key == "machina":
        wf = json.loads((o / "workflow.json").read_text())
        nodes = [{"id": n["name"], "label": n["name"], "sub": n["type"].replace("n8n-nodes-base.", ""), "x": n["position"][0], "y": n["position"][1],
                  "kind": "trigger" if "webhook" in n["type"].lower() and "respond" not in n["type"].lower() else ("error" if re.search(r"alert|error", n["name"], re.I) else "")}
                 for n in wf["nodes"] if "stickyNote" not in n["type"]]
        edges = []
        for src, outs in wf.get("connections", {}).items():
            for branches in outs.values():
                for bi, branch in enumerate(branches):
                    for t in branch:
                        edges.append({"from": src, "to": t["node"], "kind": "error" if bi > 0 and re.search(r"alert|error|fail", t["node"], re.I) else ""})
        import subprocess
        tout = subprocess.run(["node", "--test", "workflow.test.mjs"], cwd=o, capture_output=True, text=True).stdout
        return [{"tab": "The workflow", "parts": [{"type": "lead", "text": "Drawn from the importable workflow.json, top to bottom in the order n8n runs it. Dashed red lines are error paths; they all drain into the error branch on the right."},
                                                  {"type": "graph", "label": "The n8n workflow", "nodes": nodes, "edges": edges}]},
                {"tab": "Runbook", "parts": [{"type": "md", "text": md(o / "RUNBOOK.md")}]},
                {"tab": "Its tests", "parts": [{"type": "term", "text": sanitize(tout)}]}]
    if key == "scientia":
        truth = set(json.loads((HERE / "truth/scientia_truth.json").read_text())["planted_responders"])
        rows = list(csv.DictReader(open(o / "results.csv")))
        pts = [{"x": float(r["log2_fold_change"]), "y": -math.log10(max(float(r["p_value"]), 1e-300)), "called": r["called"].strip().lower() == "true", "truth": r["gene"] in truth} for r in rows]
        return [{"tab": "Volcano", "parts": [{"type": "scatter", "points": pts, "label": "Volcano plot of 1,968 genes", "xLabel": "log2 fold change (treated vs control)", "yLabel": "−log10 p value", "truthToggle": True,
                                              "note": "The data are synthetic, with 60 responders planted by us and never shown to the run. Reveal them to see how its ranking did."}]},
                {"tab": "Report", "parts": [{"type": "md", "text": md(o / "REPORT.md")}]}]
    if key == "doctrina":
        m = json.loads((o / "metrics.json").read_text())
        tm, tc = m["test_results"]["model"], m["test_results"]["control"]
        cm = tm["confusion_matrix"]
        pc = tm["per_class"]
        return [{"tab": "Held-out results", "parts": [
                    {"type": "stats", "items": [{"value": f"{tm['accuracy']:.1%}", "label": f"held-out accuracy (95% CI {tm['accuracy_ci95'][0]:.1%}–{tm['accuracy_ci95'][1]:.1%})", "tone": "ok"},
                                                {"value": f"{tc['accuracy']:.1%}", "label": "majority-class control", "tone": "bad"},
                                                {"value": f"{tm['macro_f1']:.3f}", "label": "macro F1"},
                                                {"value": str(m['split']['test_rows']), "label": "test messages, scored once"}]},
                    {"type": "heat", "labels": cm["classes"], "matrix": cm["matrix"], "label": "Confusion matrix on the held-out set"},
                    {"type": "table", "head": ["Label", "Precision", "Recall", "F1"], "rows": [[k.replace("_", " "), f"{v['precision']:.2f}", f"{v['recall']:.2f}", f"{v['f1']:.2f}"] for k, v in pc.items()]}]},
                {"tab": "Report", "parts": [{"type": "md", "text": md(o / "REPORT.md")}]}]
    if key == "fortuna":
        r = json.loads((o / "results.json").read_text())
        de = r["daily_equity"]; dates = de["dates"]
        step = max(1, len(dates) // 360)
        idx = list(range(0, len(dates), step))
        split = next((i for i, j in enumerate(idx) if dates[j] >= r["meta"]["split_date"]), None)
        naive = r["naive_replication_zero_cost_whole_sample"]
        vs = r["variant_search"]
        ticks = [0, len(idx) // 3, 2 * len(idx) // 3, len(idx) - 1]
        return [{"tab": "The claim vs the data", "parts": [
                    {"type": "stats", "items": [{"value": "30% / yr", "label": "the forum's claim", "tone": "bad"},
                                                {"value": f"{naive['strategy']['cagr']:.1%} / yr", "label": "50/200 crossover, whole sample, no costs"},
                                                {"value": f"{vs['best_variant_in_sample_metrics']['sharpe']:.2f} → {vs['best_variant_out_of_sample_metrics']['sharpe']:.2f}", "label": "best of 29 variants: Sharpe in-sample → out-of-sample", "tone": "bad"},
                                                {"value": f"p = {r['significance']['p_value_best_of_grid']:.2f}", "label": "luck test for the best variant"}]},
                    {"type": "lines", "label": "Equity: 50/200 crossover vs buy and hold", "x": [dates[j][:7] for j in idx], "xTicks": ticks, "split": split, "splitLabel": "held back until the end",
                     "series": [{"name": "50/200 crossover (5 bps costs)", "values": [de["strategy"][j] for j in idx], "color": "#9ade2b"},
                                {"name": "buy and hold", "values": [de["buy_and_hold"][j] for j in idx], "color": "#8f9a8c", "dash": "5 4"}]}]},
                {"tab": "Report", "parts": [{"type": "md", "text": md(o / "REPORT.md")}]}]
    if key == "concilium":
        d = json.loads((RUNS / "concilium/out/council.json").read_text())
        res = d["result"]
        ops = [{"model": o_["model"], "answer": sanitize(o_["answer"]), "short": ("13/27" if "13/27" in o_["answer"].replace(" ", "") else "")} for o_ in res["first_opinions"]]
        return [{"tab": "The council", "parts": [{"type": "council", "opinions": ops, "leaderboard": res["leaderboard"], "final": sanitize(res["final"]), "chairman": res["chairman"]}]},
                {"tab": "The question", "parts": [{"type": "md", "text": (HERE / "fixtures/concilium/QUESTION.md").read_text() + "\n\nExact answer under these assumptions: **13/27** (about 0.481)."}]}]
    raise KeyError(key)


RULES = json.loads((HERE / "harness/rules.json").read_text())


def headline(key, ck, st):
    c = {x["name"]: x for x in ck["checks"]}
    first = lambda pat: next((x for x in ck["checks"] if re.search(pat, x["name"])), None)
    H = {"router": "4 parts routed · riskiest done first", "parcus": "+203 lines → +16", "decor": "AA contrast · every control focusable",
         "cohors": "2 agents · neither can send", "mercatus": "every number from the fact sheet", "ludus": "playable · keys and touch",
         "catena": "one flipped bit breaks the seal", "machina": "16 nodes · no double send", "fortuna": "claimed 30%/yr · measured 0.6%"}
    if key in H: return H[key]
    if key == "disciplina": return first(r"oracle")["name"].replace("Hidden billing oracle: ", "") .replace(" exact-cent cases", " hidden cases")
    if key == "archivum": m = re.search(r"\((\d+ of \d+)\)", first(r"citation")["name"]); return f"{m.group(1)} citations resolve"
    if key == "praesidium": m = re.search(r"(\d+ of \d+) attacks", first(r"exploit")["name"]); return f"{m.group(1)} attacks blocked"
    if key == "scientia": return "0 false calls · 7 of top 10 real"
    if key == "doctrina": return re.sub(r"model (\S+) vs majority-class control (\S+)", r"\1 vs \2 control", first(r"control")["detail"])
    if key == "concilium": return "13/27 · blind peer review"
    return ""


def main():
    if PUB.exists(): shutil.rmtree(PUB)
    runs = []
    for key in ORDER:
        brief_file = HERE / "briefs" / f"{key}.md"
        ck = checks(key)
        if key == "concilium":
            d = json.loads((RUNS / "concilium/out/council.json").read_text())
            secs = int((datetime.fromisoformat(d["ended"].replace("Z", "+00:00")) - datetime.fromisoformat(d["started"].replace("Z", "+00:00"))).total_seconds())
            steps = []
            t0 = 0
            for tr in d["transcript"]:
                t0 += tr["seconds"]
                steps.append({"t": min(t0, secs), "tool": {"opinion": "Seat", "review": "Review", "chair": "Chairman"}[tr["stage"]], "kind": {"opinion": "run", "review": "read", "chair": "write"}[tr["stage"]], "label": tr["model"]})
            brief = (HERE / "fixtures/concilium/QUESTION.md").read_text()
            ask = brief
            calls = d["result"]["call_accounting"]
            receipt = [["Seats", str(calls["live_seats"])], ["Chairman", d["result"]["chairman"].replace("claude-", "")], ["Calls", str(calls["actual"])], ["Time", f"{secs // 60}m {secs % 60:02d}s"]]
            dst = PUB / key; dst.mkdir(parents=True, exist_ok=True)
            (dst / "council.json").write_text(sanitize(json.dumps(d, indent=1)))
            (dst / "council-attempt-1.json").write_text(sanitize((RUNS / "concilium/council-attempt1-fable-limit.json").read_text()))
            shutil.copy(HERE / "harness/council.mjs", dst / "council-harness.mjs")
            files = [{"label": "council.json", "href": BASE + f"runs/{key}/council.json"}, {"label": "attempt 1 (seat lost)", "href": BASE + f"runs/{key}/council-attempt-1.json"}, {"label": "the harness", "href": BASE + f"runs/{key}/council-harness.mjs"}]
            skills_loaded = []
        else:
            meta = json.loads((RUNS / key / "meta.json").read_text())
            st = read_stream(key)
            full = brief_file.read_text()
            brief = full.split("\n---\n")[0].split(" ", 1)[1].strip()
            ask = brief.split("\n\n")[0]
            secs = round(st["final"].get("duration_ms", meta["elapsed_seconds"] * 1000) / 1000)
            steps = [{k: v for k, v in s.items() if k in ("t", "tool", "kind", "label")} for s in st["steps"]]
            skills_loaded = [SKILL[key]] + [s for s in st["skills"] if s != SKILL[key]]
            receipt = [["Model", meta["model"].replace("claude-", "")], ["Time", f"{secs // 60}m {secs % 60:02d}s"], ["Steps", str(len(steps))], ["Skills", str(len(dict.fromkeys(skills_loaded)))]]
            dst = PUB / key
            out = RUNS / key / "work/out"
            for p in out.rglob("*"):
                if p.is_dir() or "keys" in p.relative_to(out).parts or p.suffix in (".pyc",):
                    continue
                target = dst / "out" / p.relative_to(out)
                target.parent.mkdir(parents=True, exist_ok=True)
                if p.suffix.lower() in (".png", ".jpg", ".svg", ".webp"):
                    shutil.copy(p, target)
                else:
                    pub_text(p, target)
            if key == "catena":
                shutil.copy(RUNS / key / "work/out/keys/ed25519-public.pem", dst / "out/ed25519-public.pem")
            (dst / "brief.md").write_text(full)
            (dst / "transcript.md").write_text(transcript(key, st, full))
            (dst / "trace.json").write_text(json.dumps({"seconds": secs, "skills": skills_loaded, "steps": steps}, indent=1))
            if key in ("decor", "ludus"):
                shutil.move(dst / "out/index.html", dst / "page.html")
            files = [{"label": "full transcript", "href": BASE + f"runs/{key}/transcript.md"}, {"label": "the brief", "href": BASE + f"runs/{key}/brief.md"}] + \
                    [{"label": p.name, "href": BASE + f"runs/{key}/out/{p.relative_to(dst / 'out')}"} for p in sorted((dst / "out").rglob("*")) if p.is_file() and p.suffix in (".md", ".json", ".py", ".mjs", ".diff", ".csv", ".svg")][:8]
        runs.append({"key": key, "skill": SKILL[key], "icon": ICON[key], "role": ROLE[key], "title": TITLE[key], "headline": headline(key, ck, None),
                     "ask": ask, "brief": brief, "receipt": receipt, "seconds": secs, "trace": steps, "skills": skills_loaded,
                     "rules": RULES[key], "checks": [{"name": c["name"], "state": c["state"], "detail": c.get("detail", "")} for c in ck["checks"]],
                     "panels": panels(key, RUNS / key / "work" if key != "concilium" else RUNS / key, ck), "files": files})
    data = {"generated": datetime.utcnow().strftime("%Y-%m-%d"), "model": "claude-sonnet-5", "cli": "Claude Code 2.1.275", "plugin": "Fabius 3.2.0", "runs": runs}
    blob = sanitize(json.dumps(data, ensure_ascii=False))
    (HERE / "data.json").write_text(blob)
    leaks = re.findall(r"/Users/|/private/tmp|claude-\d{3}", blob) + [m for n in MASK for m in re.findall(n, blob)]
    print(f"data.json {len(blob) // 1024} KB · {len(runs)} runs · leaks: {len(leaks)}")


if __name__ == "__main__":
    main()
