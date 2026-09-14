# Exact solution

Write \(V(t)=\min f_t\). The following table gives the unique optimizer and value for every \(t\in[-2,4]\). Intervals deliberately overlap at their endpoints: either adjacent formula gives exactly the same answer there.

| Regime | Parameter interval | \((x^*,y^*,z^*)\) | \(V(t)\) |
|---|---|---|---|
| A | \([-2,-3/2]\) | \((0,1/4,3/4)\) | \(29/8\) |
| B | \([-3/2,-1]\) | \(((9+6t)/8,-(1+t)/2,(3-2t)/8)\) | \(29/8-\frac34(t+3/2)^2\) |
| C | \([-1,-1/2]\) | \(((5+2t)/8,0,(3-2t)/8)\) | \(4-(5+2t)^2/16\) |
| D | \([-1/2,0]\) | \((1/2,0,1/2)\) | \(5/2-t\) |
| E | \([0,9/5]\) | \((1/2+t/18,t/18,1/2-t/9)\) | \(5/2-t-t^2/18\) |
| F | \([9/5,4]\) | \((3/5,1/10,3/10)\) | \(67/25-6t/5\) |

## Reduction, existence, and uniqueness

Eliminate \(z=1-x-y\). The feasible polygon is

\[
P=\{(x,y):x\ge0,\ y\ge0,\ x+y\le1,\ x\le3/5,\ x-y\le1/2\},
\]

and the objective becomes

\[
q_t(x,y)=4x^2+8xy+6y^2-(5+2t)x-3y+4.
\]

The polygon is nonempty, closed, and bounded, so a minimum exists. Its vertices, in cyclic order, are

\[
(0,0),\quad(1/2,0),\quad(3/5,1/10),\quad(3/5,2/5),\quad(0,1).
\]

The reduced Hessian is \(\begin{pmatrix}8&8\\8&12\end{pmatrix}\), with leading principal minors \(8\) and \(32\). More explicitly, its quadratic remainder on a displacement \((a,b)\) is
\(4(a+b)^2+2b^2>0\) for every nonzero displacement. Thus \(q_t\) is strictly convex and the minimizer on \(P\) is unique for every real \(t\).

## Derivation of the regimes

The reduced gradient is

\[
q_x=8x+8y-5-2t,\qquad q_y=8x+12y-3.
\]

On \(x=0\), minimization in \(y\) gives \(y=1/4\); the inward derivative is \(-3-2t\), nonnegative exactly when \(t\le-3/2\). This gives A.

Solving \(q_x=q_y=0\) gives B. Its coordinates are feasible precisely for \(-3/2\le t\le-1\): outside that interval either \(x<0\) or \(y<0\). Within it, \(x\le3/8\), \(z>0\), and \(x-y\le3/8<1/2\).

On \(y=0\), tangential stationarity gives \(x=(5+2t)/8\). Its inward derivative is \(q_y=2+2t\), which is nonnegative for \(t\ge-1\); the constraint \(x-y\le1/2\) requires \(t\le-1/2\). This gives C.

At \((x,y)=(1/2,0)\), the two incident feasible directions can be chosen as \((-1,0)\) and \((1,1)\). Their directional derivatives are \(1+2t\) and \(-2t\). Both are nonnegative exactly for \(-1/2\le t\le0\), giving D.

On \(x-y=1/2\), substitute \(y=x-1/2\):

\[
q_t(x,x-1/2)=18x^2-(18+2t)x+7.
\]

Its stationary point is \(x=1/2+t/18\), feasible on this edge exactly for \(0\le t\le9/5\). Its inward optimality condition is verified by the nonnegative multiplier below. This gives E.

Finally, at \((3/5,1/10)\), the two incident feasible directions can be chosen as \((-1,-1)\) and \((0,1)\). The directional derivatives are \(2t-18/5\) and \(3\). Both are nonnegative exactly for \(t\ge9/5\), giving F. Substitution into \(q_t\) yields the value formulas in the first table.

## KKT certificate and global optimality

Use the sign convention that all inequality functions are **at most zero**, with **nonnegative** multipliers. Define

\[
L=f_t+\lambda(x+y+z-1)-\alpha x-\beta y-\gamma z
+\delta(x-3/5)+\eta(1/2-2y-z),
\]

where \(\lambda\in\mathbb R\) and \(\alpha,\beta,\gamma,\delta,\eta\ge0\). Stationarity is

\[
\begin{aligned}
2x+y+2-2t+\lambda-\alpha+\delta&=0,\\
4y+x-z+5+\lambda-\beta-2\eta&=0,\\
6z-y+1+\lambda-\gamma-\eta&=0.
\end{aligned}
\]

Complementary slackness is

\[
\alpha x=\beta y=\gamma z=0,\qquad
\delta(x-3/5)=0,\qquad \eta(1/2-2y-z)=0.
\]

The following multipliers apply on the **closed** intervals of the first table. Every multiplier not shown as nonzero is explicitly zero in this table.

| Regime | \(\lambda\) | \(\alpha\) | \(\beta\) | \(\gamma\) | \(\delta\) | \(\eta\) |
|---|---|---|---|---|---|---|
| A | \(-21/4\) | \(-3-2t\) | 0 | 0 | 0 | 0 |
| B | \(t-15/4\) | 0 | 0 | 0 | 0 | 0 |
| C | \((6t-13)/4\) | 0 | \(2+2t\) | 0 | 0 | 0 |
| D | \(2t-3\) | 0 | \(-2t\) | 0 | 0 | \(1+2t\) |
| E | \(-3+11t/6\) | 0 | 0 | 0 | 0 | \(1+10t/9\) |
| F | \(3/10\) | 0 | 0 | 0 | \(2t-18/5\) | 3 |

All candidate points are feasible, with \(z\ge3/10>0\), so \(\gamma=0\). The other inequality multipliers are nonnegative on their stated intervals and satisfy complementary slackness. Stationarity can be checked particularly simply by using

\[
\lambda=\eta-(6z-y+1),\qquad
q_x-\alpha+\delta+\eta=0,\qquad
q_y-\beta-\eta=0.
\]

These certificates prove global optimality directly, without assuming KKT necessity or a constraint qualification. Indeed, for any feasible competitor \((x^*+a,y^*+b)\), the exact quadratic expansion gives

\[
q_t(x^*+a,y^*+b)-q_t(x^*,y^*)
=\nabla q_t(x^*,y^*)\cdot(a,b)+4(a+b)^2+2b^2.
\]

Writing the five reduced inequalities as affine functions \(g_i\le0\), stationarity and complementary slackness imply

\[
\nabla q_t(x^*,y^*)\cdot(a,b)
=-\sum_i\mu_i\bigl(g_i(x^*+a,y^*+b)-g_i(x^*,y^*)\bigr)
=-\sum_i\mu_i g_i(x^*+a,y^*+b)\ge0.
\]

Here the multipliers in polygon-inequality order are \((\alpha,\beta,\gamma,\delta,\eta)\), with \(\gamma=0\). Consequently every distinct feasible competitor has strictly larger objective. This proves both global optimality and uniqueness.

The six closed parameter intervals cover \([-2,4]\) with no gaps. The inequality above applies to **every** point of the polygon, including its other edges, its vertices, and its interior. Thus there is no unexamined competing face or parameter range; enumerating additional face optimizers is unnecessary for the proof.

## Active sets and all boundaries

Here “active” means an inequality holds with equality, whether or not its multiplier is positive. The equality \(x+y+z=1\) is always active. Write \(X\) for \(x=0\), \(Y\) for \(y=0\), \(U\) for \(x=3/5\), and \(W\) for \(2y+z=1/2\). The inequality \(z\ge0\) is never active.

| Parameter set | Active inequalities |
|---|---|
| \([-2,-3/2]\) | \(X\) |
| \((-3/2,-1)\) | none |
| \([-1,-1/2)\) | \(Y\) |
| \([-1/2,0]\) | \(Y,W\) |
| \((0,9/5)\) | \(W\) |
| \([9/5,4]\) | \(U,W\) |

At each transition the adjacent optimizer, value, and multiplier formulas agree. The following table gives all active-inequality multipliers and the equality multiplier there; all omitted inequality multipliers are zero.

| \(t\) | Optimizer | Active-inequality multipliers | \(\lambda\) | \(V(t)\) |
|---|---|---|---|---|
| \(-3/2\) | \((0,1/4,3/4)\) | \(\alpha=0\) | \(-21/4\) | \(29/8\) |
| \(-1\) | \((3/8,0,5/8)\) | \(\beta=0\) | \(-19/4\) | \(55/16\) |
| \(-1/2\) | \((1/2,0,1/2)\) | \(\beta=1,\eta=0\) | \(-4\) | 3 |
| 0 | \((1/2,0,1/2)\) | \(\beta=0,\eta=1\) | \(-3\) | \(5/2\) |
| \(9/5\) | \((3/5,1/10,3/10)\) | \(\delta=0,\eta=3\) | \(3/10\) | \(13/25\) |

The two outer endpoints are included: at \(t=-2\), the optimizer is \((0,1/4,3/4)\), \(V=29/8\), \(\alpha=1\), and \(\lambda=-21/4\); at \(t=4\), it is \((3/5,1/10,3/10)\), \(V=-53/25\), \(\delta=22/5\), \(\eta=3\), and \(\lambda=3/10\). All other inequality multipliers vanish at these endpoints. A zero multiplier at a transition does not make the optimizer nonunique: strict convexity still applies. The active inequality gradients together with the equality gradient are linearly independent at every listed point, so these KKT multipliers are also unique.

## Regularity of the value and numerical implementation

The optimizer is continuous and piecewise affine. Differentiating the value formulas gives

\[
V'(t)=
\begin{cases}
0 & \text{in A},\\
-(9+6t)/4 & \text{in B},\\
-(5+2t)/4 & \text{in C},\\
-1 & \text{in D},\\
-1-t/9 & \text{in E},\\
-6/5 & \text{in F}.
\end{cases}
\]

These expressions agree at every shared endpoint, and equal \(-2x^*(t)\). Thus \(V\) is continuously differentiable on the closed interval (with one-sided derivatives at its outer endpoints). The slopes at the five transitions are respectively \(0,-3/4,-1,-1,-6/5\). On the six open regimes, \(V''\) is respectively \(0,-3/2,-1/2,0,-1/9,0\); hence \(V\) is not twice differentiable at any transition. It is nonincreasing and concave.

`solution.py` exposes `solve(t)` and uses these closed-form expressions with direct comparisons, without a numerical optimizer or tolerance-based regime selection. It accepts finite `int` or `float` inputs in the specified interval and returns numeric `x`, `y`, `z`, and `value`. Algebraically equivalent shifted expressions reduce cancellation near transitions. All returned numbers have ordinary binary floating-point rounding. In particular `1.8` is the nearest float to \(9/5\); it lies just above the exact rational boundary, and the immediately preceding float lies below it, so the final branch comparison correctly classifies representable inputs. No finite-precision implementation can resolve optimizer displacements smaller than a float's spacing; this does not alter the underlying formulas or use a tolerance band.
