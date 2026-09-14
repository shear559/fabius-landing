"""
Exact closed-form solver for the parametric QP:

    minimize   f_t(x,y,z) = x^2 + 2y^2 + 3z^2 + xy - yz + (2-2t)x + 5y + z
    subject to x + y + z = 1,
               x >= 0, y >= 0, z >= 0,
               x <= 3/5,
               2y + z >= 1/2

for t in [-2, 4].  See solution.md for the full derivation and proof of
global optimality/uniqueness.

Standard library only.  Importing this module has no side effects: no
CLI, no printing, no file access.  Run `python3 solution.py` directly
to execute the small self-check under `if __name__ == "__main__"`.
"""
import math
from fractions import Fraction

# Exact rational breakpoints of the piecewise optimizer, increasing order.
_T2 = Fraction(-3, 2)   # -1.5
_T3 = Fraction(-1, 1)   # -1
_T4 = Fraction(-1, 2)   # -0.5
_T5 = Fraction(0, 1)    #  0
_T6 = Fraction(9, 5)    #  1.8


def _to_fraction(t):
    """Exact Fraction for an int or float t (uses the float's exact
    binary value, so results agree with float arithmetic to full
    precision while avoiding rounding error inside the formulas)."""
    if isinstance(t, bool):
        raise TypeError("t must be int or float, not bool")
    if isinstance(t, int):
        return Fraction(t)
    if isinstance(t, float):
        if not math.isfinite(t):
            raise ValueError("t must be finite")
        return Fraction(*t.as_integer_ratio())
    raise TypeError("t must be int or float")


def _optimizer(tf):
    """tf: Fraction in [-2, 4]. Returns (x, y, z) as Fractions."""
    if tf <= _T2:
        # t in [-2, -3/2]: interior point of edge x=0 (constant in t)
        return Fraction(0, 1), Fraction(1, 4), Fraction(3, 4)
    if tf <= _T3:
        # t in [-3/2, -1]: interior of the feasible polygon
        x = (9 + 6 * tf) / 8
        y = -(1 + tf) / 2
        z = (3 - 2 * tf) / 8
        return x, y, z
    if tf <= _T4:
        # t in [-1, -1/2]: edge y = 0
        x = (5 + 2 * tf) / 8
        y = Fraction(0, 1)
        z = (3 - 2 * tf) / 8
        return x, y, z
    if tf <= _T5:
        # t in [-1/2, 0]: vertex (1/2, 0, 1/2)
        return Fraction(1, 2), Fraction(0, 1), Fraction(1, 2)
    if tf <= _T6:
        # t in [0, 9/5]: edge 2y + z = 1/2  (y = x - 1/2)
        x = (9 + tf) / 18
        y = tf / 18
        z = (9 - 2 * tf) / 18
        return x, y, z
    # t in [9/5, 4]: vertex (3/5, 1/10, 3/10)
    return Fraction(3, 5), Fraction(1, 10), Fraction(3, 10)


def _piece_info(tf):
    if tf <= _T2:
        return "edge x=0", ("x>=0",)
    if tf <= _T3:
        return "interior", ()
    if tf <= _T4:
        return "edge y=0", ("y>=0",)
    if tf <= _T5:
        return "vertex (1/2,0,1/2)", ("y>=0", "2y+z>=1/2")
    if tf <= _T6:
        return "edge 2y+z=1/2", ("2y+z>=1/2",)
    return "vertex (3/5,1/10,3/10)", ("x<=3/5", "2y+z>=1/2")


def solve(t):
    """
    Solve the parametric QP for a given t in [-2, 4].

    Parameters
    ----------
    t : int or float
        Parameter value, must lie in [-2, 4] (a tiny floating tolerance
        is accepted right at the domain edge and then clamped).

    Returns
    -------
    dict with keys:
        x, y, z : float -- the unique optimizer
        value   : float -- the optimal objective value f_t(x,y,z)
        active  : tuple of str -- names of the active inequality constraints
        piece   : str    -- which regime of the piecewise solution applies
    """
    tf_raw = _to_fraction(t)
    lo, hi = Fraction(-2), Fraction(4)
    tol = Fraction(1, 10**9)
    if tf_raw < lo - tol or tf_raw > hi + tol:
        raise ValueError("t must lie in [-2, 4]")
    tf = min(max(tf_raw, lo), hi)

    x, y, z = _optimizer(tf)
    piece, active = _piece_info(tf)

    xf, yf, zf, tfloat = float(x), float(y), float(z), float(tf)
    value = (
        xf * xf + 2 * yf * yf + 3 * zf * zf
        + xf * yf - yf * zf
        + (2 - 2 * tfloat) * xf + 5 * yf + zf
    )

    return {
        "x": xf,
        "y": yf,
        "z": zf,
        "value": value,
        "active": active,
        "piece": piece,
    }


if __name__ == "__main__":
    # Minimal self-check when run directly (this block does not execute
    # on import).
    for tt in (-2, -1.5, -1, -0.5, 0, 1.8, 4, -1.75, -1.25, -0.75, -0.25, 0.9, 3):
        print(tt, solve(tt))
