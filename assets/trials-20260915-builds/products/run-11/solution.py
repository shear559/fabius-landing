"""
Closed-form solver for the parametric QP:

    minimize   f_t(x,y,z) = x^2 + 2y^2 + 3z^2 + xy - yz + (2-2t)x + 5y + z
    subject to x + y + z = 1
               x >= 0, y >= 0, z >= 0
               x <= 3/5
               2y + z >= 1/2

for real parameter t in [-2, 4].

The objective is strictly convex (constant Hessian
[[2,1,0],[1,4,-1],[0,-1,6]] is positive definite) and the feasible set is a
fixed convex polygon (independent of t), so for every t the minimizer is
unique and is characterized exactly by the KKT conditions.  Eliminating
z = 1-x-y reduces the problem to an unconstrained-quadratic-with-polygon
problem in (x,y).  The unconstrained minimizer
    x*(t) = (9+6t)/8,  y*(t) = -(1+t)/2
moves along a straight line as t varies; projecting it (in the metric of
the Hessian) onto the feasible pentagon produces six closed-form regimes.
See solution.md for the full derivation and proof.

Breakpoints:  t in { -3/2, -1, -1/2, 0, 9/5 }.
"""

T_MIN, T_MAX = -2, 4

_BREAKPOINTS = (-1.5, -1.0, -0.5, 0.0, 1.8)


def solve(t):
    """Return the exact-formula optimizer/value of f_t on [-2, 4].

    Parameters
    ----------
    t : int or float, must lie in [-2, 4].

    Returns
    -------
    dict with keys:
        x, y, z   : optimal point (floats)
        value     : optimal objective value f_t(x, y, z) (float)
        t         : the input parameter (float)
        region    : label of the active-set regime used
        active_set: tuple of the names of the constraints active at the optimum
        multipliers: dict of KKT multipliers (mu for the equality constraint,
                     alpha1..alpha5 for -x<=0, -y<=0, -z<=0, x-3/5<=0,
                     1/2-2y-z<=0 respectively)
    """
    t = float(t)
    if not (T_MIN - 1e-9 <= t <= T_MAX + 1e-9):
        raise ValueError("t must lie in [-2, 4]")

    if t <= _BREAKPOINTS[0]:
        # Region 1: t in [-2, -3/2].  Active: x=0.
        x, y, z = 0.0, 0.25, 0.75
        value = 29.0 / 8.0
        region = "R1: x=0 (edge)"
        active = ("x=0",)
        mu = -21.0 / 4.0
        alphas = {"alpha1": -3.0 - 2.0 * t, "alpha2": 0.0, "alpha3": 0.0,
                  "alpha4": 0.0, "alpha5": 0.0}

    elif t <= _BREAKPOINTS[1]:
        # Region 2: t in [-3/2, -1].  Fully interior (unconstrained) optimum.
        x = (9.0 + 6.0 * t) / 8.0
        y = -(1.0 + t) / 2.0
        z = (3.0 - 2.0 * t) / 8.0
        value = (31.0 - 36.0 * t - 12.0 * t * t) / 16.0
        region = "R2: interior"
        active = ()
        mu = t - 15.0 / 4.0
        alphas = {"alpha1": 0.0, "alpha2": 0.0, "alpha3": 0.0,
                  "alpha4": 0.0, "alpha5": 0.0}

    elif t <= _BREAKPOINTS[2]:
        # Region 3: t in [-1, -1/2].  Active: y=0.
        x = (5.0 + 2.0 * t) / 8.0
        y = 0.0
        z = (3.0 - 2.0 * t) / 8.0
        value = (-4.0 * t * t - 20.0 * t + 39.0) / 16.0
        region = "R3: y=0 (edge)"
        active = ("y=0",)
        mu = (6.0 * t - 13.0) / 4.0
        alphas = {"alpha1": 0.0, "alpha2": 2.0 * t + 2.0, "alpha3": 0.0,
                  "alpha4": 0.0, "alpha5": 0.0}

    elif t <= _BREAKPOINTS[3]:
        # Region 4: t in [-1/2, 0].  Vertex: y=0 and x-y=1/2 (2y+z=1/2).
        x, y, z = 0.5, 0.0, 0.5
        value = 2.5 - t
        region = "R4: vertex (y=0) & (2y+z=1/2)"
        active = ("y=0", "2y+z=1/2")
        mu = 2.0 * t - 3.0
        alphas = {"alpha1": 0.0, "alpha2": -2.0 * t, "alpha3": 0.0,
                  "alpha4": 0.0, "alpha5": 2.0 * t + 1.0}

    elif t <= _BREAKPOINTS[4]:
        # Region 5: t in [0, 9/5].  Active: 2y+z=1/2 (x-y=1/2).
        x = t / 18.0 + 0.5
        y = t / 18.0
        z = 0.5 - t / 9.0
        value = (-t * t - 18.0 * t + 45.0) / 18.0
        region = "R5: 2y+z=1/2 (edge)"
        active = ("2y+z=1/2",)
        mu = 11.0 * t / 6.0 - 3.0
        alphas = {"alpha1": 0.0, "alpha2": 0.0, "alpha3": 0.0,
                  "alpha4": 0.0, "alpha5": 1.0 + 10.0 * t / 9.0}

    else:
        # Region 6: t in [9/5, 4].  Vertex: x=3/5 and 2y+z=1/2.
        x, y, z = 0.6, 0.1, 0.3
        value = (67.0 - 30.0 * t) / 25.0
        region = "R6: vertex (x=3/5) & (2y+z=1/2)"
        active = ("x=3/5", "2y+z=1/2")
        mu = 0.3
        alphas = {"alpha1": 0.0, "alpha2": 0.0, "alpha3": 0.0,
                  "alpha4": 2.0 * t - 3.6, "alpha5": 3.0}

    return {
        "x": x,
        "y": y,
        "z": z,
        "value": value,
        "t": t,
        "region": region,
        "active_set": active,
        "multipliers": dict(mu=mu, **alphas),
    }


if __name__ == "__main__":
    # Manual smoke test only; importing this module never executes this block.
    for _t in (-2, -1.5, -1, -0.5, 0, 1.8, 4, -1.2, 0.7, 3.1):
        r = solve(_t)
        print(_t, r["x"], r["y"], r["z"], r["value"], r["region"])
