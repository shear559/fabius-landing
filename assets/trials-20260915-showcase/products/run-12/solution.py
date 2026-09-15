"""Exact closed-form solver for the parametric QP.

Minimize f_t(x,y,z) = x^2 + 2y^2 + 3z^2 + xy - yz + (2-2t)x + 5y + z
subject to x+y+z=1, x,y,z>=0, x<=3/5, 2y+z>=1/2, for t in [-2,4].

The optimizer is piecewise in t across six regimes (see solution.md for the
derivation and proof); each regime's (x,y) is an explicit affine or constant
function of t, z follows from the equality constraint, and each formula is
continuous with its neighbors at the shared breakpoint.
"""

_BREAKPOINTS = (-2.0, -1.5, -1.0, -0.5, 0.0, 1.8, 4.0)


def solve(t):
    if isinstance(t, bool) or not isinstance(t, (int, float)):
        raise TypeError("t must be an int or float")
    t = float(t)
    if not (-2.0 <= t <= 4.0):
        raise ValueError("t must be in [-2, 4]")

    if t <= -1.5:
        x, y = 0.0, 0.25
        regime = "vertex-adjacent edge EA (x=0), y fixed at unconstrained optimum"
        active = ["x=0"]
    elif t <= -1.0:
        x = (9.0 + 6.0 * t) / 8.0
        y = -(1.0 + t) / 2.0
        regime = "interior (no inequality active)"
        active = []
    elif t <= -0.5:
        x = (5.0 + 2.0 * t) / 8.0
        y = 0.0
        regime = "edge AB (y=0)"
        active = ["y=0"]
    elif t <= 0.0:
        x, y = 0.5, 0.0
        regime = "vertex B (1/2, 0)"
        active = ["y=0", "2y+z=1/2"]
    elif t <= 1.8:
        x = 0.5 + t / 18.0
        y = t / 18.0
        regime = "edge BC (2y+z=1/2)"
        active = ["2y+z=1/2"]
    else:
        x, y = 0.6, 0.1
        regime = "vertex C (3/5, 1/10)"
        active = ["x=3/5", "2y+z=1/2"]

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
        "t": t,
        "regime": regime,
        "active_constraints": active,
    }
