"""Exact six-regime optimizer evaluated in floating-point arithmetic.

The derivation and KKT certificate are in solution.md. No import side effects.
"""
import math


def solve(t):
    if isinstance(t, bool) or not isinstance(t, (int, float)):
        raise TypeError("t must be a real int or float")
    if not math.isfinite(t) or not -2 <= t <= 4:
        raise ValueError("t must be finite and in [-2, 4]")
    if t <= -1.5:
        x, y, z = 0.0, 0.25, 0.75
        regime = 0
    elif t <= -1:
        x, y, z = 9/8 + 3*t/4, -1/2 - t/2, 3/8 - t/4
        regime = 1
    elif t <= -0.5:
        x, y, z = 5/8 + t/4, 0.0, 3/8 - t/4
        regime = 2
    elif t <= 0:
        x, y, z = 0.5, 0.0, 0.5
        regime = 3
    elif t <= 1.8:
        x, y, z = 1/2 + t/18, t/18, 1/2 - t/9
        regime = 4
    else:
        x, y, z = 0.6, 0.1, 0.3
        regime = 5
    value = x*x + 2*y*y + 3*z*z + x*y - y*z + (2-2*t)*x + 5*y + z
    return dict(x=x, y=y, z=z, value=value, regime=regime+1)
