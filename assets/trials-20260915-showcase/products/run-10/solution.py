"""
Closed-form solver for the parametric QP:

    minimize   f_t(x,y,z) = x^2 + 2y^2 + 3z^2 + xy - yz + (2-2t)x + 5y + z
    subject to x + y + z = 1,  x,y,z >= 0,  x <= 3/5,  2y + z >= 1/2

for real t in [-2, 4]. See solution.md for the full derivation and proof.

Regime map (t -> active set):
  t in [-2,  -3/2]  : x = 0 held (edge x=0, interior in y)
  t in [-3/2, -1  ] : fully interior (no inequality constraint active)
  t in [-1,   -1/2] : y = 0 held (edge y=0, interior in x)
  t in [-1/2,  0  ] : vertex B = (1/2, 0)
  t in [0,     9/5] : edge y = x - 1/2 (interior of that edge)
  t in [9/5,   4  ] : vertex C = (3/5, 1/10)

Importing this module has no side effects (no CLI, no prints, no file I/O).
"""


def solve(t):
    """Return the unique global minimizer/value of f_t for t in [-2, 4].

    Parameters
    ----------
    t : int or float, expected within [-2, 4].

    Returns
    -------
    dict with keys:
      x, y, z  : exact optimizer coordinates (float)
      value    : optimal objective value f_t(x, y, z) (float)
      regime   : label of the active set / face containing the optimizer
    """
    t = float(t)

    if t <= -1.5:
        x, y, z = 0.0, 0.25, 0.75
        regime = "x=0 (edge EA)"
    elif t <= -1.0:
        x = (9.0 + 6.0 * t) / 8.0
        y = -(1.0 + t) / 2.0
        z = (3.0 - 2.0 * t) / 8.0
        regime = "interior"
    elif t <= -0.5:
        x = (5.0 + 2.0 * t) / 8.0
        y = 0.0
        z = (3.0 - 2.0 * t) / 8.0
        regime = "y=0 (edge AB)"
    elif t <= 0.0:
        x, y, z = 0.5, 0.0, 0.5
        regime = "vertex B=(1/2,0)"
    elif t <= 1.8:
        x = (9.0 + t) / 18.0
        y = t / 18.0
        z = (9.0 - 2.0 * t) / 18.0
        regime = "y=x-1/2 (edge BC)"
    else:
        x, y, z = 0.6, 0.1, 0.3
        regime = "vertex C=(3/5,1/10)"

    value = (
        x * x + 2.0 * y * y + 3.0 * z * z + x * y - y * z
        + (2.0 - 2.0 * t) * x + 5.0 * y + z
    )

    return {"x": x, "y": y, "z": z, "value": value, "regime": regime}
