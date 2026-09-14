"""Exact-regime solution of the constrained quadratic problem on -2 <= t <= 4.

Only floating-point evaluation is used here; the exact derivation and
certificates are in solution.md. Importing this module has no side effects.
"""

import math


def solve(t):
    """Return numeric x, y, z and value for an int or float parameter t.

    Raise TypeError for other types and ValueError for nonfinite or
    out-of-interval parameters. Results have ordinary float precision.
    """
    if not isinstance(t, (int, float)):
        raise TypeError("t must be an int or float")
    if not -2 <= t <= 4:
        raise ValueError("t must be finite and in [-2, 4]")
    t = float(t)

    if t <= -1.5:
        x, y, z = 0.0, 0.25, 0.75
    elif t <= -1.0:
        # Shifted expressions preserve accuracy near the zero coordinates.
        x = 0.75 * (t + 1.5)
        y = -0.5 * (t + 1.0)
        z = 1.0 - x - y
    elif t <= -0.5:
        x = (5.0 + 2.0 * t) / 8.0
        y, z = 0.0, 1.0 - x
    elif t <= 0.0:
        x, y, z = 0.5, 0.0, 0.5
    elif t < 1.8:
        y = t / 18.0
        x, z = 0.5 + y, 0.5 - 2.0 * y
    else:
        x, y, z = 0.6, 0.1, 0.3

    value = math.fsum((
        x * x, 2.0 * y * y, 3.0 * z * z, x * y, -y * z,
        (2.0 - 2.0 * t) * x, 5.0 * y, z,
    ))
    return {"x": x, "y": y, "z": z, "value": value}
