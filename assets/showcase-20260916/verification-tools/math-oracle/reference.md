# Private mathematical reference

This is one parametric optimization problem, with six solution regimes. Repeated parameter probes are not independent mathematical problems or evidence of broad model superiority. The reference was derived before either candidate solution was available. The numerical oracle independently enumerates convex-polygon geometry using Python's standard-library `Fraction`; it does not read these formulas.

## Frozen problem

For every real $t\in[-2,4]$, minimize

$$f_t(x,y,z)=x^2+2y^2+3z^2+xy-yz+(2-2t)x+5y+z$$

subject to $x+y+z=1$, $x,y,z\ge0$, $x\le3/5$, and $2y+z\ge1/2$.

## Reduction and completeness

Eliminating $z=1-x-y$ gives

$$F_t(x,y)=4x^2+8xy+6y^2-(5+2t)x-3y+4.$$

The feasible polygon is

$$P=\{(x,y):x\ge0,\ y\ge0,\ x+y\le1,\ x\le3/5,\ x-y\le1/2\},$$

whose vertices are $(0,0),(1/2,0),(3/5,1/10),(3/5,2/5),(0,1)$ in cyclic order. It is nonempty and compact, so a minimum exists. The reduced Hessian is

$$H=\begin{pmatrix}8&8\\8&12\end{pmatrix},\qquad 8>0,\quad\det H=32>0.$$

Thus $F_t$ is strictly convex on the whole plane and the feasible minimizer is unique. This is a global result, not a claim based on a plot or a local numerical solver. The exact geometric oracle covers every possible location of that minimizer: the interior stationary point, a stationary point in the relative interior of an edge, or a polygon vertex. Candidates on infinite supporting lines are retained only if feasible in the polygon.

## Exact optimizer and minimum value

Each row is valid on its **closed** interval. Neighbouring rows agree at their shared endpoint.

| Parameter interval | $x^*(t)$ | $y^*(t)$ | $z^*(t)$ | $V(t)=f_t(x^*,y^*,z^*)$ |
|---|---|---|---|---|
| $[-2,-3/2]$ | $0$ | $1/4$ | $3/4$ | $29/8$ |
| $[-3/2,-1]$ | $9/8+3t/4$ | $-1/2-t/2$ | $3/8-t/4$ | $31/16-9t/4-3t^2/4$ |
| $[-1,-1/2]$ | $5/8+t/4$ | $0$ | $3/8-t/4$ | $39/16-5t/4-t^2/4$ |
| $[-1/2,0]$ | $1/2$ | $0$ | $1/2$ | $5/2-t$ |
| $[0,9/5]$ | $1/2+t/18$ | $t/18$ | $1/2-t/9$ | $5/2-t-t^2/18$ |
| $[9/5,4]$ | $3/5$ | $1/10$ | $3/10$ | $67/25-6t/5$ |

The five transition points are exactly $-3/2,-1,-1/2,0,9/5$. On open intervals, the active inequality sets are respectively $\{x=0\}$, empty, $\{y=0\}$, $\{y=0,2y+z=1/2\}$, $\{2y+z=1/2\}$, and $\{x=3/5,2y+z=1/2\}$. The nonnegativity constraint on $z$ stays slack along this solution path; it is still part of the feasible region and the global proof.

## KKT certificate and sign convention

Use the inequality convention $g\le0$, with

$$g=(-x,-y,-z,x-3/5,1/2-2y-z),$$

and Lagrangian

$$L=f_t+\nu(x+y+z-1)+\lambda_x(-x)+\lambda_y(-y)+\lambda_z(-z)+\lambda_c(x-3/5)+\lambda_s(1/2-2y-z).$$

All inequality multipliers below are nonnegative. Unlisted multipliers are zero, including $\lambda_z$ throughout.

| Interval | Equality multiplier $\nu$ | Nonzero or potentially nonzero inequality multipliers |
|---|---|---|
| $[-2,-3/2]$ | $-21/4$ | $\lambda_x=-3-2t$ |
| $[-3/2,-1]$ | $t-15/4$ | none |
| $[-1,-1/2]$ | $-13/4+3t/2$ | $\lambda_y=2+2t$ |
| $[-1/2,0]$ | $-3+2t$ | $\lambda_y=-2t,\ \lambda_s=1+2t$ |
| $[0,9/5]$ | $-3+11t/6$ | $\lambda_s=1+10t/9$ |
| $[9/5,4]$ | $3/10$ | $\lambda_c=2t-18/5,\ \lambda_s=3$ |

The three stationarity equations, which can be checked by direct substitution, are

$$2x+y+2-2t+\nu-\lambda_x+\lambda_c=0,$$
$$4y+x-z+5+\nu-\lambda_y-2\lambda_s=0,$$
$$6z-y+1+\nu-\lambda_z-\lambda_s=0.$$

Primal feasibility follows from the optimizer table. Dual feasibility follows from the stated interval endpoints. Complementarity follows because every nonzero multiplier multiplies an active constraint. In reduced coordinates stationarity is

$$\nabla F_t-\lambda_x(1,0)-\lambda_y(0,1)+\lambda_c(1,0)+\lambda_s(1,-1)=0.$$

For any other feasible point $q$, the exact quadratic identity gives

$$F_t(q)-F_t(p)=\nabla F_t(p)^{\!T}(q-p)+\tfrac12(q-p)^T H(q-p).$$

At a certified point $p$, the first term is nonnegative: stationarity and complementarity give $-\sum_i\lambda_i g_i(q)\ge0$. The second is strictly positive for $q\ne p$. This proves global optimality and uniqueness on each closed interval, and hence on the complete domain. It does not require strict complementarity at a transition.

## Why the transitions occur, including the fixed-vertex interval

On $x=0$, minimizing in $y$ gives $y=1/4$, with $\lambda_x=-3-2t$. The multiplier vanishes at $t=-3/2$, after which this face cannot support optimality.

Solving $\nabla F_t=0$ gives the interior row. Its first new binding inequality is $y=0$ at $t=-1$. On that edge, $8x-(5+2t)=0$, giving $x=5/8+t/4$. At $t=-1/2$, it reaches $x=1/2$, where the slanted constraint also becomes active.

The solution remains at $(1/2,0,1/2)$ for an entire interval: its two reduced active multipliers are $\lambda_y=-2t$ and $\lambda_s=1+2t$, both nonnegative precisely when $-1/2\le t\le0$. Skipping this normal-cone interval is a substantive mathematical error.

On the slanted edge, write $y=x-1/2$. The objective becomes

$$18x^2-(18+2t)x+7,$$

so $x=1/2+t/18$. At $t=9/5$ the cap $x=3/5$ binds. Thereafter the cap multiplier $2t-18/5\ge0$ certifies the final vertex.

At every transition the adjoining coordinate, value, equality-multiplier, and inequality-multiplier formulas agree. The active sets may differ because an active constraint can have zero multiplier. Accordingly, an assertion that active constraints must always have positive multipliers would be wrong.

The value function is continuously differentiable with

$$V'(t)=-2x^*(t).$$

It is concave as a pointwise infimum of functions affine in $t$; the tabulated second derivatives are $0,-3/2,-1/2,0,-1/9,0$. This is a useful independent consistency check, not a replacement for the certificate.

## Candidate scoring and limitations

The required numerical interface is `solution.py` with `solve(t)` returning a mapping containing numeric finite `x`, `y`, `z`, and `value`; additional keys are allowed. Inputs supplied by the scorer are binary floating-point numbers in $[-2,4]$. The oracle evaluates the *actual supplied float* exactly as a rational to avoid falsely treating the float representation of $9/5$ as the exact real breakpoint. Separate exact-rational reference checks cover that real breakpoint and all others.

`score.py` checks domain endpoints, all five breakpoints, both sides of each breakpoint at three offset scales, three interior points in every regime, a regular grid, and a fixed-seed rational sample. Families overlap, so their counts must not be added. Coordinate and feasibility tolerance is $10^{-8}$; value tolerance is $10^{-8}\max(1,|V|,|f_t(x,y,z)|)$. It checks the reported value both against the exact optimum and against the objective recomputed at the returned coordinates. Exceptions, missing keys, nonfinite values, text and booleans fail. Candidate execution has a wall-clock limit. It is not a hostile-code security sandbox.

Numerical sampling alone cannot establish correctness for every real parameter. The proof must be assessed separately against `proof-rubric.json`, blind to the treatment identity. Report proof dimensions and numeric checks separately. Both arms solving this one task does not establish equal general mathematical ability; one arm failing does not establish general superiority of the other arm.
