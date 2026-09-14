# Exact solution of the parametric QP, for every real $t\in[-2,4]$

## 0. Problem

Minimize
$$f_t(x,y,z)=x^2+2y^2+3z^2+xy-yz+(2-2t)x+5y+z$$
subject to
$$x+y+z=1,\quad x\ge0,\ y\ge0,\ z\ge0,\quad x\le \tfrac35,\quad 2y+z\ge\tfrac12 .$$

We show: for **every** $t\in[-2,4]$ a minimizer exists and is **unique**, give it in closed form on six sub-intervals of $t$, give the KKT multipliers, and prove that the six pieces are the complete list (no case is missing) and that the optimal point and value are continuous — in fact $C^1$ — across every junction.

---

## 1. The problem is a strictly convex program ⇒ KKT is necessary *and* sufficient, and the minimizer is unique

Write $f_t(x,y,z)=\tfrac12 v^{\mathsf T}Mv+b(t)^{\mathsf T}v$ with $v=(x,y,z)^{\mathsf T}$ and
$$M=\begin{pmatrix}2&1&0\\1&4&-1\\0&-1&6\end{pmatrix}.$$
$M$ does not depend on $t$. Its leading principal minors are $2,\ 7,\ 40$, all positive, so by Sylvester's criterion $M$ is **positive definite** on all of $\mathbb R^3$ (its eigenvalues are $4,\ 4-\sqrt6\approx1.551,\ 4+\sqrt6\approx6.449$, all $>0$ — this was checked symbolically). Hence $f_t$ is strictly convex on $\mathbb R^3$ for every $t$, not merely on the constraint plane.

The feasible set
$$C=\{v: x+y+z=1,\ x\ge0,\ y\ge0,\ z\ge0,\ x\le\tfrac35,\ 2y+z\ge\tfrac12\}$$
is the intersection of one hyperplane and five half-spaces, hence a convex polyhedron; it is bounded ($0\le x\le\tfrac35$, $y,z\ge0$, $x+y+z=1$), so it is a **compact polytope**, and it is nonempty (e.g. $(0.3,0.3,0.4)$ is feasible). By Weierstrass a minimizer of the continuous $f_t$ over the compact set $C$ **exists** for every $t$.

Because all constraints are affine, no constraint qualification beyond affineness is needed: for a convex objective with affine constraints, a feasible point satisfying the KKT conditions below is automatically a **global** minimizer, and strict convexity of $f_t$ makes that global minimizer **unique**. So it suffices to *find* a KKT point for each $t$; that this is also sufficient is exactly the classical convex-programming theorem (e.g. Boyd–Vandenberghe, §5.5.3, specialized to affine constraints, which satisfy Slater's condition trivially).

**KKT system used (sign convention).** With Lagrangian
$$L=f_t(x,y,z)-\nu\,(x+y+z-1)-\lambda_1x-\lambda_2y-\lambda_3z-\lambda_4\!\left(\tfrac35-x\right)-\lambda_5\!\left(2y+z-\tfrac12\right),$$
stationarity $\nabla_{x,y,z}L=0$ gives
$$
\begin{aligned}
2x+y+(2-2t)&=\nu+\lambda_1-\lambda_4 &&(\partial_x)\\
4y+x-z+5&=\nu+\lambda_2+2\lambda_5 &&(\partial_y)\\
6z-y+1&=\nu+\lambda_3+\lambda_5 &&(\partial_z)
\end{aligned}
$$
together with **dual feasibility** $\lambda_i\ge0$, **primal feasibility**, and **complementary slackness** $\lambda_1x=\lambda_2y=\lambda_3z=\lambda_4(\tfrac35-x)=\lambda_5(2y+z-\tfrac12)=0$. ($\nu$, the multiplier of the equality constraint, is free in sign.)

---

## 2. Reduction to a 2-D convex QP on a pentagon

Eliminate $z=1-x-y$. Then $f_t$ becomes
$$g_t(x,y):=f_t(x,y,1-x-y)=4x^2+8xy+6y^2-2tx-5x-3y+4,$$
$$\nabla g_t=\begin{pmatrix}8x+8y-5-2t\\8x+12y-3\end{pmatrix},\qquad
H=\begin{pmatrix}8&8\\8&12\end{pmatrix},\ \ \det H=32>0,\ \operatorname{tr}H=20>0,$$
so $H$ (independent of $t$) is positive definite (eigenvalues $10\pm2\sqrt{17}>0$): $g_t$ is a **strictly convex quadratic in $(x,y)$ for every $t$**, confirming Part 1 from a second, independent computation.

The five original inequalities become, in $(x,y)$:
$$c_1: x\ge0,\quad c_2: y\ge0,\quad c_3: x+y\le1\ (\Leftrightarrow z\ge0),\quad c_4: x\le\tfrac35,\quad c_5: y\ge x-\tfrac12\ (\Leftrightarrow 2y+z\ge\tfrac12).$$

**The feasible region $P=\{c_1,\dots,c_5\}$ is a pentagon, and this is exhaustively verified, not assumed.** There are $\binom52=10$ pairs of the five boundary lines; solving each pair and testing the intersection against the other three constraints:

| pair | intersection | feasible? |
|---|---|---|
| $c_1,c_2$ | $(0,0)$ | ✅ $V_1$ |
| $c_1,c_3$ | $(0,1)$ | ✅ $V_5$ |
| $c_1,c_4$ | parallel, no point | — |
| $c_1,c_5$ | $(0,-\tfrac12)$ | ❌ ($y<0$) |
| $c_2,c_3$ | $(1,0)$ | ❌ ($x>\tfrac35$) |
| $c_2,c_4$ | $(\tfrac35,0)$ | ❌ ($y<x-\tfrac12$) |
| $c_2,c_5$ | $(\tfrac12,0)$ | ✅ $V_2$ |
| $c_3,c_4$ | $(\tfrac35,\tfrac25)$ | ✅ $V_4$ |
| $c_3,c_5$ | $(\tfrac34,\tfrac14)$ | ❌ ($x>\tfrac35$) |
| $c_4,c_5$ | $(\tfrac35,\tfrac1{10})$ | ✅ $V_3$ |

Exactly five survive, giving the pentagon (cyclic order)
$$V_1=(0,0)\to V_2=(\tfrac12,0)\to V_3=(\tfrac35,\tfrac1{10})\to V_4=(\tfrac35,\tfrac25)\to V_5=(0,1)\to V_1,$$
with edges $E_{12}=c_2$, $E_{23}=c_5$, $E_{34}=c_4$, $E_{45}=c_3$, $E_{51}=c_1$. (Numerically cross-checked: `scipy.spatial.ConvexHull` on a dense feasibility-grid sample reproduces exactly these 5 vertices and the pentagon's area $0.415=\tfrac{83}{200}$.) A check of all $\binom53=10$ triples of the five lines shows **no three are concurrent**, so the polygon is non-degenerate — every vertex has exactly two active constraints, never three, and the KKT case list below (interior, 5 edges, 5 vertices — 11 cases total) is therefore complete; there is no twelfth "hidden" case.

Since $g_t$ is an *exact* quadratic with $t$-independent Hessian $H$, for fixed $t$
$$g_t(x,y)=\tfrac12(v-v^\*(t))^{\mathsf T}H(v-v^\*(t))+g_t(v^\*(t)),\qquad v^\*(t)=\text{unconstrained minimizer},$$
so **minimizing $g_t$ over $P$ is exactly the $H$-metric projection of the point $v^\*(t)$ onto the fixed pentagon $P$.** Solving $\nabla g_t=0$:
$$x^\*(t)=\tfrac34t+\tfrac98,\qquad y^\*(t)=-\tfrac12t-\tfrac12,\qquad z^\*(t)=1-x^\*-y^\*=\tfrac38-\tfrac14t.$$
This traces a straight line in the plane, moving with $t$ in direction $(\tfrac34,-\tfrac12)$ (i.e. $x^\*$ increasing, $y^\*$ decreasing as $t$ increases).

**When is $v^\*(t)$ itself feasible (all 5 of $c_1,\dots,c_5\ge0$)?** Each is a single linear condition on $t$:
$$c_1\ge0\Leftrightarrow t\ge-\tfrac32,\quad c_2\ge0\Leftrightarrow t\le-1,\quad c_3\ge0\Leftrightarrow t\le\tfrac32,\quad c_4\ge0\Leftrightarrow t\le-\tfrac7{10},\quad c_5\ge0\Leftrightarrow t\le-\tfrac9{10}.$$
Intersection: $t\ge-\tfrac32$ and $t\le\min\{-1,\tfrac32,-\tfrac7{10},-\tfrac9{10}\}=-1$, i.e. **$t\in[-\tfrac32,-1]$**. Outside this sub-interval the unconstrained point is infeasible and the true minimizer must sit on the boundary of $P$.

---

## 3. Exhaustive case analysis — all 11 candidate active sets solved in closed form

For each candidate active set, solve $\nabla g_t=\sum\lambda_i\nabla c_i$ (only over the *active* $c_i$; inactive ones get $\lambda_i=0$), then find the range of $t$ where (a) the resulting point actually lies in the required region of the corresponding face, and (b) all multipliers are $\ge0$. All of this was carried out both by hand and re-derived independently with `sympy` (symbolic, exact-fraction arithmetic) as a cross-check; the two derivations agree to the last digit for every case below.

**Interior ($\lambda_1=\dots=\lambda_5=0$).** Valid exactly when $v^\*(t)\in P$: $t\in[-\tfrac32,-1]$ (Section 2).

**Edge $E_{51}=c_1$ ($x=0$, need $\lambda_2=\lambda_3=\lambda_4=\lambda_5=0$, $\lambda_1\ge0$).** Stationarity in $y$: $g_y(0,y)=12y-3=0\Rightarrow y=\tfrac14$ (independent of $t$; always inside $[0,1]$). $\lambda_1=g_x(0,\tfrac14)=-2t-3\ge0\Leftrightarrow t\le-\tfrac32$. **Valid for $t\le-\tfrac32$.**

**Edge $E_{12}=c_2$ ($y=0$, $\lambda_1=\lambda_3=\lambda_4=\lambda_5=0$, $\lambda_2\ge0$).** $g_x(x,0)=8x-2t-5=0\Rightarrow x=\tfrac{2t+5}8$; need $x\in[0,\tfrac12]$: $x=\tfrac12\Leftrightarrow t=-\tfrac12$; $x=0\Leftrightarrow t=-\tfrac52$ (outside domain, so the lower bound of validity is set by $\lambda_2$, not by the edge geometry). $\lambda_2=g_y(x,0)=8x-3=2t+2\ge0\Leftrightarrow t\ge-1$. **Valid for $t\in[-1,-\tfrac12]$** (this is inside $[0,\tfrac12]$ throughout: at $t=-1$, $x=\tfrac38$; at $t=-\tfrac12$, $x=\tfrac12$).

**Edge $E_{34}=c_4$ ($x=\tfrac35$ alone) — ruled out for every $t$.** Need $g_y(\tfrac35,y)=0\Rightarrow \tfrac{24}5+12y-3=0\Rightarrow y=-\tfrac3{20}$, which is **outside** the required range $y\in[\tfrac1{10},\tfrac25]$ and does not depend on $t$ at all. This active set can never be the optimum, for any real $t$.

**Edge $E_{45}=c_3$ ($x+y=1$ alone) — ruled out on $[-2,4]$.** Tangential stationarity along the edge direction $(1,-1)$ requires $g_x=g_y$ on $y=1-x$, giving $x=\tfrac t2+\tfrac32$; this lies in the required range $[0,\tfrac35]$ only for $t\in[-3,-\tfrac95]$. But the multiplier there is $\lambda_3=2t-3$ (e.g. $\lambda_3=-7$ at $t=-2$), which requires $t\ge\tfrac32$ to be $\ge0$ — **incompatible** with $t\in[-3,-\tfrac95]$. So $E_{45}$ is never a KKT point for any $t\in[-2,4]$ (indeed for any $t$ at all, since the two required ranges for $t$ never overlap).

**Edge $E_{23}=c_5$ ($y=x-\tfrac12$, $\lambda_5\ge0$ only).** Substituting into $\nabla g_t\parallel(-1,1)$ (i.e. $g_x+g_y=0$) gives $x=\tfrac{t+9}{18}$, hence $y=\tfrac t{18}$; and $\lambda_5=g_y=\tfrac{10t+9}9\ge0\Leftrightarrow t\ge-\tfrac9{10}$. Edge range $x\in[\tfrac12,\tfrac35]\Leftrightarrow t\in[0,\tfrac95]$, which already implies $t\ge-\tfrac9{10}$. **Valid for $t\in[0,\tfrac95]$.**

**Vertex $V_1=(0,0)$ ($c_1,c_2$) — ruled out for every $t$.** $\lambda_1=g_x(0,0)=-2t-5$, $\lambda_2=g_y(0,0)=-3$. $\lambda_2=-3<0$ **always** — never a KKT point.

**Vertex $V_2=(\tfrac12,0)$ ($c_2,c_5$).** $\nabla g_t(\tfrac12,0)=(-2t-1,\,1)=\lambda_2(0,1)+\lambda_5(-1,1)\Rightarrow \lambda_5=2t+1,\ \lambda_2=-2t$. Need both $\ge0$: $t\ge-\tfrac12$ and $t\le0$. **Valid for $t\in[-\tfrac12,0]$.**

**Vertex $V_3=(\tfrac35,\tfrac1{10})$ ($c_4,c_5$).** $\nabla g_t(\tfrac35,\tfrac1{10})=(-2t+\tfrac35,\,3)=\lambda_4(-1,0)+\lambda_5(-1,1)\Rightarrow \lambda_5=3,\ \lambda_4=2t-\tfrac{18}5$. Need $\lambda_4\ge0$: $t\ge\tfrac95$. **Valid for $t\ge\tfrac95$**, in particular on $[\tfrac95,4]$.

**Vertex $V_4=(\tfrac35,\tfrac25)$ ($c_3,c_4$) — ruled out for every $t$.** Solving gives $\lambda_3=-\tfrac{33}5<0$ **always** (constant, independent of $t$) — never a KKT point.

**Vertex $V_5=(0,1)$ ($c_1,c_3$) — ruled out for every $t$.** Solving gives $\lambda_3=-9<0$ **always** — never a KKT point.

**Constraint $z\ge0$ is never tight anywhere on $[-2,4]$.** Consistent with the last three exclusions: on the union of the six surviving pieces below, $z$ ranges only over $[0.3,0.75]$; $\lambda_3\equiv0$ throughout the whole domain.

**This exhausts all 11 candidates** (1 interior + 5 edges + 5 vertices) allowed by the non-degenerate pentagon of Section 2. Six of them ($E_{51}$, interior, $E_{12}$, $V_2$, $E_{23}$, $V_3$) have non-empty, mutually adjacent validity windows in $t$; the other five ($E_{34}$, $E_{45}$, $V_1$, $V_4$, $V_5$) are proved above to be impossible for *any* real $t$, not merely outside $[-2,4]$. Nothing has been overlooked.

---

## 4. Assembling the six regions and checking they exactly tile $[-2,4]$

$$
\begin{array}{c|c|c}
t\text{-range} & (x^*,y^*,z^*) & \text{active constraints (KKT multipliers)}\\\hline
[-2,-\tfrac32] & (0,\ \tfrac14,\ \tfrac34) & x\ge0:\ \lambda_1=-2t-3\ge0;\ \ \nu=\tfrac{21}4\\
[-\tfrac32,-1] & \left(\tfrac34t+\tfrac98,\ -\tfrac12t-\tfrac12,\ \tfrac38-\tfrac14t\right) & \text{none};\ \ \nu=\tfrac{15}4-t\\
[-1,-\tfrac12] & \left(\tfrac{2t+5}8,\ 0,\ \tfrac{3-2t}8\right) & y\ge0:\ \lambda_2=2t+2\ge0;\ \ \nu=\tfrac{13}4-\tfrac32t\\
[-\tfrac12,0] & \left(\tfrac12,\ 0,\ \tfrac12\right) & y\ge0,\ 2y{+}z\ge\tfrac12:\ \lambda_2=-2t,\ \lambda_5=2t+1;\ \ \nu=3-2t\\
[0,\tfrac95] & \left(\tfrac{t+9}{18},\ \tfrac t{18},\ \tfrac{9-2t}{18}\right) & 2y{+}z\ge\tfrac12:\ \lambda_5=\tfrac{10t+9}9\ge0;\ \ \nu=3-\tfrac{11}6t\\
[\tfrac95,4] & \left(\tfrac35,\ \tfrac1{10},\ \tfrac3{10}\right) & x\le\tfrac35,\ 2y{+}z\ge\tfrac12:\ \lambda_4=2t-\tfrac{18}5,\ \lambda_5=3;\ \ \nu=-\tfrac3{10}
\end{array}
$$

with $\lambda_3=0$ (i.e. $z\ge0$ inactive) throughout every piece.

Endpoints of consecutive ranges coincide, so the breakpoints are exactly $t=-\tfrac32,-1,-\tfrac12,0,\tfrac95$, and the six ranges tile $[-2,4]$ with no gap and no overlap. **Continuity of the point:** substitute the shared breakpoint into both neighboring formulas — e.g. at $t=-\tfrac32$: edge gives $(0,\tfrac14,\tfrac34)$, interior formula gives $\left(\tfrac34(-\tfrac32)+\tfrac98,\ \tfrac34,\ \tfrac38+\tfrac38\right)=(0,\tfrac14,\tfrac34)$ — identical; and likewise (verified symbolically for all 5 breakpoints) at $t=-1$ both give $(\tfrac38,0,\tfrac58)$, at $t=-\tfrac12$ both give $(\tfrac12,0,\tfrac12)$, at $t=0$ both give $(\tfrac12,0,\tfrac12)$, at $t=\tfrac95$ both give $(\tfrac35,\tfrac1{10},\tfrac3{10})$.

At each breakpoint the multiplier of the constraint that is about to switch (from inactive to active, or vice versa) equals exactly $0$ there — e.g. $\lambda_1=-2t-3=0$ at $t=-\tfrac32$, $\lambda_2=2t+2=0$ at $t=-1$ (both as edge $E_{12}$ starts and as vertex $V_2$'s $\lambda_2$), $\lambda_5=2t+1=0$ at $t=-\tfrac12$ (vertex $V_2$'s $\lambda_5$, matching edge $E_{23}$ starting with $\lambda_5=1$ there — continuous, not necessarily $0$, since $c_5$ is already active on both sides at $t\in[-\tfrac12,\tfrac95]$; only the constraint whose *activity status itself changes* has multiplier $0$ at the switch, namely $c_2$ at $t=0$ where edge $E_{23}$'s formula gives $y=0$ and vertex $V_2$'s $\lambda_2=-2t=0$), and $\lambda_4=2t-\tfrac{18}5=0$ at $t=\tfrac95$. This is the standard picture: **each active-set change happens exactly where the incoming multiplier crosses $0$**, which is what makes the assembled optimizer continuous and, as shown next, differentiable.

**Optimal value function $V(t)=f_t(x^*,y^*,z^*)$, piece by piece:**
$$
V(t)=\begin{cases}
\tfrac{29}8, & t\in[-2,-\tfrac32]\\[2pt]
-\tfrac34t^2-\tfrac94t+\tfrac{31}{16}, & t\in[-\tfrac32,-1]\\[2pt]
-\tfrac14t^2-\tfrac54t+\tfrac{39}{16}, & t\in[-1,-\tfrac12]\\[2pt]
\tfrac52-t, & t\in[-\tfrac12,0]\\[2pt]
-\tfrac1{18}t^2-t+\tfrac52, & t\in[0,\tfrac95]\\[2pt]
\tfrac{67}{25}-\tfrac65t, & t\in[\tfrac95,4]
\end{cases}
$$
Direct substitution (carried out symbolically) shows $V$ **and its derivative** agree at every breakpoint:

| $t$ | $V(t)$ (both sides) | $V'(t)$ (both sides) |
|---|---|---|
| $-\tfrac32$ | $\tfrac{29}8$ | $0$ |
| $-1$ | $\tfrac{55}{16}$ | $-\tfrac34$ |
| $-\tfrac12$ | $3$ | $-1$ |
| $0$ | $\tfrac52$ | $-1$ |
| $\tfrac95$ | $\tfrac{13}{25}$ | $-\tfrac65$ |

so $V$ is $C^1$ on all of $[-2,4]$ (it is in fact $C^\infty$ except at these 5 points, where the pieces are only quadratic/linear so second derivatives may jump — e.g. $V''$ jumps from $0$ to $-\tfrac32$ at $t=-\tfrac32$ — but first-derivative continuity holds everywhere).

**Independent confirmation via the envelope theorem.** Since $t$ enters $f_t$ only through the linear term $-2tx$, for the optimal $x^*(t)$ one must have $V'(t)=\partial_t f_t|_{\text{opt}}=-2x^*(t)$ at every point of differentiability. This was checked against every piece above (e.g. on $[\tfrac95,4]$, $x^*=\tfrac35$ constant and indeed $V'(t)=-\tfrac65=-2\cdot\tfrac35$; on $[-2,-\tfrac32]$, $x^*=0$ and indeed $V'=0$) — an algebraic identity independent of the case-by-case KKT solves, and it holds exactly on all six pieces. It also shows $V$ is **concave** on $[-2,4]$ (it is a pointwise minimum, over the fixed feasible polytope, of functions affine in $t$ — a standard fact for parametric linear-in-parameter QPs), which is corroborated by $V''\le0$ on every piece ($0,-\tfrac32,-\tfrac12,0,-\tfrac19,0$ respectively).

---

## 5. Final answer

For $t\in[-2,4]$, the unique global minimizer of $f_t$ over the feasible set is
$$
(x^*(t),y^*(t),z^*(t))=
\begin{cases}
(0,\ \tfrac14,\ \tfrac34) & -2\le t\le-\tfrac32\\[4pt]
\left(\tfrac34t+\tfrac98,\ -\tfrac12t-\tfrac12,\ \tfrac38-\tfrac14t\right) & -\tfrac32\le t\le-1\\[4pt]
\left(\tfrac{2t+5}8,\ 0,\ \tfrac{3-2t}8\right) & -1\le t\le-\tfrac12\\[4pt]
\left(\tfrac12,\ 0,\ \tfrac12\right) & -\tfrac12\le t\le0\\[4pt]
\left(\tfrac{t+9}{18},\ \tfrac t{18},\ \tfrac{9-2t}{18}\right) & 0\le t\le\tfrac95\\[4pt]
\left(\tfrac35,\ \tfrac1{10},\ \tfrac3{10}\right) & \tfrac95\le t\le4
\end{cases}
$$
with optimal value $V(t)$ as in Section 4, and this is exact, continuous, piecewise-$C^\infty$ and globally $C^1$ on $[-2,4]$, with uniqueness guaranteed at every $t$ by strict convexity (Section 1) and completeness of the case analysis guaranteed by the exhaustive, non-degenerate enumeration of Sections 2–3 (11 candidates checked, 6 realized, 5 proved impossible for any $t$).

`solution.py` implements exactly these six closed-form branches. `verification.md` records the numerical checks performed (feasibility on a dense grid, agreement with an independent multi-start SLSQP solve, breakpoint continuity, the envelope-theorem identity, convex-hull cross-check of the pentagon, and the no-triple-concurrency non-degeneracy check) — all of which passed to within floating-point / solver tolerance, consistent with (but not a substitute for) the closed-form proof above.
