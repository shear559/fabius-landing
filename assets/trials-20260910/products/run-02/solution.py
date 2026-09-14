"""Unique optimizer for the parametric quadratic program, -2 <= t <= 4.

Only the Python standard library is needed. Importing this module has no
side effects. The return value contains ordinary finite Python floats.
"""


def solve(t):
    """Return a dict with x, y, z and value for an int or float t.

    Raise TypeError for other types and ValueError for nonfinite or
    out-of-range parameters. Results use ordinary binary64 arithmetic.
    """
    if not isinstance(t, (int, float)):
        raise TypeError("t must be an int or float")
    # This also rejects NaN and infinities, before any conversion of large ints.
    if not -2 <= t <= 4:
        raise ValueError("t must be finite and in [-2, 4]")
    t = float(t)

    if t <= -1.5:
        x, y, z = 0.0, 0.25, 0.75
    elif t <= -1.0:
        # Shifted formulas preserve accuracy near a vanishing coordinate.
        x = 0.75 * (t + 1.5)
        y = -0.5 * (t + 1.0)
        z = 0.75 - 0.25 * (t + 1.5)
    elif t <= -0.5:
        x = 0.375 + 0.25 * (t + 1.0)
        y, z = 0.0, 1.0 - x
    elif t <= 0.0:
        x, y, z = 0.5, 0.0, 0.5
    elif t < 1.8:
        y = t / 18.0
        x, z = 0.5 + y, 0.5 - 2.0 * y
    else:
        # The float 1.8 is just above the exact transition 9/5.
        x, y, z = 0.6, 0.1, 0.3

    value = (
        x * x + 2.0 * y * y + 3.0 * z * z + x * y - y * z
        + (2.0 - 2.0 * t) * x + 5.0 * y + z
    )
    return {"x": x, "y": y, "z": z, "value": value}
