"""Independent exact geometry, symbolic reference, and scorer failure checks."""

import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from fractions import Fraction as F

ROOT = Path(__file__).resolve().parent


def load(name):
    specification = importlib.util.spec_from_file_location(name, ROOT / (name + ".py"))
    module = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(module)
    return module


oracle = load("oracle")
scorer = load("score")
REFERENCE = json.loads((ROOT / "reference.json").read_text())
REGIMES = REFERENCE["regimes"]
FIELDS = ("x", "y", "z", "value", "nu", "lambda_x", "lambda_y", "lambda_z", "lambda_cap", "lambda_slant")


def polynomial(coefficients, t):
    return sum(F(coefficient) * t**power for power, coefficient in enumerate(coefficients))


def reference(t, regime=None):
    if regime is None:
        regime = next(row for row in REGIMES if F(row["interval"][0]) <= t <= F(row["interval"][1]))
    return {field: polynomial(regime[field], t) for field in FIELDS}


class OracleTests(unittest.TestCase):
    def test_polygon_vertices(self):
        self.assertEqual(set(oracle.VERTICES), {
            (F(0), F(0)), (F(0), F(1)), (F(1, 2), F(0)),
            (F(3, 5), F(1, 10)), (F(3, 5), F(2, 5)),
        })

    def test_reduction_agrees_with_original_objective(self):
        for x, y in [(F(-3, 7), F(5, 9)), (F(1, 10), F(2, 7)), (F(3, 5), F(1, 10))]:
            z = 1-x-y
            for t in (F(-2), F(-13, 8), F(9, 5), F(4)):
                original = x*x+2*y*y+3*z*z+x*y-y*z+(2-2*t)*x+5*y+z
                self.assertEqual(original, oracle.objective(t, x, y))

    def test_exact_geometric_oracle_against_reference_on_fine_grid(self):
        for index in range(6001):
            t = F(-2) + F(index, 1000)
            actual = oracle.solve(t)
            expected = reference(t)
            self.assertEqual(actual, {key: expected[key] for key in actual}, str(t))

    def test_exact_geometric_oracle_around_every_transition(self):
        for breakpoint in REFERENCE["breakpoints"]:
            for delta in (F(-1, 10**12), F(0), F(1, 10**12)):
                t = F(breakpoint) + delta
                actual, expected = oracle.solve(t), reference(t)
                self.assertEqual(actual, {key: expected[key] for key in actual}, str(t))

    def test_kkt_on_closed_intervals_exactly(self):
        for regime in REGIMES:
            left, right = map(F, regime["interval"])
            for step in range(101):
                t = left + F(step, 100)*(right-left)
                row = reference(t, regime)
                x, y, z, nu = (row[name] for name in ("x", "y", "z", "nu"))
                multipliers = [row[name] for name in ("lambda_x", "lambda_y", "lambda_z", "lambda_cap", "lambda_slant")]
                constraints = [-x, -y, -z, x-F(3, 5), F(1, 2)-2*y-z]
                self.assertEqual(x+y+z, 1)
                self.assertTrue(all(value <= 0 for value in constraints))
                self.assertTrue(all(value >= 0 for value in multipliers))
                self.assertEqual([a*b for a, b in zip(multipliers, constraints)], [0]*5)
                self.assertEqual(2*x+y+2-2*t+nu-row["lambda_x"]+row["lambda_cap"], 0)
                self.assertEqual(4*y+x-z+5+nu-row["lambda_y"]-2*row["lambda_slant"], 0)
                self.assertEqual(6*z-y+1+nu-row["lambda_z"]-row["lambda_slant"], 0)
                self.assertEqual(oracle.objective(t, x, y), row["value"])

    def test_closed_boundary_formulas_match_including_multipliers(self):
        for left, right in zip(REGIMES, REGIMES[1:]):
            t = F(left["interval"][1])
            self.assertEqual(t, F(right["interval"][0]))
            self.assertEqual(reference(t, left), reference(t, right))

    def test_value_envelope_derivative_and_concavity(self):
        last_derivative = None
        for regime in REGIMES:
            coefficients = [F(value) for value in regime["value"]]
            derivative = [index*value for index, value in enumerate(coefficients)][1:]
            expected = [-2*F(value) for value in regime["x"]]
            derivative += [F(0)] * max(0, len(expected)-len(derivative))
            expected += [F(0)] * max(0, len(derivative)-len(expected))
            self.assertEqual(derivative, expected)
            second = 2*coefficients[2] if len(coefficients) > 2 else 0
            self.assertLessEqual(second, 0)
            left, right = map(F, regime["interval"])
            if last_derivative is not None:
                self.assertEqual(last_derivative, polynomial(derivative, left))
            last_derivative = polynomial(derivative, right)

    def test_reject_out_of_domain_and_boolean_oracle_inputs(self):
        for t in (F(-2001, 1000), F(4001, 1000)):
            with self.assertRaises(ValueError):
                oracle.solve(t)
        with self.assertRaises(TypeError):
            oracle.solve(True)


class ScorerTests(unittest.TestCase):
    def candidate_report(self, code, timeout=60):
        with tempfile.TemporaryDirectory(dir=ROOT, prefix="_scorer_fixture_") as directory:
            candidate = Path(directory) / "solution.py"
            candidate.write_text(code)
            return scorer.score(candidate, timeout)

    def test_samples_cover_boundaries_and_every_regime(self):
        cases = scorer.cases()
        exact = {F(sample["exact_parameter"]) for sample in cases}
        self.assertTrue(set(map(F, REFERENCE["breakpoints"])) <= exact)
        self.assertIn(F(-2), exact)
        self.assertIn(F(4), exact)
        for regime in REGIMES:
            left, right = map(F, regime["interval"])
            self.assertGreaterEqual(sum(left < t < right for t in exact), 3)

    def test_correct_formula_candidate_passes_with_extra_keys(self):
        rows = [{key: row[key] for key in ("interval", "x", "y", "z", "value")} for row in REGIMES]
        code = "from fractions import Fraction as F\nROWS = " + repr(rows) + "\n" + '''
def solve(t):
    t = F(t)
    row = next(row for row in ROWS if F(row['interval'][0]) <= t <= F(row['interval'][1]))
    result = {name: sum(F(value)*t**i for i,value in enumerate(row[name])) for name in ('x','y','z','value')}
    result['extra_certificate'] = 'permitted'
    return result
'''
        result = self.candidate_report(code)
        self.assertTrue(result["passed"])
        self.assertEqual(result["passed_samples"], result["total_samples"])

    def test_nan_bool_text_missing_values_and_exceptions_fail(self):
        snippets = (
            "return {'x':float('nan'),'y':0,'z':1,'value':4}",
            "return {'x':True,'y':0,'z':0,'value':4}",
            "return {'x':'0','y':0,'z':1,'value':4}",
            "return {'x':0,'y':0,'z':1}",
            "raise RuntimeError('candidate failure')",
        )
        for snippet in snippets:
            result = self.candidate_report("def solve(t):\n    " + snippet + "\n")
            self.assertFalse(result["passed"])
            self.assertEqual(result["passed_samples"], 0)

    def test_feasible_but_suboptimal_candidate_fails(self):
        result = self.candidate_report("def solve(t):\n    return dict(x=0, y=0, z=1, value=4)\n")
        self.assertFalse(result["passed"])
        self.assertEqual(result["passed_samples"], 0)

    def test_reported_value_must_match_its_coordinates_and_optimum(self):
        for t in (-1.75, -1.25, -0.75, -0.25, 1.0, 3.0):
            output = {key: float(value) for key, value in oracle.solve(t).items()}
            self.assertTrue(scorer.check_output(t, output)["passed"])
            output["value"] += 0.01
            self.assertFalse(scorer.check_output(t, output)["passed"])

    def test_import_error_is_a_failure(self):
        result = self.candidate_report("raise RuntimeError('import failure')\n")
        self.assertFalse(result["passed"])
        self.assertIn("import failure", result["run_error"])

    def test_timeout_is_a_failure(self):
        result = self.candidate_report("while True:\n    pass\n", timeout=0.2)
        self.assertFalse(result["passed"])
        self.assertIn("timeout", result["run_error"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
