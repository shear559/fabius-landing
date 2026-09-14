"""
Exact closed-form solver for the parametric QP:

    minimize   f_t(x,y,z) = x^2 + 2y^2 + 3z^2 + xy - yz + (2-2t)x + 5y + z
    subject to x + y + z = 1,  x >= 0, y >= 0, z >= 0, x <= 3/5, 2y + z >= 1/2

for t in [-2, 4].  See solution.md for the derivation and proof.  This module
only defines `solve`; importing it has no side effects.
"""

# Exact breakpoints of the piecewise-affine optimizer (as fractions, kept as
# floats since they are all exactly representable except 9/5):
_T1 = -1.5   # -3/2 : x=0 boundary leaves / interior starts
_T2 = -1.0   #       interior ends / y=0 boundary starts
_T3 = -0.5   #       y=0 boundary ends / vertex (1/2,0) starts
_T4 = 0.0    #       vertex (1/2,0) ends / 2y+z=1/2 boundary starts
_T5 = 1.8    # 9/5  : 2y+z=1/2 boundary ends / vertex (3/5,1/10) starts


def solve(t):
    """Return the unique global minimizer and optimal value at parameter t.

    Parameters
    ----------
    t : int or float, t in [-2, 4] (formulas remain valid beyond this range).

    Returns
    -------
    dict with keys:
        x, y, z   -- exact optimal point (floats)
        value     -- f_t(x, y, z)
        t         -- the input parameter, as float
        region    -- label of the active face used
        active_set -- tuple of active inequality-constraint names
        multipliers -- dict of the nonzero KKT multipliers (lambda plus mu_i)
    """
    t = float(t)

    if t <= _T1:
        x, y = 0.0, 0.25
        region = "A: x=0 face"
        active_set = ("x>=0",)
        multipliers = {"lambda": -21.0 / 4.0, "mu_x>=0": -2.0 * t - 3.0}
    elif t <= _T2:
        x, y = (9.0 + 6.0 * t) / 8.0, -(1.0 + t) / 2.0
        region = "interior (no inequality active)"
        active_set = ()
        multipliers = {"lambda": t - 15.0 / 4.0}
    elif t <= _T3:
        x, y = (5.0 + 2.0 * t) / 8.0, 0.0
        region = "B: y=0 face"
        active_set = ("y>=0",)
        multipliers = {"lambda": 1.5 * t - 13.0 / 4.0, "mu_y>=0": 2.0 * t + 2.0}
    elif t <= _T4:
        x, y = 0.5, 0.0
        region = "V2: vertex (1/2,0) [y=0 and 2y+z=1/2 both active]"
        active_set = ("y>=0", "2y+z>=1/2")
        multipliers = {
            "lambda": 2.0 * t - 3.0,
            "mu_y>=0": -2.0 * t,
            "mu_2y+z>=1/2": 2.0 * t + 1.0,
        }
    elif t <= _T5:
        x, y = 0.5 + t / 18.0, t / 18.0
        region = "E: 2y+z=1/2 face"
        active_set = ("2y+z>=1/2",)
        multipliers = {"lambda": 11.0 * t / 6.0 - 3.0, "mu_2y+z>=1/2": 10.0 * t / 9.0 + 1.0}
    else:
        x, y = 0.6, 0.1
        region = "V3: vertex (3/5,1/10) [x=3/5 and 2y+z=1/2 both active]"
        active_set = ("x<=3/5", "2y+z>=1/2")
        multipliers = {
            "lambda": 0.3,
            "mu_x<=3/5": 2.0 * t - 18.0 / 5.0,
            "mu_2y+z>=1/2": 3.0,
        }

    z = 1.0 - x - y
    value = x * x + 2.0 * y * y + 3.0 * z * z + x * y - y * z + (2.0 - 2.0 * t) * x + 5.0 * y + z

    return {
        "x": x,
        "y": y,
        "z": z,
        "value": value,
        "t": t,
        "region": region,
        "active_set": active_set,
        "multipliers": multipliers,
    }
