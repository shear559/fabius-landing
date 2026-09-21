"""Seeded generators for the scientia, doctrina and fortuna fixtures.

python3 -B harness/make_data.py   (numpy only). Ground truth goes to truth/, never into fixtures/.
"""
import csv, json, math, random
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
FX, TR = ROOT / "fixtures", ROOT / "truth"


# -- scientia: RNA-seq counts, 2000 genes, 3 control + 3 treated, 60 planted responders ----------
def scientia():
    rng = np.random.default_rng(20260921)
    n_genes, n_de = 2000, 60
    genes = [f"GENE{i:04d}" for i in range(1, n_genes + 1)]
    base = np.exp(rng.normal(5.2, 1.6, n_genes))                 # mean expression, log-normal
    lfc = np.zeros(n_genes)
    de_idx = rng.choice(n_genes, n_de, replace=False)
    lfc[de_idx] = rng.choice([-1, 1], n_de) * rng.uniform(0.8, 2.6, n_de)
    size_factors = np.array([0.72, 1.08, 1.31, 0.66, 1.17, 1.42])  # unequal library sizes
    groups = ["control"] * 3 + ["treated"] * 3
    dispersion = 0.06 + 1.2 / np.sqrt(base)                       # NB dispersion falls with mean
    counts = np.zeros((n_genes, 6), dtype=int)
    for j, g in enumerate(groups):
        mu = base * size_factors[j] * (2 ** lfc if g == "treated" else 1)
        r = 1 / dispersion
        counts[:, j] = rng.negative_binomial(r, r / (r + mu))
    d = FX / "scientia"; d.mkdir(parents=True, exist_ok=True)
    samples = ["ctrl_1", "ctrl_2", "ctrl_3", "trt_1", "trt_2", "trt_3"]
    with open(d / "counts.csv", "w", newline="") as f:
        w = csv.writer(f); w.writerow(["gene"] + samples)
        for i, gname in enumerate(genes): w.writerow([gname] + counts[i].tolist())
    with open(d / "metadata.csv", "w", newline="") as f:
        w = csv.writer(f); w.writerow(["sample", "condition", "sequencing_run"])
        for s, g, run in zip(samples, groups, ["A", "A", "B", "A", "B", "B"]): w.writerow([s, g, run])
    truth = {genes[i]: round(float(lfc[i]), 4) for i in de_idx}
    (TR / "scientia_truth.json").write_text(json.dumps({"planted_responders": truth, "n_genes": n_genes, "seed": 20260921}, indent=1))


# -- doctrina: 720 support messages, 4 intents, templated with noise and 4% label noise -----------
def doctrina():
    rnd = random.Random(20260921)
    T = {
        "billing": ["I was charged {amt} twice this month", "why is my invoice {amt} higher than last time",
                    "can I get a refund for the {plan} plan", "my card was declined but you still billed me",
                    "please send the VAT invoice for {month}", "the upgrade charge of {amt} looks wrong",
                    "how do I change the card you bill", "cancel my subscription and stop charging me"],
        "bug": ["the app crashes when I open {feature}", "{feature} shows a blank screen since the update",
                "sync stopped working on my {device}", "export to PDF cuts off the last page",
                "I get error {code} when saving", "{feature} is really slow and then freezes",
                "notifications arrive twice on {device}", "the search returns nothing even for exact titles"],
        "feature_request": ["could you add dark mode to {feature}", "it would be great to share {feature} with my team",
                            "please support {device} widgets", "can you add an API for {feature}",
                            "I'd love keyboard shortcuts in {feature}", "any plans for offline mode on {device}",
                            "add a way to tag notes by colour", "let me schedule exports every week"],
        "account_access": ["I can't log in after resetting my password", "the 2FA code never arrives on my {device}",
                           "my account is locked after too many attempts", "I lost access to the email on my account",
                           "the magic link says it expired", "how do I change the owner of our workspace",
                           "someone else logged into my account from {city}", "I need to remove a former employee's access"],
    }
    fill = {"amt": ["$12", "$45", "$9.99", "$120", "€30"], "plan": ["Pro", "Team", "Basic"],
            "month": ["August", "September", "July"], "feature": ["the calendar", "notes", "the editor", "reports", "search"],
            "device": ["iPhone", "Android", "iPad", "Mac", "Windows"], "code": ["E502", "E13", "429", "E-SYNC-7"],
            "city": ["Lisbon", "Warsaw", "Austin"]}
    noise = ["", "", "", " thanks", " asap", " please help", "!!", " ...", " (again)", " — urgent"]
    openers = ["", "", "hi, ", "hello team, ", "hey, ", "quick question: "]
    rows = []
    for label, temps in T.items():
        for _ in range(180):
            t = rnd.choice(temps)
            msg = t.format(**{k: rnd.choice(v) for k, v in fill.items()})
            msg = rnd.choice(openers) + msg + rnd.choice(noise)
            if rnd.random() < 0.08:  # typos
                i = rnd.randrange(len(msg)); msg = msg[:i] + msg[i + 1:]
            rows.append([msg, label])
    rnd.shuffle(rows)
    labels = list(T)
    flipped = 0
    for r in rows:
        if rnd.random() < 0.04:
            r[1] = rnd.choice([l for l in labels if l != r[1]]); flipped += 1
    d = FX / "doctrina"; d.mkdir(parents=True, exist_ok=True)
    with open(d / "messages.csv", "w", newline="") as f:
        w = csv.writer(f); w.writerow(["id", "message", "label"])
        for i, (m, l) in enumerate(rows, 1): w.writerow([i, m, l])
    (TR / "doctrina_truth.json").write_text(json.dumps({"rows": len(rows), "label_noise_rate": 0.04, "flipped": flipped, "seed": 20260921}, indent=1))


# -- fortuna: 10 years of synthetic daily index prices, zero-edge random walk ---------------------
def fortuna():
    rng = np.random.default_rng(20260921)
    n = 2520
    mu, sigma = 0.07 / 252, 0.18 / math.sqrt(252)   # 7%/yr drift, 18%/yr vol, i.i.d. — no trend to time
    rets = rng.normal(mu - sigma ** 2 / 2, sigma, n)
    prices = 1000 * np.exp(np.cumsum(rets))
    d = FX / "fortuna"; d.mkdir(parents=True, exist_ok=True)
    start = np.datetime64("2016-01-04")
    days = np.busday_offset(start, np.arange(n), roll="forward")
    with open(d / "prices.csv", "w", newline="") as f:
        w = csv.writer(f); w.writerow(["date", "close"])
        for dt, p in zip(days, prices): w.writerow([str(dt), f"{p:.2f}"])
    (TR / "fortuna_truth.json").write_text(json.dumps({"process": "geometric Brownian motion, i.i.d. daily returns",
        "annual_drift": 0.07, "annual_vol": 0.18, "seed": 20260921, "note": "no serial dependence, so no timing rule has a true edge"}, indent=1))


if __name__ == "__main__":
    TR.mkdir(exist_ok=True)
    scientia(); doctrina(); fortuna()
    print("fixtures written")
