"""
Exact solution of the parametric QP

    minimize    f_t(x, y, z) = x^2 + 2y^2 + 3z^2 + xy - yz + (2 - 2t)x + 5y + z
    subject to  x + y + z = 1
                x >= 0, y >= 0, z >= 0
                x <= 3/5
                2y + z >= 1/2

for every real t in [-2, 4].

See solution.md for the full derivation and proof. In summary: eliminating
z = 1 - x - y turns this into a strictly convex QP in (x, y) over a fixed
pentagon (independent of t). The unique global minimizer, as a function of
t, moves along a fixed path across six regions of [-2, 4]:

    t in [-2,   -3/2]:  interior-of-edge point (x, y) = (0,   1/4)   [x=0 active]
    t in [-3/2, -1  ]:  interior of the pentagon (unconstrained critical point)
    t in [-1,   -1/2]:  interior of edge y = 0
    t in [-1/2,  0  ]:  vertex (1/2, 0)
    t in [0,     9/5]:  interior of edge 2y + z = 1/2  (y = x - 1/2)
    t in [9/5,   4  ]:  vertex (3/5, 1/10)

This module is import-safe: importing it runs no CLI, prints nothing, and
touches no external files.
"""

from numbers import Real

__all__ = ["solve"]

# Exact rational breakpoints of the parameter t.
_T1 = -1.5   # -3/2
_T2 = -1.0
_T3 = -0.5
_T4 = 0.0
_T5 = 1.8    # 9/5

_LO, _HI = -2.0, 4.0


def _xy(t):
    """Return (x, y, region_label) for the unique optimizer at parameter t."""
    if t <= _T1:
        return 0.0, 0.25, "edge x=0"
    if t <= _T2:
        return 0.75 * t + 1.125, -0.5 * t - 0.5, "interior"
    if t <= _T3:
        return (5.0 + 2.0 * t) / 8.0, 0.0, "edge y=0"
    if t <= _T4:
        return 0.5, 0.0, "vertex (1/2,0)"
    if t <= _T5:
        return 0.5 + t / 18.0, t / 18.0, "edge 2y+z=1/2"
    return 0.6, 0.1, "vertex (3/5,1/10)"


def solve(t):
    """
    Solve the parametric constrained QP at parameter ``t``.

    Parameters
    ----------
    t : int or float
        Parameter value, must lie in [-2, 4] (the boundary is included; a
        small floating-point slack is tolerated).

    Returns
    -------
    dict with keys:
        x, y, z : float   the unique optimal point
        value   : float   the optimal objective value f_t(x, y, z)
        active_set : str  human-readable label of the active constraints
        t : float         the (float-cast) input parameter, echoed back
    """
    if not isinstance(t, Real):
        raise TypeError(f"t must be an int or float, got {type(t).__name__}")
    t = float(t)

    # Tolerate tiny floating-point overshoot right at the domain edge, but
    # reject values that are genuinely outside the stated interval.
    eps = 1e-9
    if t < _LO - eps or t > _HI + eps:
        raise ValueError(f"t={t} is outside the required domain [-2, 4]")
    t = min(max(t, _LO), _HI)

    x, y, label = _xy(t)
    z = 1.0 - x - y

    value = (
        x * x + 2.0 * y * y + 3.0 * z * z
        + x * y - y * z
        + (2.0 - 2.0 * t) * x + 5.0 * y + z
    )

    return {
        "x": x,
        "y": y,
        "z": z,
        "value": value,
        "active_set": label,
        "t": t,
    }


if __name__ == "__main__":  # pragma: no cover - not exercised on import
    # Manual smoke test only; importing this module never reaches here.
    for _t in (-2, -1.5, -1, -0.5, 0, 1.8, 4, 0.3, -0.9):
        print(_t, solve(_t))
