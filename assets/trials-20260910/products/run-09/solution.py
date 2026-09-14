"""Unique minimizer of the stated quadratic program for -2 <= t <= 4.

No third-party dependencies. See solution.md for the exact formulas and proof.
"""

import math


def solve(t):
    """Return finite float entries x, y, z, value for an int or float t.

    Raise TypeError for other types (including bool), or ValueError for a
    nonfinite or out-of-range parameter. Floating-point results have ordinary
    binary64 rounding error; branch selection uses no tolerance band.
    """
    if isinstance(t, bool) or not isinstance(t, (int, float)):
        raise TypeError("t must be an int or float")
    if not -2 <= t <= 4:
        raise ValueError("t must be finite and in [-2, 4]")
    t = float(t)

    if t <= -1.5:
        x, y, z = 0.0, 0.25, 0.75
    elif t <= -1.0:
        # Shifted expressions preserve small positive coordinates near a knot.
        x = 0.75 * (t + 1.5)
        y = -0.5 * (t + 1.0)
        z = 1.0 - x - y
    elif t <= -0.5:
        x = 0.375 + 0.25 * (t + 1.0)
        y = 0.0
        z = 1.0 - x
    elif t <= 0.0:
        x, y, z = 0.5, 0.0, 0.5
    elif t < 1.8:
        y = t / 18.0
        x = 0.5 + y
        z = 1.0 - x - y
    else:
        x, y, z = 0.6, 0.1, 0.3

    value = math.fsum((
        x * x, 2.0 * y * y, 3.0 * z * z, x * y, -y * z,
        (2.0 - 2.0 * t) * x, 5.0 * y, z,
    ))
    return {"x": x, "y": y, "z": z, "value": value}
