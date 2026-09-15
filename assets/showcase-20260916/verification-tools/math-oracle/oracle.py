"""Private stdlib exact geometric oracle; independent of the piecewise answer.

After eliminating z=1-x-y, enumerate feasible vertices, the stationary
point on every supporting line, and the unconstrained stationary point.
Strict convexity makes the least-valued feasible candidate the unique answer.
No formula from reference.json is used in this module.
"""

from fractions import Fraction as F
from itertools import combinations

LOWER = F(-2)
UPPER = F(4)
CONSTRAINTS = (
    ("x_nonnegative", F(-1), F(0), F(0)),
    ("y_nonnegative", F(0), F(-1), F(0)),
    ("z_nonnegative", F(1), F(1), F(1)),
    ("x_cap", F(1), F(0), F(3, 5)),
    ("slanted", F(1), F(-1), F(1, 2)),
)


def feasible(x, y):
    return all(a*x + b*y <= c for _, a, b, c in CONSTRAINTS)


def objective(t, x, y):
    return 4*x*x + 8*x*y + 6*y*y - (5 + 2*t)*x - 3*y + 4


def vertices():
    result = set()
    for first, second in combinations(CONSTRAINTS, 2):
        _, a, b, c = first
        _, d, e, f = second
        determinant = a*e - b*d
        if determinant:
            x = (c*e - b*f) / determinant
            y = (a*f - c*d) / determinant
            if feasible(x, y):
                result.add((x, y))
    return tuple(sorted(result))


VERTICES = vertices()


def solve(t):
    """Return exact Fraction values for a rational parameter in [-2,4]."""
    if isinstance(t, bool):
        raise TypeError("A boolean is not a parameter")
    t = F(t)
    if not LOWER <= t <= UPPER:
        raise ValueError("t must lie in [-2,4]")
    linear_x, linear_y = 5 + 2*t, F(3)
    candidates = set(VERTICES)
    # Solve H p = (linear_x, linear_y) with H=[[8,8],[8,12]].
    interior = ((12*linear_x - 8*linear_y)/32,
                (-8*linear_x + 8*linear_y)/32)
    if feasible(*interior):
        candidates.add(interior)
    for _, a, b, c in CONSTRAINTS:
        px, py = (c/a, F(0)) if a else (F(0), c/b)
        dx, dy = -b, a
        gx = 8*px + 8*py - linear_x
        gy = 8*px + 12*py - linear_y
        curvature = 8*dx*dx + 16*dx*dy + 12*dy*dy
        shift = -(gx*dx + gy*dy) / curvature
        point = (px + shift*dx, py + shift*dy)
        if feasible(*point):
            candidates.add(point)
    values = [(objective(t, x, y), x, y) for x, y in candidates]
    value, x, y = min(values)
    # Duplicate representations of one minimum are merged by the candidate set.
    assert sum(v == value for v, _, _ in values) == 1
    return {"x": x, "y": y, "z": 1-x-y, "value": value}


if __name__ == "__main__":
    import argparse
    import json
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("t", help="Exact rational, e.g. -3/2 or 9/5")
    parameter = parser.parse_args().t
    print(json.dumps({key: str(value) for key, value in solve(parameter).items()}, indent=2))
