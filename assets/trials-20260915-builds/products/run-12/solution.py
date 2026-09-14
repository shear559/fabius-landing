"""
Exact closed-form solver for the parametric QP:

    minimize f_t(x,y,z) = x^2 + 2y^2 + 3z^2 + xy - yz + (2-2t)x + 5y + z
    subject to x+y+z=1, x>=0, y>=0, z>=0, x<=3/5, 2y+z>=1/2

for t in [-2,4]. See solution.md for the full derivation and proof.

The optimizer (x(t),y(t),z(t)) is piecewise (constant / affine) in t over six
regimes separated at t = -3/2, -1, -1/2, 0, 9/5. Adjacent regimes agree
exactly at the shared breakpoint (proved in solution.md), so it does not
matter which side of a "<=" a breakpoint falls on -- both branches return the
same point there, up to floating-point rounding.
"""


def solve(t):
    """
    Solve the constrained optimization for a given real t in [-2,4].

    Parameters
    ----------
    t : int or float

    Returns
    -------
    dict with keys:
        x, y, z : float   -- the unique optimal point
        value   : float   -- f_t(x,y,z) at the optimum
    """
    t = float(t)

    if t <= -1.5:
        x, y, z = 0.0, 0.25, 0.75
    elif t <= -1.0:
        x = (6.0 * t + 9.0) / 8.0
        y = -(t + 1.0) / 2.0
        z = (3.0 - 2.0 * t) / 8.0
    elif t <= -0.5:
        x = (2.0 * t + 5.0) / 8.0
        y = 0.0
        z = (3.0 - 2.0 * t) / 8.0
    elif t <= 0.0:
        x, y, z = 0.5, 0.0, 0.5
    elif t <= 1.8:
        x = (t + 9.0) / 18.0
        y = t / 18.0
        z = (9.0 - 2.0 * t) / 18.0
    else:
        x, y, z = 0.6, 0.1, 0.3

    value = (
        x * x + 2.0 * y * y + 3.0 * z * z + x * y - y * z
        + (2.0 - 2.0 * t) * x + 5.0 * y + z
    )

    return {"x": x, "y": y, "z": z, "value": value}
