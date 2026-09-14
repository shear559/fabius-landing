"""
Exact closed-form solver for the parametric QP:

    minimize   f_t(x,y,z) = x^2 + 2y^2 + 3z^2 + xy - yz + (2-2t)x + 5y + z
    subject to x + y + z = 1,  x >= 0, y >= 0, z >= 0, x <= 3/5, 2y + z >= 1/2

for every real t in [-2, 4].  See solution.md for the full derivation and proof.

Importing this module has no side effects (no CLI, no printing, no file I/O).
"""

from fractions import Fraction
from numbers import Real

T_MIN = -2
T_MAX = 4

# Breakpoints of the piecewise-optimal solution (exact rationals).
_B1 = Fraction(-3, 2)   # -1.5
_B2 = Fraction(-1, 1)   # -1
_B3 = Fraction(-1, 2)   # -0.5
_B4 = Fraction(0, 1)    # 0
_B5 = Fraction(9, 5)    # 1.8


def _f(x, y, z, t):
    return x * x + 2 * y * y + 3 * z * z + x * y - y * z + (2 - 2 * t) * x + 5 * y + z


def _optimum(t):
    """Return (x, y, z, region, active_set) as exact Fractions."""
    if t <= _B1:
        x, y, z = Fraction(0), Fraction(1, 4), Fraction(3, 4)
        return x, y, z, 1, ("x>=0",)
    elif t <= _B2:
        x = (9 + 6 * t) / 8
        y = -(1 + t) / 2
        z = (3 - 2 * t) / 8
        return x, y, z, 2, ()
    elif t <= _B3:
        x = (5 + 2 * t) / 8
        y = Fraction(0)
        z = (3 - 2 * t) / 8
        return x, y, z, 3, ("y>=0",)
    elif t <= _B4:
        x, y, z = Fraction(1, 2), Fraction(0), Fraction(1, 2)
        return x, y, z, 4, ("y>=0", "2y+z>=1/2")
    elif t <= _B5:
        x = (9 + t) / 18
        y = t / 18
        z = (9 - 2 * t) / 18
        return x, y, z, 5, ("2y+z>=1/2",)
    else:
        x, y, z = Fraction(3, 5), Fraction(1, 10), Fraction(3, 10)
        return x, y, z, 6, ("x<=3/5", "2y+z>=1/2")


def _multipliers(t, region):
    """KKT multipliers (mu1..mu5) for x>=0, y>=0, z>=0, 3/5-x>=0, 2y+z-1/2>=0."""
    zero = Fraction(0)
    if region == 1:
        return {"mu_x": -3 - 2 * t, "mu_y": zero, "mu_z": zero, "mu_xle": zero, "mu_v": zero}
    if region == 2:
        return {"mu_x": zero, "mu_y": zero, "mu_z": zero, "mu_xle": zero, "mu_v": zero}
    if region == 3:
        return {"mu_x": zero, "mu_y": 2 + 2 * t, "mu_z": zero, "mu_xle": zero, "mu_v": zero}
    if region == 4:
        return {"mu_x": zero, "mu_y": -2 * t, "mu_z": zero, "mu_xle": zero, "mu_v": 1 + 2 * t}
    if region == 5:
        return {"mu_x": zero, "mu_y": zero, "mu_z": zero, "mu_xle": zero,
                 "mu_v": (9 + 10 * t) / 9}
    return {"mu_x": zero, "mu_y": zero, "mu_z": zero,
             "mu_xle": (10 * t - 18) / 5, "mu_v": Fraction(3)}


def solve(t):
    """
    Solve the parametric QP for a given t in [-2, 4].

    Parameters
    ----------
    t : int or float
        Parameter value, must satisfy -2 <= t <= 4.

    Returns
    -------
    dict with keys:
        x, y, z : float  -- the unique global optimizer
        value   : float  -- the optimal objective value f_t(x,y,z)
        region  : int    -- which of the 6 piecewise regions t falls in (1..6)
        active_constraints : tuple of str -- constraints active (binding) at optimum
        multipliers : dict of float -- KKT multipliers mu_x, mu_y, mu_z, mu_xle, mu_v
                      for x>=0, y>=0, z>=0, 3/5-x>=0, 2y+z-1/2>=0 respectively
    """
    if not isinstance(t, Real):
        raise TypeError("t must be an int or float")
    if isinstance(t, float):
        if t != t or t in (float("inf"), float("-inf")):
            raise ValueError("t must be finite")

    tf = Fraction(t)  # exact for any finite int/float
    if tf < T_MIN or tf > T_MAX:
        raise ValueError(f"t={t} is outside the supported interval [-2, 4]")

    x, y, z, region, active = _optimum(tf)
    value = _f(x, y, z, tf)
    mult = _multipliers(tf, region)

    return {
        "x": float(x),
        "y": float(y),
        "z": float(z),
        "value": float(value),
        "region": region,
        "active_constraints": active,
        "multipliers": {k: float(v) for k, v in mult.items()},
    }
