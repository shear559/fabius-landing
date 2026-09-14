"""Exact-regime solver for the constrained quadratic, -2 <= t <= 4.

solve(t) returns floating-point x, y, z, and the optimal value. Branches
use exact comparisons with the transition constants, without tolerances.
Importing this module has no side effects. See solution.md for the proof.
"""


def solve(t):
    """Return the unique optimizer and optimal value for an int or float t.

    Raise TypeError for other types, and ValueError for nonfinite or
    out-of-interval inputs. Results are subject to ordinary float rounding.
    """
    if not isinstance(t, (int, float)):
        raise TypeError("t must be an int or float")
    if not -2 <= t <= 4:
        raise ValueError("t must be finite and in [-2, 4]")
    t = float(t)

    if t <= -1.5:
        x, y, z = 0.0, 0.25, 0.75
        value = 29.0 / 8.0
    elif t <= -1.0:
        # Shifted formulas avoid cancellation in x near t = -3/2.
        u = t + 1.5
        x, y, z = 0.75 * u, -0.5 * (t + 1.0), 0.75 - 0.25 * u
        value = 29.0 / 8.0 - 0.75 * u * u
    elif t <= -0.5:
        u = t + 1.0
        x, y, z = 0.375 + 0.25 * u, 0.0, 0.625 - 0.25 * u
        value = 4.0 - (5.0 + 2.0 * t) ** 2 / 16.0
    elif t <= 0.0:
        x, y, z = 0.5, 0.0, 0.5
        value = 2.5 - t
    elif t < 1.8:
        u = t / 18.0
        x, y, z = 0.5 + u, u, 0.5 - 2.0 * u
        value = 2.5 - t - t * t / 18.0
    else:
        x, y, z = 0.6, 0.1, 0.3
        value = 67.0 / 25.0 - 6.0 * t / 5.0

    return {"x": x, "y": y, "z": z, "value": value}
