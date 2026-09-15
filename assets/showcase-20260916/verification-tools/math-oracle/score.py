"""Numerical score for ONE parametric optimization task sampled repeatedly.

Usage: python3 -I -S -B score.py /absolute/path/solution.py --output report.json
The exact oracle computes its answer at the actual binary float supplied to
the candidate. Fractions below also label the intended exact boundary probes.
"""

import argparse
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import random
import subprocess
import sys
from fractions import Fraction as F

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("private_geometric_oracle", ROOT / "oracle.py")
oracle = importlib.util.module_from_spec(spec)
spec.loader.exec_module(oracle)
BREAKPOINTS = (F(-3, 2), F(-1), F(-1, 2), F(0), F(9, 5))
COORDINATE_TOLERANCE = 1e-8
VALUE_TOLERANCE = 1e-8
SEED = 20260910


def cases():
    selected = {}
    def add(value, family):
        selected.setdefault(value, set()).add(family)
    add(F(-2), "domain_endpoint")
    add(F(4), "domain_endpoint")
    for value in BREAKPOINTS:
        add(value, "exact_breakpoint")
        for offset in (F(1, 10**2), F(1, 10**5), F(1, 10**9)):
            for direction in (-1, 1):
                add(value + direction*offset, "breakpoint_neighbour")
    boundaries = (F(-2),) + BREAKPOINTS + (F(4),)
    for left, right in zip(boundaries, boundaries[1:]):
        for weight in (F(1, 7), F(1, 2), F(6, 7)):
            add(left + weight*(right-left), "regime_interior")
    for index in range(601):
        add(F(-2) + F(index, 100), "regular_grid")
    rng = random.Random(SEED)
    for _ in range(600):
        add(F(-2) + F(rng.randrange(0, 6_000_001), 1_000_000), "seeded_rational")
    return [{"exact_parameter": str(value), "t": float(value), "families": sorted(families)}
            for value, families in sorted(selected.items())]


def check_output(parameter, output):
    """Check feasibility, unique optimizer, and independently recomputed value."""
    exact = oracle.solve(F.from_float(parameter))
    x, y, z, value = (output[name] for name in ("x", "y", "z", "value"))
    if not all(math.isfinite(v) for v in (x, y, z, value)):
        return {"passed": False, "failures": ["nonfinite"]}
    violations = {
        "simplex_equality": abs(x+y+z-1),
        "x_nonnegative": max(0.0, -x),
        "y_nonnegative": max(0.0, -y),
        "z_nonnegative": max(0.0, -z),
        "x_cap": max(0.0, x-0.6),
        "slanted": max(0.0, 0.5-2*y-z),
    }
    coordinate_errors = {key: abs(output[key]-float(exact[key])) for key in ("x", "y", "z")}
    actual_objective = x*x + 2*y*y + 3*z*z + x*y-y*z + (2-2*parameter)*x + 5*y + z
    expected_value = float(exact["value"])
    scale = max(1.0, abs(expected_value), abs(actual_objective))
    value_errors = {"against_optimum": abs(value-expected_value),
                    "against_returned_coordinates": abs(value-actual_objective)}
    failures = ["constraint:"+key for key, error in violations.items() if error > COORDINATE_TOLERANCE]
    failures += ["coordinate:"+key for key, error in coordinate_errors.items() if error > COORDINATE_TOLERANCE]
    failures += ["value:"+key for key, error in value_errors.items() if error > VALUE_TOLERANCE*scale]
    return {"passed": not failures, "failures": failures,
            "max_constraint_violation": max(violations.values()),
            "max_coordinate_error": max(coordinate_errors.values()),
            "max_value_error": max(value_errors.values()),
            "expected": {key: str(value) for key, value in exact.items()}}


def score(candidate, timeout=60):
    samples = cases()
    candidate = Path(candidate).resolve()
    metadata = {
        "benchmark": "parametric-convex-qp-six-regimes-v1",
        "independent_math_tasks": 1,
        "candidate_sha256": hashlib.sha256(candidate.read_bytes()).hexdigest(),
        "oracle_sha256": hashlib.sha256((ROOT / "oracle.py").read_bytes()).hexdigest(),
        "scorer_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "seed": SEED,
        "tolerances": {"coordinate_and_constraint_absolute": COORDINATE_TOLERANCE,
                       "value_scaled_absolute": VALUE_TOLERANCE},
        "total_samples": len(samples),
        "proof_assessment": "Separate blinded rubric required; numeric agreement is not a proof.",
    }
    try:
        process = subprocess.run([sys.executable, "-I", "-S", "-B", str(ROOT / "candidate_runner.py"), str(candidate)],
                                 input=json.dumps([sample["t"] for sample in samples]),
                                 capture_output=True, text=True, timeout=timeout, cwd=candidate.parent)
    except subprocess.TimeoutExpired:
        return {**metadata, "passed": False, "passed_samples": 0, "run_error": "Candidate exceeded timeout"}
    try:
        response = json.loads(process.stdout)
    except (ValueError, TypeError):
        return {**metadata, "passed": False, "passed_samples": 0,
                "run_error": "Runner did not return valid JSON", "exit_code": process.returncode,
                "stderr_excerpt": process.stderr[:500]}
    if process.returncode or "import_error" in response or len(response.get("results", [])) != len(samples):
        return {**metadata, "passed": False, "passed_samples": 0,
                "run_error": response.get("import_error", "Runner result count or exit status invalid")}
    results = []
    for sample, result in zip(samples, response["results"]):
        checked = check_output(sample["t"], result["output"]) if result["ok"] else {
            "passed": False, "failures": [result["error"]]}
        results.append({**sample, **checked, **({"output": result["output"]} if result["ok"] else {})})
    passed = sum(result["passed"] for result in results)
    families = {}
    for result in results:
        for family in result["families"]:
            count = families.setdefault(family, {"samples": 0, "passed": 0})
            count["samples"] += 1
            count["passed"] += result["passed"]
    return {**metadata, "passed": passed == len(results), "passed_samples": passed,
            "sample_families_overlap": True, "families": families,
            "max_coordinate_error": max((row.get("max_coordinate_error", 0) for row in results), default=None),
            "max_constraint_violation": max((row.get("max_constraint_violation", 0) for row in results), default=None),
            "max_value_error": max((row.get("max_value_error", 0) for row in results), default=None),
            "results": results}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("candidate")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--timeout", type=float, default=60)
    args = parser.parse_args()
    report = score(args.candidate, args.timeout)
    encoded = json.dumps(report, indent=2, allow_nan=False) + "\n"
    if args.output:
        args.output.write_text(encoded)
    summary = {key: value for key, value in report.items() if key != "results"}
    print(json.dumps(summary, indent=2))
    raise SystemExit(0 if report["passed"] else 1)
