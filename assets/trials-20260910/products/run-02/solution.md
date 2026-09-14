# Exact solution of the parametric quadratic program

For every real \(t\in[-2,4]\), the minimizer is unique. Write it as
\(p(t)=(x(t),y(t),z(t))\), and write the minimum as \(V(t)\).
The complete formulas are:

| Regime | Parameter interval | \(p(t)\) | \(V(t)\) |
|---|---|---|---|
| A | \([-2,-3/2]\) | \((0,1/4,3/4)\) | \(29/8\) |
| B | \([-3/2,-1]\) | \(((9+6t)/8,-(1+t)/2,(3-2t)/8)\) | \((31-36t-12t^2)/16\) |
| C | \([-1,-1/2]\) | \(((5+2t)/8,0,(3-2t)/8)\) | \(4-(5+2t)^2/16\) |
| D | \([-1/2,0]\) | \((1/2,0,1/2)\) | \(5/2-t\) |
| E | \([0,9/5]\) | \((1/2+t/18,t/18,1/2-t/9)\) | \(5/2-t-t^2/18\) |
| F | \([9/5,4]\) | \((3/5,1/10,3/10)\) | \(67/25-6t/5\) |

Intervals deliberately overlap at endpoints: the adjacent formulas give
exactly the same point and value there.

## Reduction, convexity, and derivation

Eliminate \(z=1-x-y\). The feasible set in the \((x,y)\) plane is

\[
P=\{(x,y):x\ge0,\ y\ge0,\ x+y\le1,\ x\le3/5,\ x-y\le1/2\}.
\]

Its vertices, in boundary order, are
\[
(0,0),\quad(1/2,0),\quad(3/5,1/10),\quad(3/5,2/5),\quad(0,1).
\]
Indeed, on \(0\le x\le1/2\), the lower boundary is \(y=0\);
on \(1/2\le x\le3/5\), it is \(y=x-1/2\);
the upper boundary throughout is \(y=1-x\).
Thus \(P\) is nonempty and compact, so a minimum exists.

The reduced objective and its gradient are
\[
F_t(x,y)=4x^2+8xy+6y^2-(5+2t)x-3y+4,
\]
\[
\nabla F_t=(8x+8y-5-2t,\ 8x+12y-3),\qquad
H=\begin{pmatrix}8&8\\8&12\end{pmatrix}.
\]
For every nonzero \(d=(d_x,d_y)\),
\[
d^THd=8(d_x+d_y)^2+4d_y^2>0.
\]
Consequently the objective is strictly convex on the equality plane,
and there can be at most one feasible minimizer.

The candidate regimes can be obtained directly from the reduced
stationarity equations. On \(x=0\), minimizing in \(y\) gives \(y=1/4\),
and the inward derivative \(F_x=-3-2t\) is nonnegative exactly when
\(t\le-3/2\). Solving \(\nabla F_t=0\) gives regime B; this point
remains feasible until \(y=0\) at \(t=-1\). On \(y=0\), minimizing
in \(x\) gives \(x=(5+2t)/8\); this reaches \(x=1/2\) at
\(t=-1/2\). The corner \((1/2,0)\) then persists until \(t=0\), as
the multiplier calculation below proves.

On the next edge put \(x=1/2+s,\ y=s\), with \(0\le s\le1/10\).
There the objective is
\[
F_t(1/2+s,s)=5/2-t-2ts+18s^2.
\]
Its stationary point is \(s=t/18\), which gives regime E and reaches
the cap \(x=3/5\) at \(t=9/5\). Regime F is that endpoint.
The following certificates prove all these candidates globally optimal,
including the portions where the optimizer stays at a corner.

## KKT convention and exact certificates

Use inequalities in the form \(g_i\le0\):
\[
g_1=-x,\quad g_2=-y,\quad g_3=-z,\quad
g_4=x-3/5,\quad g_5=1/2-2y-z.
\]
Their multipliers are respectively \(\alpha,\beta,\gamma,\delta,\varepsilon\),
all nonnegative. The equality multiplier \(\lambda\) is unrestricted.
Define
\[
L=f_t+\lambda(x+y+z-1)-\alpha x-\beta y-\gamma z
       +\delta(x-3/5)+\varepsilon(1/2-2y-z).
\]
Stationarity in the original three variables means
\[
\begin{aligned}
2x+y+2-2t+\lambda-\alpha+\delta&=0,\\
4y+x-z+5+\lambda-\beta-2\varepsilon&=0,\\
6z-y+1+\lambda-\gamma-\varepsilon&=0.
\end{aligned}
\]

The following multipliers apply on the same **closed intervals** as the
first table. In every row \(\gamma=0\).

| Regime | \(\alpha\) | \(\beta\) | \(\delta\) | \(\varepsilon\) | \(\lambda\) |
|---|---|---|---|---|---|
| A | \(-3-2t\) | 0 | 0 | 0 | \(-21/4\) |
| B | 0 | 0 | 0 | 0 | \(t-15/4\) |
| C | 0 | \(2+2t\) | 0 | 0 | \((6t-13)/4\) |
| D | 0 | \(-2t\) | 0 | \(1+2t\) | \(-3+2t\) |
| E | 0 | 0 | 0 | \(1+10t/9\) | \(-3+11t/6\) |
| F | 0 | 0 | \(2t-18/5\) | 3 | \(3/10\) |

Here is a direct way to verify all entries. With \(\gamma=0\), set
\(\lambda=-6z+y-1+\varepsilon\). The three stationarity equations
then reduce to this formula for \(\lambda\) and
\[
F_x-\alpha+\delta+\varepsilon=0,\qquad
F_y-\beta-\varepsilon=0.
\]
Substitution of each point in the first table gives exactly the second
table. The displayed interval endpoints ensure every inequality
multiplier is nonnegative. Each point is feasible, and a nonzero
multiplier occurs only on a tight constraint, proving complementary
slackness. In particular \(z\ge3/10>0\) throughout, so \(\gamma=0\)
is consistent everywhere.

For completeness, these conditions imply global optimality without any
appeal to numerical optimization or a constraint qualification. Let
\(p\in P\) be a certified point and \(q\in P\) any other point.
Let \(\bar g_i\) be the five reduced affine inequalities and \(\mu_i\)
their multipliers. Reduced stationarity and complementarity give
\[
\nabla F_t(p)^T(q-p)
=-\sum_i\mu_i\bigl(\bar g_i(q)-\bar g_i(p)\bigr)
=-\sum_i\mu_i\bar g_i(q)\ge0.
\]
The exact quadratic expansion is
\[
F_t(q)-F_t(p)=\nabla F_t(p)^T(q-p)
                 +\tfrac12(q-p)^TH(q-p).
\]
It is nonnegative, and strictly positive if \(q\ne p\). Thus the
certificate proves both global optimality and uniqueness. The six
closed intervals cover \([-2,4]\), so no parameter range is omitted.
The inequality holds for **every** feasible point, including every
point on the upper edge \(z=0\), either vertical edge, the lower edges,
and all vertices. This rules out every competing face, whether or not
that face was used to derive the candidates.

## Active sets and all boundary cases

The equality \(x+y+z=1\) is always active. For brevity denote the
inequality constraints by
\(X:x=0\), \(Y:y=0\), \(Z:z=0\),
\(U:x=3/5\), and \(S:2y+z=1/2\).
“Active” means tight, even when its multiplier is zero.

| Parameter set | Active inequalities |
|---|---|
| \([-2,-3/2)\) | \(X\) |
| \((-3/2,-1)\) | none |
| \((-1,-1/2)\) | \(Y\) |
| \((-1/2,0)\) | \(Y,S\) |
| \((0,9/5)\) | \(S\) |
| \((9/5,4]\) | \(U,S\) |

At the five transitions the full data are:

| \(t\) | \(p(t)\) | Active inequalities | Multipliers of active inequalities | \(V(t)\) | \(V'(t)\) |
|---|---|---|---|---|---|
| \(-3/2\) | \((0,1/4,3/4)\) | \(X\) | \(\alpha=0\) | \(29/8\) | 0 |
| \(-1\) | \((3/8,0,5/8)\) | \(Y\) | \(\beta=0\) | \(55/16\) | \(-3/4\) |
| \(-1/2\) | \((1/2,0,1/2)\) | \(Y,S\) | \(\beta=1,\ \varepsilon=0\) | 3 | \(-1\) |
| 0 | \((1/2,0,1/2)\) | \(Y,S\) | \(\beta=0,\ \varepsilon=1\) | \(5/2\) | \(-1\) |
| \(9/5\) | \((3/5,1/10,3/10)\) | \(U,S\) | \(\delta=0,\ \varepsilon=3\) | \(13/25\) | \(-6/5\) |

All unlisted inequality multipliers in this table are zero. The equality
multipliers at these transitions are, in order,
\(-21/4,-19/4,-4,-3,3/10\), and the adjacent regime formulas agree.
Each transition has a tight constraint with zero multiplier; strict
complementarity is therefore not asserted there. At \(t=-2\), the only
active inequality is \(X\), with \(\alpha=1\), and \(V=29/8\).
At \(t=4\), the active inequalities are \(U,S\), with
\(\delta=22/5,\varepsilon=3\), and \(V=-53/25\).
The parameter endpoints do not add constraints on \((x,y,z)\).

## Value regularity and implementation

Direct substitution yields the value formulas in the first table.
Both the optimizer and every displayed multiplier are continuous at
each transition. Differentiating the value polynomials gives
\[
V'(t)=-2x(t)=
\begin{cases}
0 & \text{in A},\\
-(9+6t)/4 & \text{in B},\\
-(5+2t)/4 & \text{in C},\\
-1 & \text{in D},\\
-1-t/9 & \text{in E},\\
-6/5 & \text{in F}.
\end{cases}
\]
The adjacent derivatives coincide at every transition, with values
listed above. Thus \(V\) is continuously differentiable on the closed
interval, with derivatives at its endpoints understood one-sided:
\(V'_+(-2)=0\), \(V'_-(4)=-6/5\). Equivalently, it has a continuously
differentiable extension obtained from the endpoint polynomials.
Its second derivatives on the six open regimes are, respectively,
\(0,-3/2,-1/2,0,-1/9,0\). Since they jump at every transition,
\(V\) has no second derivative at any transition. The nonincreasing
first derivative also shows that \(V\) is concave.

`solution.py` exposes `solve(t)` for an `int` or `float` in the specified
interval. It implements these optimizer formulas, using shifted
expressions near zero coordinates, and evaluates the original objective
at the returned point. It rejects nonfinite and out-of-range inputs.
No code runs on import except the function definition. Float results
are subject to ordinary binary64 rounding; the exact mathematical
formulas and proof above apply to every real parameter in the interval.
