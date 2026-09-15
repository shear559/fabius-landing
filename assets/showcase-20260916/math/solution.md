# One problem, six regimes

Minimize

\[
 f_t(x,y,z)=x^2+2y^2+3z^2+xy-yz+(2-2t)x+5y+z
\]

over \(x+y+z=1\), \(x,y,z\ge0\), \(x\le3/5\), \(2y+z\ge1/2\), for \(-2\le t\le4\).

## The exact answer

Every row includes both endpoints. Adjacent formulas agree where their intervals overlap. The active constraints listed are those on the open interval.

| Interval for t | x* | y* | z* | Minimum V(t) | Active inequalities |
|---|---|---|---|---|---|
| [-2, -3/2] | 0 | 1/4 | 3/4 | 29/8 | x = 0 |
| [-3/2, -1] | 9/8 + 3t/4 | -1/2 - t/2 | 3/8 - t/4 | 31/16 - 9t/4 - 3t²/4 | none |
| [-1, -1/2] | 5/8 + t/4 | 0 | 3/8 - t/4 | 39/16 - 5t/4 - t²/4 | y = 0 |
| [-1/2, 0] | 1/2 | 0 | 1/2 | 5/2 - t | y = 0; 2y + z = 1/2 |
| [0, 9/5] | 1/2 + t/18 | t/18 | 1/2 - t/9 | 5/2 - t - t²/18 | 2y + z = 1/2 |
| [9/5, 4] | 3/5 | 1/10 | 3/10 | 67/25 - 6t/5 | x = 3/5; 2y + z = 1/2 |

## What the geometry is saying

Eliminate z using \(z=1-x-y\). The feasible set is the pentagon with vertices

\[
(0,0),\quad (1/2,0),\quad (3/5,1/10),\quad (3/5,2/5),\quad (0,1).
\]

The parameter changes only the linear incentive on x. As t increases, the optimum begins at \((0,1/4)\), travels through the interior to \((3/8,0)\), follows the bottom edge to \((1/2,0)\), stays at that corner, then follows the slanted edge to \((3/5,1/10)\). It remains at this final corner. In three dimensions z is always recovered from the equality.

The five transitions have different meanings:

- At -3/2, the multiplier of x ≥ 0 reaches zero; the optimum can leave the left edge.
- At -1, the interior path reaches y = 0.
- At -1/2, the bottom-edge path reaches the slanted constraint.
- At 0, the y ≥ 0 multiplier reaches zero; the optimum can leave the corner along the slanted edge.
- At 9/5, that path reaches the upper bound x = 3/5.

## Why the answer exists and is unique

The reduced objective is

\[
 g_t(x,y)=4x^2+8xy+6y^2-(5+2t)x-3y+4.
\]

Its Hessian is \(H=\begin{pmatrix}8&8\\8&12\end{pmatrix}\), with leading principal minors 8 and 32. Thus it is positive definite and g is strictly convex for every t. The nonempty feasible pentagon is compact and convex. A minimum exists, and there can be only one.

## A certificate for every parameter

Use nonpositive inequalities

\[
 h=(-x,-y,-z,x-3/5,1/2-2y-z)\le0
\]

and the Lagrangian

\[
 L=f_t+\nu(x+y+z-1)+\lambda_x(-x)+\lambda_y(-y)+\lambda_z(-z)
 +\lambda_c(x-3/5)+\lambda_s(1/2-2y-z).
\]

All inequality multipliers are nonnegative. The stationarity equations are

\[
2x+y+2-2t+\nu-\lambda_x+\lambda_c=0,
\]
\[
x+4y-z+5+\nu-\lambda_y-2\lambda_s=0,
\]
\[
6z-y+1+\nu-\lambda_z-\lambda_s=0.
\]

In the same row order as the answer table, a complete set of multipliers is:

| Regime | ν | λx | λy | λz | λc | λs |
|---|---|---|---|---|---|---|
| 1 | -21/4 | -3 - 2t | 0 | 0 | 0 | 0 |
| 2 | t - 15/4 | 0 | 0 | 0 | 0 | 0 |
| 3 | 3t/2 - 13/4 | 0 | 2 + 2t | 0 | 0 | 0 |
| 4 | 2t - 3 | 0 | -2t | 0 | 0 | 1 + 2t |
| 5 | 11t/6 - 3 | 0 | 0 | 0 | 0 | 1 + 10t/9 |
| 6 | 3/10 | 0 | 0 | 0 | 2t - 18/5 | 3 |

Direct substitution gives feasibility, stationarity, nonnegative multipliers, and \(\lambda_i h_i=0\) on each complete closed interval. A certificate proves global optimality: for any feasible v and the certified point u, convexity on the equality plane gives

\[
 f_t(v)\ge f_t(u)+\nabla f_t(u)^T(v-u)
 =f_t(u)-\sum_i\lambda_i h_i(v)\ge f_t(u).
\]

Complementarity and the equality were used in the middle step. Strict convexity makes the inequality strict when v differs from u. This proves optimality against every feasible face, including faces not visited by the optimizer. Exhaustive face enumeration is therefore unnecessary: the certificate covers the whole domain, not just the sampled path.

## Boundaries and the value function

At all five joins the coordinates and multipliers in adjacent rows agree. The common optimizer triples are respectively

\[
(0,1/4,3/4),\ (3/8,0,5/8),\ (1/2,0,1/2),\ (1/2,0,1/2),\ (3/5,1/10,3/10).
\]

At a transition, an active inequality can have zero multiplier. In order, these zero multipliers are λx, λy, λs, λy, and λc. This is consistent with KKT and does not remove the corresponding active equality at the transition itself. The domain endpoints -2 and 4 are included in their certificate rows.

Substitution yields the exact V(t) table. Its first derivative is

\[
V'(t)=-2x^*(t).
\]

The derivatives at the five joins are 0, -3/4, -1, -1, and -6/5 from both sides. Thus V is continuously differentiable on the interval (with one-sided derivatives at its endpoints). It is generally not twice differentiable at the joins: its second derivatives on the six open regimes are 0, -3/2, -1/2, 0, -1/9, and 0. V is concave, as expected for a pointwise minimum of functions affine in t.

## Construction and verification scope

This is a worked refinement for the Fabius showcase, prepared with the prior exact reference available. It is not a fresh blinded benchmark submission. The executable solver and browser explorer implement the same six formulas. Numerical checks and exact polynomial certificate checks are separate from the written proof and are reported in verification.md.
