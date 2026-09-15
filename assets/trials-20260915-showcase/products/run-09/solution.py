"""
solve(t) -- exact closed-form solution of the parametric QP

    minimize   f_t(x,y,z) = x^2 + 2y^2 + 3z^2 + xy - yz + (2-2t)x + 5y + z
    subject to x + y + z = 1,  x,y,z >= 0,  x <= 3/5,  2y + z >= 1/2

for t in [-2, 4].  Standard library only (fractions.Fraction is used for
exact rational arithmetic; the returned dict also carries float versions).

The parameter interval [-2, 4] splits into six closed regimes, derived by
projecting out z = 1-x-y and tracking the active-set changes of the
resulting 2D convex QP (see solution.md for the full derivation/proof):

  1. t in [-2 , -3/2]           : active {x=0}                 (edge, interior)
  2. t in [-3/2, -1]            : interior (no inequality active)
  3. t in [-1  , -1/2]          : active {y=0}                 (edge, interior)
  4. t in [-1/2, 0]              : vertex, active {y=0, 2y+z=1/2}
  5. t in [0   , 9/5]           : active {2y+z=1/2}            (edge, interior)
  6. t in [9/5 , 4]              : vertex, active {x=3/5, 2y+z=1/2}

Each regime boundary is where a KKT multiplier crosses zero; the regimes
are listed as closed intervals and agree exactly at every shared endpoint.
"""

from fractions import Fraction as Fr

_T_MIN, _T_MAX = Fr(-2), Fr(4)

# Regime boundaries (exact).
_B1, _B2, _B3, _B4, _B5 = Fr(-3, 2), Fr(-1), Fr(-1, 2), Fr(0), Fr(9, 5)


def _f(t, x, y, z):
    """Exact value of f_t(x,y,z) using Fraction arithmetic."""
    return (x**2 + 2 * y**2 + 3 * z**2 + x * y - y * z
            + (2 - 2 * t) * x + 5 * y + z)


def solve(t):
    """
    Solve the parametric QP for a given t in [-2, 4].

    Parameters
    ----------
    t : int or float
        Parameter value, must lie in [-2, 4] (a small floating tolerance
        is allowed at the endpoints).

    Returns
    -------
    dict with keys:
        x, y, z   : optimal point (finite floats)
        value     : optimal objective value f_t(x,y,z) (finite float)
        regime    : integer 1..6 identifying the active regime (see module
                    docstring)
        active    : tuple of strings naming the active inequality
                    constraints at the optimum
        multipliers : dict of the (non-negative) KKT multipliers of the
                    active inequality constraints, keyed by constraint name
    """
    if not isinstance(t, (int, float)):
        raise TypeError("t must be an int or float")
    if not (t == t) or t in (float("inf"), float("-inf")):
        raise ValueError("t must be finite")

    tf = Fr(t)

    tol = Fr(1, 10 ** 9)
    if tf < _T_MIN - tol or tf > _T_MAX + tol:
        raise ValueError("t must lie in [-2, 4]")
    # Clamp tiny numerical overshoot at the domain endpoints.
    if tf < _T_MIN:
        tf = _T_MIN
    if tf > _T_MAX:
        tf = _T_MAX

    if tf <= _B1:
        regime = 1
        x, y = Fr(0), Fr(1, 4)
        active = ("x>=0",)
        lam = {"x>=0": -3 - 2 * tf}
    elif tf <= _B2:
        regime = 2
        x = (9 + 6 * tf) / 8
        y = -(1 + tf) / 2
        active = ()
        lam = {}
    elif tf <= _B3:
        regime = 3
        x = (5 + 2 * tf) / 8
        y = Fr(0)
        active = ("y>=0",)
        lam = {"y>=0": 2 + 2 * tf}
    elif tf <= _B4:
        regime = 4
        x, y = Fr(1, 2), Fr(0)
        active = ("y>=0", "2y+z>=1/2")
        lam = {"2y+z>=1/2": 1 + 2 * tf, "y>=0": -2 * tf}
    elif tf <= _B5:
        regime = 5
        x = (9 + tf) / 18
        y = tf / 18
        active = ("2y+z>=1/2",)
        lam = {"2y+z>=1/2": 1 + 10 * tf / 9}
    else:
        regime = 6
        x, y = Fr(3, 5), Fr(1, 10)
        active = ("x<=3/5", "2y+z>=1/2")
        lam = {"2y+z>=1/2": Fr(3), "x<=3/5": 2 * tf - Fr(18, 5)}

    z = 1 - x - y
    value = _f(tf, x, y, z)

    return {
        "x": float(x),
        "y": float(y),
        "z": float(z),
        "value": float(value),
        "regime": regime,
        "active": active,
        "multipliers": {k: float(v) for k, v in lam.items()},
    }
