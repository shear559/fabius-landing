# Exact solution

Write \(p(t)=(x(t),y(t),z(t))\) and \(V(t)=f_t(p(t))\). The unique optimizer and optimal value are as follows. Adjacent rows deliberately include their shared endpoint: their formulas agree there.

| Regime | Parameter interval | \(p(t)\) | \(V(t)\) |
|---|---|---|---|
| I | \([-2,-3/2]\) | \((0,1/4,3/4)\) | \(29/8\) |
| II | \([-3/2,-1]\) | \(((9+6t)/8,-(1+t)/2,(3-2t)/8)\) | \(31/16-9t/4-3t^2/4\) |
| III | \([-1,-1/2]\) | \(((5+2t)/8,0,(3-2t)/8)\) | \(39/16-5t/4-t^2/4\) |
| IV | \([-1/2,0]\) | \((1/2,0,1/2)\) | \(5/2-t\) |
| V | \([0,9/5]\) | \((1/2+t/18,t/18,1/2-t/9)\) | \(5/2-t-t^2/18\) |
| VI | \([9/5,4]\) | \((3/5,1/10,3/10)\) | \(67/25-6t/5\) |

## Reduction and exhaustive derivation

Eliminate \(z=1-x-y\). The feasible polygon is
\[
0\le x\le\frac35,\qquad \max(0,x-\tfrac12)\le y\le1-x,
\]
and the objective becomes
\[
F_t(x,y)=4x^2+8xy+6y^2-(5+2t)x-3y+4.
\]
In particular, this accounts for every feasible point, including the face \(z=0\). The polygon has vertices
\[
(0,0),\quad(1/2,0),\quad(3/5,1/10),\quad(3/5,2/5),\quad(0,1).
\]
For each fixed feasible \(x\), the strictly convex quadratic in \(y\) has unconstrained minimizer \(y_0=1/4-2x/3\). Its distance below the upper bound is
\[
(1-x)-y_0=3/4-x/3\ge11/20>0.
\]
The lower bound is also strictly below the upper bound throughout \([0,3/5]\). Thus the constrained minimizer in \(y\) is
\[
Y(x)=\begin{cases}
1/4-2x/3,&0\le x\le3/8,\\
0,&3/8\le x\le1/2,\\
x-1/2,&1/2\le x\le3/5.
\end{cases}
\]
Consequently the original problem is exactly the minimization on \([0,3/5]\) of
\[
W_t(x)=F_t(x,Y(x))=
\begin{cases}
\frac43x^2-(3+2t)x+\frac{29}{8},&0\le x\le3/8,\\
4x^2-(5+2t)x+4,&3/8\le x\le1/2,\\
18x^2-(18+2t)x+7,&1/2\le x\le3/5.
\end{cases}
\]
The pieces agree at their endpoints. Their derivatives are, respectively,
\[
\frac83x-3-2t,\qquad8x-5-2t,\qquad36x-18-2t.
\]
These derivatives increase strictly on each piece. At \(x=3/8\), both one-sided derivatives equal \(-2-2t\); at \(x=1/2\), the left and right derivatives are \(-1-2t\) and \(-2t\), an upward jump of one. This determines the minimizer exhaustively:

* At \(x=0\), the right derivative is \(-3-2t\), so this endpoint minimizes precisely when \(t\le-3/2\).
* The derivative of the first piece vanishes at \(x=(9+6t)/8\), which lies in \([0,3/8]\) precisely for \(-3/2\le t\le-1\).
* The derivative of the second piece vanishes at \(x=(5+2t)/8\), which lies in \([3/8,1/2]\) precisely for \(-1\le t\le-1/2\).
* The corner \(x=1/2\) minimizes when its left derivative is nonpositive and its right derivative is nonnegative: \(-1/2\le t\le0\).
* The derivative of the third piece vanishes at \(x=(9+t)/18\), which lies in \([1/2,3/5]\) precisely for \(0\le t\le9/5\).
* At \(x=3/5\), the left derivative is \(18/5-2t\), so this endpoint minimizes precisely when \(t\ge9/5\).

Substitution into \(Y(x)\) and \(z=1-x-y\) gives the table. Every feasible point was included in the fixed-\(x\) minimization, and the increasing derivative of \(W_t\) checks its entire interval. No competing face or parameter interval is omitted. In particular, a point on \(z=0\) cannot improve on its fixed-\(x\) minimizer.

## KKT certificate and uniqueness

Use inequality functions
\[
g_1=-x,\quad g_2=-y,\quad g_3=-z,\quad
g_4=x-3/5,\quad g_5=1/2-2y-z,
\]
all with convention \(g_i\le0\), and equality \(h=x+y+z-1=0\). Set
\[
L=f_t+\lambda h+\alpha g_1+\beta g_2+\gamma g_3+\mu g_4+\nu g_5,
\]
where \(\lambda\in\mathbb R\) and \(\alpha,\beta,\gamma,\mu,\nu\ge0\). The three stationarity equations are
\[
\begin{aligned}
2x+y+2-2t+\lambda-\alpha+\mu&=0,\\
4y+x-z+5+\lambda-\beta-2\nu&=0,\\
6z-y+1+\lambda-\gamma-\nu&=0.
\end{aligned}
\]
The following exact multipliers satisfy stationarity and complementary slackness for the optimizer in every row above. As with the optimizer table, the multiplier formulas agree at shared endpoints.

| Regime | \(\lambda\) | \(\alpha\) | \(\beta\) | \(\gamma\) | \(\mu\) | \(\nu\) |
|---|---|---|---|---|---|---|
| I | \(-21/4\) | \(-3-2t\) | 0 | 0 | 0 | 0 |
| II | \(t-15/4\) | 0 | 0 | 0 | 0 | 0 |
| III | \((6t-13)/4\) | 0 | \(2+2t\) | 0 | 0 | 0 |
| IV | \(-3+2t\) | 0 | \(-2t\) | 0 | 0 | \(1+2t\) |
| V | \(-3+11t/6\) | 0 | 0 | 0 | 0 | \(1+10t/9\) |
| VI | \(3/10\) | 0 | 0 | 0 | \(2t-18/5\) | 3 |

For a short direct substitution check, \(\gamma=0\) throughout and the equality gives the equivalent stationarity identities
\[
\lambda=-6z+y-1+\nu,\quad
8x+8y-5-2t-\alpha+\mu+\nu=0,\quad
8x+12y-3-\beta-\nu=0.
\]
Every listed inequality multiplier is nonnegative on its stated closed interval. Each potentially nonzero multiplier corresponds to an equality constraint at the listed optimizer, so complementary slackness holds, including zero multipliers at the transitions.

The feasible set is nonempty (for example, \((0,1/4,3/4)\) is feasible), closed and bounded, so a minimizer exists. The Hessian of the original objective is
\[
H=\begin{pmatrix}2&1&0\\1&4&-1\\0&-1&6\end{pmatrix}.
\]
Its leading principal minors are \(2,7,40\), all positive, so it is positive definite. For any feasible \(q\) and any listed optimizer \(p\), the quadratic identity and stationarity give
\[
\begin{aligned}
f_t(q)-f_t(p)
&=\nabla f_t(p)^T(q-p)+\tfrac12(q-p)^TH(q-p)\\
&=-\sum_{i=1}^5 m_i g_i(q)+\tfrac12(q-p)^TH(q-p)\ge0,
\end{aligned}
\]
where \((m_1,\ldots,m_5)=(\alpha,\beta,\gamma,\mu,\nu)\). Here the equality term vanishes, and \(\sum_i m_i g_i(p)=0\) by complementarity. The first term is nonnegative by feasibility and dual nonnegativity; the second is strictly positive whenever \(q\ne p\). This proves global optimality and uniqueness for every real \(t\in[-2,4]\), including all boundaries, without relying on numerical optimization or on a constraint qualification.

## Active sets and regime boundaries

Here “active” means the constraint holds with equality, whether or not its multiplier is positive. The equality \(x+y+z=1\) is active throughout and is omitted from the following lists. Abbreviate \(X: x=0\), \(Y:y=0\), \(C:x=3/5\), and \(D:2y+z=1/2\). The constraint \(z\ge0\) is never active.

| Parameter set | Active inequalities |
|---|---|
| \([-2,-3/2)\) | \(X\) |
| \(t=-3/2\) | \(X\), with \(\alpha=0\) |
| \((-3/2,-1)\) | none |
| \(t=-1\) | \(Y\), with \(\beta=0\) |
| \((-1,-1/2)\) | \(Y\) |
| \(t=-1/2\) | \(Y,D\), with \(\beta=1,\nu=0\) |
| \((-1/2,0)\) | \(Y,D\) |
| \(t=0\) | \(Y,D\), with \(\beta=0,\nu=1\) |
| \((0,9/5)\) | \(D\) |
| \(t=9/5\) | \(C,D\), with \(\mu=0,\nu=3\) |
| \((9/5,4]\) | \(C,D\) |

In the open regime interiors, all active inequality multipliers are strictly positive; inactive multipliers are zero. At \(t=-2\), \(\alpha=1\). At \(t=4\), \(\mu=22/5\) and \(\nu=3\). The multiplier table gives the equality multiplier and all remaining zeros also at these endpoints. The active inequality gradients together with the equality gradient are linearly independent at every listed point, so the displayed multipliers are unique even when an active multiplier is zero.

The transition points and values are

| \(t\) | \(p(t)\) | \(V(t)\) |
|---|---|---|
| \(-3/2\) | \((0,1/4,3/4)\) | \(29/8\) |
| \(-1\) | \((3/8,0,5/8)\) | \(55/16\) |
| \(-1/2\) | \((1/2,0,1/2)\) | \(3\) |
| \(0\) | \((1/2,0,1/2)\) | \(5/2\) |
| \(9/5\) | \((3/5,1/10,3/10)\) | \(13/25\) |

## Regularity of the value and implementation

Both the optimizer and the multipliers are continuous across all transitions. Direct differentiation of the value formulas gives
\[
V'(t)=-2x(t)=\begin{cases}
0,&-2<t<-3/2,\\
-9/4-3t/2,&-3/2<t<-1,\\
-5/4-t/2,&-1<t<-1/2,\\
-1,&-1/2<t<0,\\
-1-t/9,&0<t<9/5,\\
-6/5,&9/5<t<4.
\end{cases}
\]
The adjacent derivatives agree at every transition, with respective values \(0,-3/4,-1,-1,-6/5\). Thus \(V\) is continuous on the closed interval and continuously differentiable on its interior, with continuous one-sided derivative extensions \(V'_+(-2)=0\), \(V'_-(4)=-6/5\). Equivalently it is \(C^1\) on the closed interval in this standard one-sided sense. Its second derivatives in the six interiors are \(0,-3/2,-1/2,0,-1/9,0\); hence \(V\) is not twice differentiable at any transition. It is concave and nonincreasing.

`solution.py` exposes `solve(t)` and returns ordinary Python floats for `x`, `y`, `z`, and `value`. It implements the same six formulas, using shifted expressions near transitions to reduce cancellation, and evaluates the original objective at the returned coordinates. It has no import-time I/O. It rejects nonnumeric types, booleans, and parameters outside the finite stated interval. All formulas in this document are exact real identities; the implementation is subject only to ordinary floating-point rounding, including unavoidable underflow at the smallest positive subnormal parameters. It does not use a tolerance to merge adjacent regimes.
