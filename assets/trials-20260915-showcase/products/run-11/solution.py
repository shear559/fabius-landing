"""
Exact solver for the parametric QP:

    minimize  f_t(x,y,z) = x^2 + 2y^2 + 3z^2 + xy - yz + (2-2t)x + 5y + z
    subject to x + y + z = 1,  x >= 0, y >= 0, z >= 0,
               x <= 3/5,  2y + z >= 1/2

for real t in [-2, 4].  See solution.md for the derivation and proof.

Standard library only.  Importing this module has no side effects
(no CLI, no printing, no file I/O).
"""

from fractions import Fraction

T_MIN = Fraction(-2)
T_MAX = Fraction(4)


def _f(x, y, z, t):
    return (
        x * x + 2 * y * y + 3 * z * z
        + x * y - y * z
        + (2 - 2 * t) * x + 5 * y + z
    )


def solve(t):
    """Return the exact global minimizer/minimum of f_t on the feasible set.

    Parameters
    ----------
    t : int or float
        Parameter, must lie in [-2, 4].

    Returns
    -------
    dict with keys:
        x, y, z : float   -- the unique optimal point
        value    : float  -- f_t(x, y, z)
        regime   : str    -- label of the active regime (A..F)
        active   : tuple  -- names of the active inequality constraints
                              among {'x>=0','y>=0','z>=0','x<=3/5','2y+z>=1/2'}
    """
    if not isinstance(t, (int, float)):
        raise TypeError("t must be an int or float")
    if not (T_MIN <= t <= T_MAX):
        raise ValueError("t must lie in [-2, 4]")

    tf = Fraction(t).limit_denominator(10 ** 9) if isinstance(t, float) else Fraction(t)

    if tf <= Fraction(-3, 2):
        x, y = Fraction(0), Fraction(1, 4)
        regime, active = "A", ("x>=0",)
    elif tf <= Fraction(-1):
        x = (9 + 6 * tf) / 8
        y = -(1 + tf) / 2
        regime, active = "B", ()
    elif tf <= Fraction(-1, 2):
        x = (5 + 2 * tf) / 8
        y = Fraction(0)
        regime, active = "C", ("y>=0",)
    elif tf <= Fraction(0):
        x, y = Fraction(1, 2), Fraction(0)
        regime, active = "D", ("y>=0", "2y+z>=1/2")
    elif tf <= Fraction(9, 5):
        x = (9 + tf) / 18
        y = tf / 18
        regime, active = "E", ("2y+z>=1/2",)
    else:
        x, y = Fraction(3, 5), Fraction(1, 10)
        regime, active = "F", ("x<=3/5", "2y+z>=1/2")

    z = 1 - x - y
    value = _f(x, y, z, tf)

    return {
        "x": float(x),
        "y": float(y),
        "z": float(z),
        "value": float(value),
        "regime": regime,
        "active": active,
    }
