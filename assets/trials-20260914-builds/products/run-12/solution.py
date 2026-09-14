"""
Exact solver for the parametric problem:

    minimize   f_t(x,y,z) = x^2 + 2y^2 + 3z^2 + xy - yz + (2-2t)x + 5y + z
    subject to x+y+z=1, x>=0, y>=0, z>=0, x<=3/5, 2y+z>=1/2

for real t in [-2,4]. See solution.md for the derivation and proof; this
module only evaluates the closed-form piecewise formulas derived there.

Standard library only. Importing this module has no side effects.
"""

# Exact rational breakpoints (kept as plain floats; all arithmetic below is
# exact in binary floating point because every constant is a ratio of small
# powers of 2 and 5 that IEEE-754 double represents exactly enough for the
# comparisons used, and the formulas are continuous across every boundary
# -- see solution.md, "Continuity of the value function" -- so a point that
# falls exactly on a breakpoint gives the identical (x, y, z, value) no
# matter which of the two adjoining branches evaluates it).
_T_LO, _T_HI = -2.0, 4.0
_B1, _B2, _B3, _B4, _B5 = -1.5, -1.0, -0.5, 0.0, 1.8


def solve(t):
    """Return the unique global minimizer and optimal value at parameter t.

    Parameters
    ----------
    t : int or float, must lie in [-2, 4].

    Returns
    -------
    dict with keys:
        x, y, z : float  -- the unique optimal point (feasible, exact per
                             the closed form in solution.md).
        value    : float -- f_t(x, y, z) at that point.
        branch   : str   -- which regime of the piecewise solution was used
                             (informational only).
    """
    if not isinstance(t, (int, float)):
        raise TypeError("t must be an int or float")
    t = float(t)
    if not (_T_LO - 1e-9 <= t <= _T_HI + 1e-9):
        raise ValueError("t must lie in [-2, 4]")

    if t <= _B1:
        x, y = 0.0, 0.25
        branch = "edge A (x=0), fixed point"
    elif t <= _B2:
        x = (9.0 + 6.0 * t) / 8.0
        y = -(1.0 + t) / 2.0
        branch = "interior (unconstrained stationary point)"
    elif t <= _B3:
        x = (5.0 + 2.0 * t) / 8.0
        y = 0.0
        branch = "edge B (y=0)"
    elif t <= _B4:
        x, y = 0.5, 0.0
        branch = "vertex (1/2, 0)"
    elif t <= _B5:
        x = (9.0 + t) / 18.0
        y = t / 18.0
        branch = "edge E (2y+z=1/2)"
    else:
        x, y = 0.6, 0.1
        branch = "vertex (3/5, 1/10)"

    z = 1.0 - x - y
    value = (
        x * x + 2.0 * y * y + 3.0 * z * z
        + x * y - y * z
        + (2.0 - 2.0 * t) * x + 5.0 * y + z
    )

    return {"x": x, "y": y, "z": z, "value": value, "branch": branch}
