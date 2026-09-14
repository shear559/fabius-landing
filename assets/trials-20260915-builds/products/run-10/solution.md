# Exact solution of the parametric QP, for all $t\in[-2,4]$

## 0. Problem

$$\min_{x,y,z}\; f_t(x,y,z)=x^2+2y^2+3z^2+xy-yz+(2-2t)x+5y+z$$
$$\text{s.t. } x+y+z=1,\; x\ge0,\; y\ge0,\; z\ge0,\; x\le\tfrac35,\; 2y+z\ge\tfrac12 .$$

## 1. Reduction to two variables and strict convexity

Eliminate $z=1-x-y$ (the only equality constraint). Substituting:

$$g_t(x,y):=f_t(x,y,1-x-y)=4x^2+8xy+6y^2-(5+2t)x-3y+4 .$$

(Full expansion: $x^2+3(1-x-y)^2+2y^2+xy-y(1-x-y)+(2-2t)x+5y+(1-x-y)$, collect $x^2,y^2,xy,x,y$ terms — arithmetic reproduced and checked in `verification.md`.)

The Hessian of $g_t$ is constant in $t$:
$$H=\begin{pmatrix}8&8\\8&12\end{pmatrix},\qquad H_{11}=8>0,\ \det H=96-64=32>0,$$
so $H\succ0$: $g_t$ is **strictly convex** on $\mathbb R^2$ for every $t$. The five remaining inequality constraints, rewritten in $(x,y)$ via $z=1-x-y$, are all **affine**:

$$g_1:x\ge0,\quad g_2:y\ge0,\quad g_3:1-x-y\ge0,\quad g_4:\tfrac35-x\ge0,\quad g_5:2y+z-\tfrac12=y-x+\tfrac12\ge0 .$$

Their common feasible set is a convex polygon $P\subset\mathbb R^2$ (shown to be a pentagon in §2). Because $g_t$ is strictly convex and $P$ is convex and compact, **the minimizer of $g_t$ on $P$ exists and is unique** for every $t$, and — since the problem is convex — **the KKT conditions are necessary and sufficient for global optimality** (Boyd & Vandenberghe, *Convex Optimization*, §5.5.3). Every claim below is proved via this sufficiency, not by search.

## 2. The feasible polygon $P$

For fixed $x\in[0,3/5]$, $y$ must satisfy $y\ge0$, $y\le1-x$, $y\ge x-\tfrac12$, i.e. $y\in[\max(0,x-\tfrac12),\,1-x]$. Since $x\le 3/5<3/4$, one checks $\max(0,x-\tfrac12)\le 1-x$ always holds, so $P$ is nonempty and connected for every $x\in[0,3/5]$. Its boundary is exactly the pentagon with vertices, in order:

| vertex | $(x,y,z)$ | binding constraints |
|---|---|---|
| $A$ | $(0,0,1)$ | $x=0,\;y=0$ |
| $B$ | $(0,1,0)$ | $x=0,\;x+y=1$ |
| $C$ | $(3/5,2/5,0)$ | $x+y=1,\;x=3/5$ |
| $D$ | $(3/5,1/10,3/10)$ | $x=3/5,\;y=x-1/2$ |
| $E$ | $(1/2,0,0)$ | $y=x-1/2,\;y=0$ |

Edges: $AB$ ($x=0$), $BC$ ($x+y=1$), $CD$ ($x=3/5$), $DE$ ($y=x-1/2$, i.e. $2y+z=1/2$), $EA$ ($y=0$).

## 3. KKT system

Write $\nabla g_t=\big(8x+8y-(5+2t),\,8x+12y-3\big)$ and $\nabla g_1=(1,0),\nabla g_2=(0,1),\nabla g_3=(-1,-1),\nabla g_4=(-1,0),\nabla g_5=(-1,1)$.

**Sign convention.** For $\min g_t$ s.t. $g_i(x,y)\ge0$: stationarity is
$$\nabla g_t=\sum_{i=1}^5\mu_i\nabla g_i,\qquad \mu_i\ge0,\qquad \mu_i\,g_i(x,y)=0\ \ (\text{complementary slackness}).$$
$\mu_i$ is also the multiplier of the corresponding original 3‑variable constraint ($\mu_1\!\leftrightarrow\! x\ge0$, $\mu_2\!\leftrightarrow\! y\ge0$, $\mu_4\!\leftrightarrow\! x\le3/5$, $\mu_5\!\leftrightarrow\! 2y+z\ge1/2$); $\mu_3$ is the multiplier of $z\ge0$, recovered on the same footing once $g_3=1-x-y\ge0$ is treated as $z\ge 0$. (Eliminating the single affine equality $x+y+z=1$ by substitution is a standard reduction: it does not change the feasible region's inequality-constraint geometry or the optimizer, and a multiplier $\nu$ for the equality can always be reconstructed from the original three stationarity equations — done explicitly in §6 as a cross-check.)

Because the problem is convex, **any $(x,y)\in P$ together with multipliers satisfying stationarity, non‑negativity and complementary slackness is *the* global minimizer** (uniqueness from strict convexity).

## 4. Unconstrained critical point

Solving $\nabla g_t=0$: $8x+8y=5+2t,\ 8x+12y=3\Rightarrow$
$$x_u(t)=\frac{9+6t}{8},\qquad y_u(t)=-\frac{1+t}{2},\qquad z_u(t)=1-x_u-y_u=\frac{3-2t}{8}.$$
This is the global minimizer of $g_t$ over *all* of $\mathbb R^2$; it is the constrained optimum exactly when it lies in $P$. Checking the five constraints against $x_u,y_u$ gives $t\ge-1.5$ ($g_1$), $t\le-1$ ($g_2$), $t\le1.5$ ($g_3$), $t\le-0.7$ ($g_4$), $t\le-0.9$ ($g_5$); the binding pair is $t\in[-1.5,-1]$. So the unconstrained point is feasible **iff $t\in[-1.5,-1]$**, and there all $\mu_i=0$.

## 5. Sweeping the boundary: every candidate face, exhaustively

The polygon has $5$ vertices and $5$ edges; convexity means the true optimum for each $t$ is either the interior point above or lies on exactly one face (edge‑interior or vertex) whose KKT system has a non‑negative, consistent solution. All 10 faces are checked below; each computation is confirmed against direct evaluation of $f_t$ in `verification.md`.

### 5.1 Vertices $A,B,C$ are *never* optimal, for any $t$

- **$A=(0,0)$:** active $g_1,g_2$. $\nabla g_t(0,0)=(-5-2t,-3)=\mu_1(1,0)+\mu_2(0,1)\Rightarrow\mu_2=-3<0$ always. Excluded for all $t$.
- **$B=(0,1)$:** active $g_1,g_3$. $\nabla g_t(0,1)=(3-2t,9)=\mu_1(1,0)+\mu_3(-1,-1)\Rightarrow\mu_3=-9<0$ always. Excluded for all $t$.
- **$C=(3/5,2/5)$:** active $g_3,g_4$. $\nabla g_t=(3-2t,6.6)=\mu_3(-1,-1)+\mu_4(-1,0)\Rightarrow \mu_3=-6.6<0$ always. Excluded for all $t$.

### 5.2 Edges $BC$ and $CD$ are never optimal at an interior point, for any $t$

- **Edge $BC$** ($x+y=1$): restricted objective $k_t(x)=2x^2-(6+2t)x+7$, critical $x=(3+t)/2\in[0,0.6]\Rightarrow t\in[-3,-1.8]$; but the KKT multiplier there is $\mu_3=2t-3\ge0\Rightarrow t\ge1.5$. No $t$ satisfies both — impossible. Excluded.
- **Edge $CD$** ($x=3/5$): restricted objective in $y$ is $6y^2+1.8y+2.44-1.2t$, with unconstrained critical point at $y=-0.15\notin[0.1,0.4]$ and positive slope throughout $[0.1,0.4]$ (derivative $12y+1.8\ge3>0$), so the edge-restricted minimum is always attained at its endpoint $y=0.1$, i.e. at vertex $D$ — never in the edge's interior.

This eliminates $3$ of $5$ vertices and $2$ of $5$ edges completely, for the entire real line — not just $[-2,4]$. Only $A B,\,EA,\,DE$ (edges) and $E,\,D$ (vertices), plus the interior, remain possible, and §4-§5.3 show these tile $[-2,4]$ exactly with no gaps or overlaps.

### 5.3 The six active regions on $[-2,4]$

**Region 1: $t\in[-2,-3/2]$ — edge $AB$ ($x=0$).**
$g_t(0,y)=6y^2-3y+4$ (independent of $t$!), minimized at $y=1/4\in[0,1]$. Point $(0,\tfrac14,\tfrac34)$.
KKT: only $\mu_1$ can be nonzero. $\nabla g_t(0,\tfrac14)=(2-5-2t,\,0)=\mu_1(1,0)\Rightarrow\mu_1=-3-2t$.
$\mu_1\ge0\iff t\le-1.5$. ✓ matches region.

**Region 2: $t\in[-3/2,-1]$ — interior** (§4): $\big(x,y,z\big)=\Big(\dfrac{9+6t}8,\,-\dfrac{1+t}2,\,\dfrac{3-2t}8\Big)$, all $\mu_i=0$.

**Region 3: $t\in[-1,-1/2]$ — edge $EA$ ($y=0$).**
$g_t(x,0)=4x^2-(5+2t)x+4$, critical $x=(5+2t)/8\in[0,\tfrac12]\iff t\in[-2.5,-0.5]$ (binds at $-0.5$).
KKT: $\nabla g_t(x,0)=(0,\,8x-3)=\mu_2(0,1)\Rightarrow \mu_2=8x-3=2+2t$.
$\mu_2\ge0\iff t\ge-1$. Combined with the edge range: $t\in[-1,-0.5]$. Point $\big(\tfrac{5+2t}8,\,0,\,\tfrac{3-2t}8\big)$.

**Region 4: $t\in[-1/2,0]$ — vertex $E=(1/2,0,1/2)$.**
$\nabla g_t(\tfrac12,0)=(-1-2t,\,1)=\mu_2(0,1)+\mu_5(-1,1)\Rightarrow \mu_5=1+2t,\ \mu_2=1-\mu_5=-2t$.
Both $\ge0\iff t\in[-0.5,0]$.

**Region 5: $t\in[0,9/5]$ — edge $DE$ ($y=x-\tfrac12$).**
Substituting $y=x-\tfrac12$: $h_t(x)=18x^2-(18+2t)x+7$, critical $x=(9+t)/18\in[\tfrac12,\tfrac35]\iff t\in[0,1.8]$.
KKT: $\nabla g_t=(16x-9-2t,\,20x-9)=\mu_5(-1,1)\Rightarrow \mu_5=20x-9=\dfrac{9+10t}{9}\ge0$ for $t\ge-0.9$ (holds throughout). Point $\Big(\tfrac{9+t}{18},\,\tfrac t{18},\,\tfrac{9-2t}{18}\Big)$.

**Region 6: $t\in[9/5,4]$ — vertex $D=(3/5,1/10,3/10)$.**
$\nabla g_t(\tfrac35,\tfrac1{10})=(0.6-2t,\,3)=\mu_4(-1,0)+\mu_5(-1,1)\Rightarrow \mu_5=3,\ \mu_4=2t-3.6=\dfrac{10t-18}{5}$.
$\mu_5=3\ge0$ always; $\mu_4\ge0\iff t\ge1.8$. Since $\mu_5$ stays fixed at $3>0$ and $\mu_4$ only grows with $t$, $D$ remains optimal for **all** $t$ up to $4$ (and beyond) — no further transition occurs inside $[-2,4]$.

These six regions **tile $[-2,4]$ exactly** ($-2\le-\tfrac32\le-1\le-\tfrac12\le0\le\tfrac95\le4$) with the required multiplier non‑negative throughout each closed interval and $=0$ exactly at the two endpoints where a region hands off to its neighbour (verified in each case above) — so consecutive regions agree at the shared breakpoint (see §7). Since §5.1–5.2 exclude every other face for *every* real $t$, this tiling is exhaustive: no candidate is missed.

## 6. Cross-check: multiplier $\nu$ of the eliminated equality constraint

Writing the full 3‑variable stationarity $\nabla f_t=\nu(1,1,1)+\mu_1e_x+\mu_2e_y+\mu_3e_z-\mu_4e_x+\mu_5(0,2,1)$, at vertex $E$ (region 4, $\mu_2=-2t,\mu_5=1+2t$, others $0$) all three scalar equations independently give $\nu=3-2t$:
from $2x+y+2-2t=\nu+\mu_1-\mu_4$: $1+2-2t=\nu\Rightarrow\nu=3-2t$;
from $4y+x-z+5=\nu+\mu_2+2\mu_5$: $0.5-0.5+5=\nu-2t+2+4t\Rightarrow\nu=3-2t$;
from $6z-y+1=\nu+\mu_3+\mu_5$: $3+1=\nu+1+2t\Rightarrow\nu=3-2t$.
All three agree, an independent consistency check of the reduction of §1/§3 (repeated for regions 1,3,5,6 in `verification.md`'s script, always consistent).

## 7. Closed form, continuity, differentiability

$$
(x^*,y^*,z^*)(t)=
\begin{cases}
\left(0,\ \dfrac14,\ \dfrac34\right), & t\in[-2,-\tfrac32]\\[4pt]
\left(\dfrac{9+6t}8,\ -\dfrac{1+t}2,\ \dfrac{3-2t}8\right), & t\in[-\tfrac32,-1]\\[4pt]
\left(\dfrac{5+2t}8,\ 0,\ \dfrac{3-2t}8\right), & t\in[-1,-\tfrac12]\\[4pt]
\left(\dfrac12,\ 0,\ \dfrac12\right), & t\in[-\tfrac12,0]\\[4pt]
\left(\dfrac{9+t}{18},\ \dfrac t{18},\ \dfrac{9-2t}{18}\right), & t\in[0,\tfrac95]\\[4pt]
\left(\dfrac35,\ \dfrac1{10},\ \dfrac3{10}\right), & t\in[\tfrac95,4]
\end{cases}
$$

At each breakpoint the two adjoining formulas agree exactly (substitute $t=-1.5,-1,-0.5,0,1.8$): e.g. at $t=-1$, region 2 gives $x=\tfrac{9-6}8=\tfrac38$, region 3 gives $x=\tfrac{5-2}8=\tfrac38$. So $(x^*,y^*,z^*)$ is **continuous** on $[-2,4]$; it is piecewise-affine (regions 1,3,4,5,6 are affine or constant in $t$) except region 2 where it is affine as well (linear in $t$) — in fact $x^*,y^*,z^*$ are each **continuous and piecewise-linear**, hence Lipschitz.

**Optimal value function** $v(t)=f_t(x^*(t),y^*(t),z^*(t))$:

$$
v(t)=
\begin{cases}
\dfrac{29}{8}, & t\in[-2,-\tfrac32]\\[4pt]
\dfrac{-12t^2-36t+31}{16}, & t\in[-\tfrac32,-1]\\[4pt]
4-\dfrac{(5+2t)^2}{16}, & t\in[-1,-\tfrac12]\\[4pt]
\dfrac52-t, & t\in[-\tfrac12,0]\\[4pt]
\dfrac{45-18t-t^2}{18}, & t\in[0,\tfrac95]\\[4pt]
\dfrac{67-30t}{25}, & t\in[\tfrac95,4]
\end{cases}
$$

Value continuity at breakpoints (numeric, exact fractions): $v(-\tfrac32)=\tfrac{29}{8}$ both sides; $v(-1)=\tfrac{55}{16}$ both sides; $v(-\tfrac12)=3$ both sides; $v(0)=\tfrac52$ both sides; $v(\tfrac95)=\tfrac{13}{25}$ both sides.

**$v$ is $C^1$ on $[-2,4]$.** By the envelope theorem for parametric convex optimization, $v'(t)=\partial_t f_t(x^*(t),\cdot)=-2x^*(t)$ at every point of differentiability, and since $x^*(t)$ is continuous (shown above), $v'(t)=-2x^*(t)$ is continuous everywhere, including at the five breakpoints (checked directly: e.g. at $t=-1$, region 2 gives $v'=-\tfrac32t-\tfrac94=-\tfrac34$ and region 3 gives $v'=-\tfrac{5+2t}4=-\tfrac34$). $v$ need not be $C^2$: regions 2, 3, 5 are quadratic in $t$ (curvature $-3/2,-1/2,-1/9$ respectively — $v$ is concave in $t$ within each region, since $t$ only ever appears linearly inside $f_t$ and the active point is at worst affine in $t$, giving $v$ as an infimum of affine-in-$t$ functions, hence concave overall — consistent with $-3/2,-1/2,-1/9$ each $\le0$ and with $v$ being globally concave, a standard fact for parametric LPs/QPs of this form), while regions 1, 4, 6 are affine (curvature $0$); curvature can jump at breakpoints without breaking $C^1$.

**Why no case was missed.** (i) §1 proves strict convexity, so KKT is necessary+sufficient and the optimizer is unique — there is exactly one correct answer per $t$, not a search problem. (ii) §5.1–5.2 rule out $3$ vertices and $2$ edges *for every real $t$*, using sign contradictions independent of $t$ or of the given interval — this is not a property of $[-2,4]$, it is a property of the whole line, so no enlargement of the interval could resurrect them. (iii) The remaining $3$ candidates (edges $AB,EA,DE$) plus their $2$ shared vertices ($E,D$) plus the interior are shown, region by region, to have non‑negative multipliers on six intervals whose union is exactly $[-2,4]$ with matching endpoints — a complete, non‑overlapping, gap‑free partition. (iv) Two independent numerical checks (`verification.md`) — a fine grid search over the whole polygon at each $t$, and the alternate $\nu$-based full-KKT recomputation in §6 — reproduce the same optimizer and value to floating-point precision, with zero cases of disagreement.
