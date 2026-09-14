# Exact solution

Write $p^*(t)=(x^*(t),y^*(t),z^*(t))$ and $V(t)=f_t(p^*(t))$.
The following formulas apply on the indicated **closed** intervals. At a
shared endpoint the two formulas agree, so the table defines a single function.

| Regime | Parameter interval | $p^*(t)$ | $V(t)$ |
|---|---|---|---|
| A | $[-2,-3/2]$ | $(0,1/4,3/4)$ | $29/8$ |
| B | $[-3/2,-1]$ | $((9+6t)/8,-(1+t)/2,(3-2t)/8)$ | $31/16-9t/4-3t^2/4$ |
| C | $[-1,-1/2]$ | $((5+2t)/8,0,(3-2t)/8)$ | $39/16-5t/4-t^2/4$ |
| D | $[-1/2,0]$ | $(1/2,0,1/2)$ | $5/2-t$ |
| E | $[0,9/5]$ | $(1/2+t/18,t/18,1/2-t/9)$ | $5/2-t-t^2/18$ |
| F | $[9/5,4]$ | $(3/5,1/10,3/10)$ | $67/25-6t/5$ |

## Reduction and feasible geometry

Eliminate $z=1-x-y$. The objective becomes

$$
q_t(x,y)=4x^2+8xy+6y^2-(5+2t)x-3y+4,
$$

on the polygon

$$
P=\{(x,y):x\ge0,\ y\ge0,\ x+y\le1,\ x\le3/5,
\ x-y\le1/2\}.
$$

Its vertices, in boundary order, are

$$
(0,0),\quad(1/2,0),\quad(3/5,1/10),\quad(3/5,2/5),\quad(0,1).
$$

Indeed, for $0\le x\le3/5$, the vertical section is

$$
\max(0,x-1/2)\le y\le1-x.
$$

Thus its five edges lie on $y=0$, $x-y=1/2$, $x=3/5$,
$x+y=1$, and $x=0$; this also explicitly lists all possible competing
faces. The polygon is nonempty and compact, so a minimizer exists.

The reduced Hessian and its quadratic remainder are

$$
H=\begin{pmatrix}8&8\\8&12\end{pmatrix},\qquad
\tfrac12d^THd=4(d_x+d_y)^2+2d_y^2>0\quad(d\ne0).
$$

Hence the objective is strictly convex on the equality plane. Every certified
minimizer below is the unique global minimizer.

## Derivation of the regimes

The reduced gradient is

$$
\nabla q_t=(8x+8y-5-2t,\ 8x+12y-3).
$$

The interior stationary point is the formula in B. Its $x\ge0$ and
$y\ge0$ conditions require $t\ge-3/2$ and $t\le-1$.
Throughout this interval the other three inequalities are strict. Thus
B gives precisely the interval of interior stationarity, with the stated
boundary contacts.

On $x=0$, minimizing $6y^2-3y+4$ gives $y=1/4$.
The derivative toward increasing $x$ is $-3-2t$, nonnegative exactly
when $t\le-3/2$. This yields A on the requested domain.

On $y=0$, the stationary point is $x=(5+2t)/8$.
The inward $y$ derivative there is $2+2t$, and this point stays below
$x=1/2$ exactly when $t\le-1/2$. The resulting regime is C.

At the corner $(x,y)=(1/2,0)$, the gradient is $(-1-2t,1)$.
Using the active inequalities $-y\le0$ and $x-y-1/2\le0$,
stationarity requires multipliers $-2t$ and $1+2t$, respectively.
Both are nonnegative precisely on D.

On $x-y=1/2$, set $x=1/2+s, y=s$, so $0\le s\le1/10$.
The restricted objective is

$$
q_t(1/2+s,s)=5/2-t-2ts+18s^2.
$$

Its stationary point is $s=t/18$, which lies on that edge precisely
for $0\le t\le9/5$, giving E. At the endpoint $s=1/10$, the
additional cap $x=3/5$ becomes active. Its multiplier is $2t-18/5$,
so the endpoint remains optimal for $t\ge9/5$, giving F.
The full certificates below justify all these face calculations globally.

## KKT convention and certificates

Use $h=x+y+z-1=0$, the inequality functions

$$
(g_1,g_2,g_3,g_4,g_5)=(-x,-y,-z,x-3/5,1/2-2y-z)\le0,
$$

and the Lagrangian

$$
L=f_t+\lambda h+\alpha g_1+\beta g_2+\gamma g_3
       +\delta g_4+\rho g_5,
\qquad \alpha,\beta,\gamma,\delta,\rho\ge0.
$$

The equality multiplier $\lambda$ is unrestricted. Stationarity means

$$
\begin{aligned}
2x+y+2-2t+\lambda-\alpha+\delta&=0,\\
4y+x-z+5+\lambda-\beta-2\rho&=0,\\
6z-y+1+\lambda-\gamma-\rho&=0.
\end{aligned}
$$

The following multipliers apply on the same closed intervals as the solution
table. Every unlisted inequality multiplier is zero; in particular,
$\gamma=0$ everywhere.

| Regime | $\lambda$ | $\alpha$ | $\beta$ | $\delta$ | $\rho$ |
|---|---|---|---|---|---|
| A | $-21/4$ | $-3-2t$ | 0 | 0 | 0 |
| B | $t-15/4$ | 0 | 0 | 0 | 0 |
| C | $(6t-13)/4$ | 0 | $2+2t$ | 0 | 0 |
| D | $2t-3$ | 0 | $-2t$ | 0 | $1+2t$ |
| E | $-3+11t/6$ | 0 | 0 | 0 | $1+10t/9$ |
| F | $3/10$ | 0 | 0 | $2t-18/5$ | 3 |

Substitution verifies all three stationarity equations. Every multiplier
is nonnegative on its stated interval and vanishes on inactive inequalities.
The points are feasible: in A--C the lower constraint is slack except
at the right endpoint of C; in D--F it is an equality. The cap is strict
until the right endpoint of E. Coordinates are nonnegative throughout,
and $z\ge3/10>0$. This proves primal feasibility, dual feasibility,
stationarity, and complementary slackness, including endpoints.

For completeness, sufficiency can be proved directly without invoking a
constraint qualification. Reduce the inequalities to

$$
\widetilde g=(-x,-y,x+y-1,x-3/5,x-y-1/2).
$$

The displayed stationarity equations imply
$\nabla q_t(u^*)+\sum_i\mu_i\nabla\widetilde g_i=0$, where
$u^*=(x^*,y^*)$ and $\mu=(\alpha,\beta,\gamma,\delta,\rho)$.
For any other feasible $u=u^*+d$, affine constraints and complementary
slackness give

$$
\nabla q_t(u^*)\cdot d
=-\sum_i\mu_i\bigl(\widetilde g_i(u)-\widetilde g_i(u^*)\bigr)
=-\sum_i\mu_i\widetilde g_i(u)\ge0.
$$

Consequently

$$
q_t(u)-q_t(u^*)
=\nabla q_t(u^*)\cdot d+4(d_x+d_y)^2+2d_y^2>0
\quad\text{if }u\ne u^*.
$$

This certifies optimality against **every feasible point**, including the
unused edge $z=0$, all other edges, and all vertices. The six parameter
intervals cover $[-2,4]$ without gaps, so there is no omitted parameter
range or competing face. In particular, no numerical search or assumption
about a preferred sequence of faces is needed for completeness.

## Active sets and all boundaries

“Active” means equality in an inequality, irrespective of whether its
multiplier is positive. The equality $x+y+z=1$ is always active.
On the open interiors of A--F, the active inequality sets are, respectively,

$$
\{x=0\},\quad\varnothing,\quad\{y=0\},\quad
\{y=0,\ 2y+z=1/2\},\quad\{2y+z=1/2\},\quad
\{x=3/5,\ 2y+z=1/2\}.
$$

At the five transitions the exact data are:

| $t$ | $p^*(t)$ | Active inequalities | Multipliers of active inequalities |
|---|---|---|---|
| $-3/2$ | $(0,1/4,3/4)$ | $x=0$ | $\alpha=0$ |
| $-1$ | $(3/8,0,5/8)$ | $y=0$ | $\beta=0$ |
| $-1/2$ | $(1/2,0,1/2)$ | $y=0, 2y+z=1/2$ | $\beta=1, \rho=0$ |
| $0$ | $(1/2,0,1/2)$ | $y=0, 2y+z=1/2$ | $\beta=0, \rho=1$ |
| $9/5$ | $(3/5,1/10,3/10)$ | $x=3/5, 2y+z=1/2$ | $\delta=0, \rho=3$ |

All other inequality multipliers at these transitions are zero. The adjacent
formulas for $\lambda$ and every inequality multiplier agree there.
At the domain endpoint $-2$, only $x=0$ is active and $\alpha=1$.
At $4$, exactly $x=3/5$ and $2y+z=1/2$ are active, with
$\delta=22/5, \rho=3$. Thus the closed interval endpoints are covered
as well. Zero active multipliers at transitions do not impair the strict
convexity proof of uniqueness.

## Value and regularity

Substituting the optimizers into the objective gives the exact value table
above. The values at the transitions, in increasing order of $t$, are

$$
29/8,\quad55/16,\quad3,\quad5/2,\quad13/25.
$$

The endpoint values are $V(-2)=29/8$ and $V(4)=-53/25$.
The optimizer is continuous and piecewise affine. Differentiating each
value formula gives

$$
V'(t)=-2x^*(t)=
\begin{cases}
0&A,\\
-(9+6t)/4&B,\\
-(5+2t)/4&C,\\
-1&D,\\
-1-t/9&E,\\
-6/5&F.
\end{cases}
$$

The derivatives match at every transition; their values are
$0,-3/4,-1,-1,-6/5$, respectively. Thus $V$ is continuously
differentiable on $[-2,4]$, interpreting derivatives at the outer
endpoints as one-sided derivatives. On the open regimes its second
derivatives are $0,-3/2,-1/2,0,-1/9,0$; each transition has different
left and right second derivatives, so $V$ is not twice differentiable
there. The nonincreasing first derivative also verifies concavity of the
value function, as expected for a minimum of affine functions of $t$.

## Numerical interface

`solution.py` exposes `solve(t)` for finite `int` or `float` arguments in
the stated interval and returns a dictionary with `x`, `y`, `z`, and
`value`. It evaluates these regimes using ordinary floating-point
arithmetic, with shifted expressions near vanishing coordinates, and
evaluates the original objective at the returned point. No tolerance band
is used to merge regimes. The float `1.8` lies just above the exact rational
$9/5$, and the implementation assigns it to F; its preceding float belongs
to E. Importing the module performs no CLI action, printing, or file reads.
Floating-point roundoff, including underflow at subnormal inputs near zero,
is the only numerical approximation; the mathematical formulas and proof
above are exact.
