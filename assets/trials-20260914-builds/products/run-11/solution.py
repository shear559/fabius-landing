"""
Exact closed-form solver for the parametric QP:

    minimize   f_t(x,y,z) = x^2 + 2y^2 + 3z^2 + xy - yz + (2-2t)x + 5y + z
    subject to x + y + z = 1,  x >= 0,  y >= 0,  z >= 0,
               x <= 3/5,       2y + z >= 1/2

for real t in [-2, 4].

The derivation and proof of global optimality / uniqueness are in
solution.md. This module only encodes the resulting closed form. It
performs no I/O and defines no CLI: importing it has no side effects.

Six regimes on t partition [-2, 4], separated at the exact breakpoints
t = -3/2, -1, -1/2, 0, 9/5. The optimizer (x(t), y(t), z(t)) and the
optimal value V(t) are continuous (in fact C^1) across every breakpoint,
so evaluating either neighboring formula at a breakpoint agrees up to
floating-point rounding.
"""

from __future__ import annotations

# Exact rational breakpoints of the parameter t.
_B1 = -1.5   # -3/2
_B2 = -1.0
_B3 = -0.5
_B4 = 0.0
_B5 = 1.8    # 9/5


def _point(t: float):
    """Return (x, y, z, regime_label, active_constraints) for parameter t."""
    if t <= _B1:
        # Edge x = 0 (constraint x>=0 active); stationary in y with y=1/4.
        return 0.0, 0.25, 0.75, "edge_x0", ("x>=0",)
    elif t <= _B2:
        # Fully interior: no inequality constraint active.
        x = 0.75 * t + 1.125
        y = -0.5 * t - 0.5
        z = 0.375 - 0.25 * t
        return x, y, z, "interior", ()
    elif t <= _B3:
        # Edge y = 0 (constraint y>=0 active).
        x = (2.0 * t + 5.0) / 8.0
        y = 0.0
        z = (3.0 - 2.0 * t) / 8.0
        return x, y, z, "edge_y0", ("y>=0",)
    elif t <= _B4:
        # Vertex: y=0 and 2y+z=1/2 both active.
        return 0.5, 0.0, 0.5, "vertex_y0_w", ("y>=0", "2y+z>=1/2")
    elif t <= _B5:
        # Edge 2y+z = 1/2 (constraint 2y+z>=1/2 active).
        x = (t + 9.0) / 18.0
        y = t / 18.0
        z = (9.0 - 2.0 * t) / 18.0
        return x, y, z, "edge_w", ("2y+z>=1/2",)
    else:
        # Vertex: x=3/5 and 2y+z=1/2 both active.
        return 0.6, 0.1, 0.3, "vertex_x_w", ("x<=3/5", "2y+z>=1/2")


def solve(t):
    """
    Solve the parametric QP for a given real parameter t (int or float),
    t assumed in [-2, 4].

    Returns a dict with:
        x, y, z : the unique global optimizer (finite floats)
        value   : f_t(x, y, z) at that optimizer (finite float)
        regime  : label of the active geometric piece (informational)
        active_constraints : tuple of the inequality constraints tight
                              at the optimizer (informational)
        t       : the (float-cast) input, echoed back
    """
    tf = float(t)
    x, y, z, regime, active = _point(tf)

    value = (
        x * x + 2.0 * y * y + 3.0 * z * z
        + x * y - y * z
        + (2.0 - 2.0 * tf) * x + 5.0 * y + z
    )

    return {
        "x": float(x),
        "y": float(y),
        "z": float(z),
        "value": float(value),
        "regime": regime,
        "active_constraints": active,
        "t": tf,
    }
