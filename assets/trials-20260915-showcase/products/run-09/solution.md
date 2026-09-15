# Solving $\min f_t(x,y,z)$ on $x+y+z=1$, $x,y,z\ge0$, $x\le 3/5$, $2y+z\ge 1/2$, for $t\in[-2,4]$

## 1. Answer table (exact)

Eliminating $z=1-x-y$ turns the problem into a strictly convex quadratic program
in $(x,y)$ over a fixed pentagon (§2). The parameter $t$ enters **only**
through the linear coefficient of $x$, so as $t$ sweeps $[-2,4]$ the optimizer
sweeps monotonically across the pentagon through exactly six regimes.

| # | $t$-range | $x^\*(t)$ | $y^\*(t)$ | $z^\*(t)$ | Active constraints | Optimal value $v(t)$ |
|---|---|---|---|---|---|---|
| 1 | $[-2,\,-\tfrac32]$ | $0$ | $\tfrac14$ | $\tfrac34$ | $x\ge0$ | $\tfrac{29}{8}$ |
| 2 | $[-\tfrac32,\,-1]$ | $\tfrac{9+6t}{8}$ | $-\tfrac{1+t}{2}$ | $\tfrac{3-2t}{8}$ | none (interior) | $\dfrac{31-36t-12t^2}{16}$ |
| 3 | $[-1,\,-\tfrac12]$ | $\tfrac{5+2t}{8}$ | $0$ | $\tfrac{3-2t}{8}$ | $y\ge0$ | $-\tfrac{t^2}{4}-\tfrac{5t}{4}+\tfrac{39}{16}$ |
| 4 | $[-\tfrac12,\,0]$ | $\tfrac12$ | $0$ | $\tfrac12$ | $y\ge0$, $2y+z\ge\tfrac12$ | $\tfrac52-t$ |
| 5 | $[0,\,\tfrac95]$ | $\tfrac{9+t}{18}$ | $\tfrac{t}{18}$ | $\tfrac{9-2t}{18}$ | $2y+z\ge\tfrac12$ | $-\tfrac{t^2}{18}-t+\tfrac52$ |
| 6 | $[\tfrac95,\,4]$ | $\tfrac35$ | $\tfrac{1}{10}$ | $\tfrac{3}{10}$ | $x\le\tfrac35$, $2y+z\ge\tfrac12$ | $\tfrac{67}{25}-\tfrac{6t}{5}$ |

Regimes are listed as closed intervals; **at every shared endpoint the point
and value from both neighboring formulas agree exactly** (checked in §5,
verified numerically in `verification.md`). The optimizer is therefore a
well-defined, continuous, single-valued function of $t$ on all of $[-2,4]$,
and it is unique at every $t$ (§3).

Two numbers worth remembering: the multiplier of $x\ge0$ vanishes at
$t=-\tfrac32$, the multiplier of $y\ge0$ vanishes at $t=-\tfrac12$, the
multiplier of $2y+z\ge\tfrac12$ never vanishes once it turns on (it stays
$\ge0$, equal to $1$ at $t=0$ and $3$ from $t=\tfrac95$ onward), and the
multiplier of $x\le\tfrac35$ turns on at $t=\tfrac95$. These are exactly the
five breakpoints $-\tfrac32,-1,-\tfrac12,0,\tfrac95$.

## 2. Geometry: eliminating $z$

Substituting $z=1-x-y$ turns the five inequality constraints into a pentagon
in the $(x,y)$-plane (`diagram.svg` shows it):

$$x\ge0,\quad y\ge0,\quad x+y\le1\ (\text{from }z\ge0),\quad x\le\tfrac35,\quad y\ge x-\tfrac12\ (\text{from }2y+z\ge\tfrac12).$$

Its five vertices, reading around the boundary, are

$$A=(0,0),\quad B=\left(\tfrac12,0\right),\quad C=\left(\tfrac35,\tfrac1{10}\right),\quad D=\left(\tfrac35,\tfrac25\right),\quad E=(0,1),$$

with edges $AB:\{y=0\}$, $BC:\{2y+z=\tfrac12\}$, $CD:\{x=\tfrac35\}$,
$DE:\{x+y=1,\text{ i.e. }z=0\}$, $EA:\{x=0\}$. (These are all five edges of
the pentagon; the diagram labels them.)

Substituting $z=1-x-y$ into $f_t$ and expanding (verified symbolically, see
`verification.md`) gives the reduced objective

$$g_t(x,y) \;=\; 4x^2+8xy+6y^2-(5+2t)x-3y+4 \;=\; \varphi(x,y)-(5+2t)x,\qquad
\varphi(x,y):=4x^2+8xy+6y^2-3y+4. \tag{$\star$}$$

The key structural fact, visible directly in $(\star)$: **$t$ enters only
through the coefficient of $x$**. The $y$-dependence, and all curvature, is
completely $t$-independent.

### 2.1 Convexity and uniqueness

The Hessian of $g_t$ is $\begin{pmatrix}8&8\\8&12\end{pmatrix}$, independent of
$t$, with leading minors $8>0$ and $\det=96-64=32>0$: **positive definite**.
Hence $g_t$ is strictly convex on $\mathbb R^2$ for every $t$, and the
pentagon is a nonempty compact convex set. A strictly convex function attains
a **unique** minimum on a convex set, so for every $t\in[-2,4]$ the problem
has exactly one minimizer $(x^*(t),y^*(t))$, and $z^*(t)=1-x^*(t)-y^*(t)$ is
likewise unique. This settles uniqueness once and for all; every regime below
inherits it automatically.

### 2.2 The unconstrained-minimizer line and why the optimum slides monotonically

Set $\nabla g_t=0$:
$$8x+8y-(5+2t)=0,\qquad 8x+12y-3=0.$$
The **second equation does not involve $t$** — it is the fixed line
$$L:\quad 8x+12y=3 .$$
Solving the pair gives the unconstrained minimizer
$x^u(t)=\tfrac{9+6t}{8},\ y^u(t)=-\tfrac{1+t}{2}$, which always lies on $L$;
increasing $t$ only slides this point *along* $L$ (in the direction of
increasing $x$, decreasing $y$). $L$ crosses the pentagon boundary at
$(0,\tfrac14)$ (on edge $EA$) and $(\tfrac38,0)$ (on edge $AB$); for
$x^u(t)\in[0,\tfrac38]$, i.e. $t\in[-\tfrac32,-1]$, the unconstrained minimizer
is already feasible and is therefore the constrained optimum (regime 2).

Outside that range the true optimum must lie on the boundary, and it does so
by *sliding monotonically* rightward and along the boundary. This is not a
coincidence of this particular problem — it is a general and easily proved
fact:

**Lemma (monotone comparative statics).** *If $t_1<t_2$ then $x^*(t_1)\le
x^*(t_2)$.*

*Proof.* Write $g_t(x,y)=\varphi(x,y)-(5+2t)x$ as in $(\star)$. By optimality
of $(x_1,y_1):=(x^*(t_1),y^*(t_1))$ and $(x_2,y_2):=(x^*(t_2),y^*(t_2))$ over
the same feasible set,
$$g_{t_1}(x_1,y_1)\le g_{t_1}(x_2,y_2),\qquad g_{t_2}(x_2,y_2)\le g_{t_2}(x_1,y_1).$$
Adding and cancelling the (identical on both sides) $\varphi$ terms leaves
$$-(5+2t_1)x_1-(5+2t_2)x_2 \;\le\; -(5+2t_1)x_2-(5+2t_2)x_1
\;\Longleftrightarrow\; 2(t_2-t_1)(x_1-x_2)\le0 .$$
Since $t_2>t_1$, this forces $x_1\le x_2$. $\blacksquare$

So $x^*(t)$ is non-decreasing on $[-2,4]$; the optimizer sweeps the pentagon
from left to right (in $x$) exactly once, never backtracking. This is the
qualitative reason the six regimes appear **in the order listed** as $t$
increases, and it is the first half of the completeness argument in §5.

## 3. KKT conditions (sign convention)

Write the five inequality constraints as $g_i(x,y)\le0$:

$$g_1=-x,\quad g_2=-y,\quad g_3=x+y-1,\quad g_4=x-\tfrac35,\quad g_5=x-y-\tfrac12\ \ (\text{from }2y+z\ge\tfrac12).$$

Gradients: $\nabla g_1=(-1,0)$, $\nabla g_2=(0,-1)$, $\nabla g_3=(1,1)$,
$\nabla g_4=(1,0)$, $\nabla g_5=(1,-1)$.

KKT stationarity/feasibility/complementarity at a point $(x,y)$:
$$\nabla g_t(x,y)+\sum_{i=1}^5\lambda_i\nabla g_i(x,y)=0,\qquad
\lambda_i\ge0,\qquad \lambda_i\,g_i(x,y)=0\ \ (i=1,\dots,5).$$

Because $g_t$ is convex and the feasible set is convex, **KKT is necessary
and sufficient** for global optimality (Slater's condition holds trivially —
the constraints are affine, so no constraint qualification issue arises at
all). So exhibiting a feasible point with nonnegative multipliers
satisfying stationarity *proves* it is the global optimum; no separate
numerical check is logically required (though `verification.md` cross-checks
everything numerically as well).

## 4. Regime-by-regime proof

In every regime below: (i) the point is primal feasible (all five $g_i\le0$,
checked), (ii) complementary slackness holds by construction (only the
listed constraints are active, all others strict), (iii) stationarity holds
(by construction — each point solves $\nabla g_t=0$ restricted to the active
set), and (iv) all multipliers are $\ge0$ throughout the stated interval,
with equality exactly at the interval's endpoint(s) where the next/previous
regime takes over. Multiplier expressions were solved from
$\nabla g_t+\sum\lambda_i\nabla g_i=0$ using the sign convention of §3.

**Regime 1, $t\in[-2,-\frac32]$: $(x,y,z)=(0,\frac14,\frac34)$.**
Active: $g_1$ only. Stationarity: $\partial_y g_t(0,\tfrac14)=8(0)+12(\tfrac14)-3=0$ ✓ (unconstrained in $y$).
$\lambda_1=\partial_x g_t(0,\tfrac14)=8(0)+8(\tfrac14)-(5+2t)=-3-2t$. This is
$\ge0 \iff t\le-\tfrac32$, with $\lambda_1=1$ at $t=-2$ and $\lambda_1=0$ at
$t=-\tfrac32$. Feasibility: $y=\tfrac14\in[0,1]$, so $g_2,g_3$ strict; $g_4,g_5$
strict since $x=0<\tfrac35$ and $x-y-\tfrac12=-\tfrac34<0$. All conditions hold
exactly on $[-2,-\tfrac32]$.

**Regime 2, $t\in[-\frac32,-1]$: interior point on $L$.**
No constraint active $\Rightarrow$ all $\lambda_i=0$ and $\nabla g_t=0$
exactly, which is how $(x^*,y^*)=\big(\tfrac{9+6t}8,-\tfrac{1+t}2\big)$ was
derived (§2.2). One checks $x^*\in(0,\tfrac38)$, $y^*\in(0,\tfrac14)$,
$z^*=\tfrac{3-2t}8\in(\tfrac58,\tfrac34)$, and $2y^*+z^*-\tfrac12=\tfrac{-5-10t}8>0$
for $t<-\tfrac9{10}$ (true throughout $[-\tfrac32,-1]$) — strictly interior of
the pentagon, so KKT with all multipliers zero is exactly the unconstrained
condition, and it is valid on this whole sub-interval since this is precisely
where $x^*(t)\in[0,\tfrac38]$ (the portion of $L$ inside the pentagon; §2.2).

**Regime 3, $t\in[-1,-\frac12]$: $(x,y,z)=\big(\tfrac{5+2t}8,0,\tfrac{3-2t}8\big)$.**
Active: $g_2$ only. Stationarity in $x$ (unconstrained direction):
$\partial_xg_t(x,0)=8x-(5+2t)=0\Rightarrow x=\tfrac{5+2t}8$ (this is exactly how
the point is defined). $\lambda_2=\partial_yg_t(x,0)=8x-3=8\cdot\tfrac{5+2t}8-3=2+2t$,
which is $\ge0\iff t\ge-1$, equal to $0$ at $t=-1$ and $1$ at $t=-\tfrac12$.
Feasibility: need $x\in[0,\tfrac35]$ (clear) and $x\le\tfrac12$ (from $g_5\le0$
at $y=0$): $\tfrac{5+2t}8\le\tfrac12\iff t\le-\tfrac12$ — exactly the regime's
right end, where it meets regime 4.

**Regime 4, $t\in[-\frac12,0]$: vertex $B=(\frac12,0,\frac12)$.**
Active: $g_2,g_5$. Solving $\nabla g_t(B)+\lambda_2(0,-1)+\lambda_5(1,-1)=0$
with $\nabla g_t(B)=(-1-2t,\,1)$ gives
$$\lambda_5=1+2t,\qquad \lambda_2=1-\lambda_5=-2t.$$
Both are $\ge0$ exactly for $t\in[-\tfrac12,0]$ (each vanishes at one
endpoint: $\lambda_5=0$ at $t=-\tfrac12$, $\lambda_2=0$ at $t=0$). $B$ is
manifestly feasible ($x=\tfrac12\le\tfrac35$, $2y+z=\tfrac12$ on the nose,
$y=0$ on the nose).

**Regime 5, $t\in[0,\frac95]$: $(x,y,z)=\big(\tfrac{9+t}{18},\tfrac{t}{18},\tfrac{9-2t}{18}\big)$.**
Active: $g_5$ only. Along $g_5=0$ (i.e. $y=x-\tfrac12$), stationarity of the
restricted 1-D function requires the directional derivative
$\partial_xg_t+\partial_yg_t=0$, i.e. $36x-18-2t=0\Rightarrow x=\tfrac{9+t}{18}$
(as defined). The multiplier is $\lambda_5=\partial_yg_t=8x+12y-3$; substituting
the regime-5 point gives $\lambda_5=1+\tfrac{10t}{9}$, which is $\ge0$ throughout
$t\in[0,\tfrac95]$: it equals $1$ at $t=0$ (matching $\lambda_5$ from regime 4
at $t=0$ exactly) and $3$ at $t=\tfrac95$ (matching regime 6 below).
Feasibility: need $x\in[\tfrac12,\tfrac35]$, i.e.
$\tfrac{9+t}{18}\in[\tfrac12,\tfrac35]\iff t\in[0,\tfrac95]$ — exactly the
stated interval.

**Regime 6, $t\in[\frac95,4]$: vertex $C=(\frac35,\frac1{10},\frac3{10})$.**
Active: $g_4,g_5$. $\nabla g_t(C)=(\tfrac35-2t,\,3)$ (constant in its second
entry because $C$ does not move). Solving
$\nabla g_t(C)+\lambda_4(1,0)+\lambda_5(1,-1)=0$ gives
$$\lambda_5=3,\qquad \lambda_4=-\big(\tfrac35-2t\big)-\lambda_5=2t-\tfrac{18}5,$$
both $\ge0$ for $t\ge\tfrac95$ ($\lambda_4=0$ exactly at $t=\tfrac95$, rising to
$4.4$ at $t=4$; $\lambda_5\equiv3>0$). $C$ is feasible with equality in $g_4$
and $g_5$, strict elsewhere.

## 5. Why no regime, range, or competing face was missed

Two independent arguments close every possible gap. Neither relies on
sampling — both are algebraic/structural.

**(a) The six intervals exactly tile $[-2,4]$, with the point and value
matching at every junction.** The regime boundaries are
$-\tfrac32,-1,-\tfrac12,0,\tfrac95$, and by direct substitution:

| $t$ | from the left formula | from the right formula |
|---|---|---|
| $-\tfrac32$ | $(0,\tfrac14,\tfrac34)$, $v=\tfrac{29}{8}$ | $(0,\tfrac14,\tfrac34)$, $v=\tfrac{29}{8}$ |
| $-1$ | $(\tfrac38,0,\tfrac58)$, $v=\tfrac{55}{16}$ | $(\tfrac38,0,\tfrac58)$, $v=\tfrac{55}{16}$ |
| $-\tfrac12$ | $(\tfrac12,0,\tfrac12)$, $v=3$ | $(\tfrac12,0,\tfrac12)$, $v=3$ |
| $0$ | $(\tfrac12,0,\tfrac12)$, $v=\tfrac52$ | $(\tfrac12,0,\tfrac12)$, $v=\tfrac52$ |
| $\tfrac95$ | $(\tfrac35,\tfrac1{10},\tfrac3{10})$, $v=\tfrac{13}{25}$ | $(\tfrac35,\tfrac1{10},\tfrac3{10})$, $v=\tfrac{13}{25}$ |

(these are exact evaluations of the closed forms in §1/§4, also confirmed
numerically in `verification.md`). Each regime's own multiplier(s) reach $0$
exactly at the boundary where the adjacent regime's active set takes over,
and no multiplier is ever negative inside its stated interval, and $[-2,4]=
[-2,-\tfrac32]\cup[-\tfrac32,-1]\cup[-1,-\tfrac12]\cup[-\tfrac12,0]\cup[0,\tfrac95]\cup[\tfrac95,4]$
with no gap and no overlap of interiors. Since §3 shows KKT is sufficient for
global optimality (convex problem), each of the six formulas *is* the global
optimum throughout its stated closed interval, and together they cover all of
$[-2,4]$. There is no leftover $t$ for which none of the six cases applies.

**(b) The remaining faces of the pentagon (vertex $A$, vertex $D$, vertex
$E$, the interior of edge $CD$, the interior of edge $DE$) are ruled out for
*every* $t\in[-2,4]$ at once**, by three static ($t$-independent) facts:

* *Edge $EA$ ($x=0$) can only ever be optimal at $y=\tfrac14$.* Whenever $x=0$
  is active but $y=0$ and $y=1$ (i.e. constraints $g_2,g_3$) are not, the
  $y$-stationarity condition $\partial_yg_t=8(0)+12y-3=0$ must hold — and it
  does not involve $t$ at all. So $y=\tfrac14$ is forced, which is strictly
  inside $(0,1)$. Hence vertex $A=(0,0)$ and vertex $E=(0,1)$ can never be
  the optimizer for any $t$: reaching them along edge $EA$ would require
  $y\in\{0,1\}$, contradicting $y=\tfrac14$.
* *Edge $CD$ ($x=\tfrac35$) can only ever be optimal at $y=\tfrac1{10}$
  (vertex $C$).* The unconstrained-in-$y$ condition on this edge is
  $\partial_yg_t(\tfrac35,y)=8(\tfrac35)+12y-3=\tfrac95+12y=0\Rightarrow
  y=-\tfrac3{20}$, again $t$-independent. Since $-\tfrac3{20}<\tfrac1{10}$
  (the smallest feasible $y$ on this edge) and the restriction of $g_t$ to
  this vertical edge is a convex parabola in $y$ (coefficient $12/2$ in $y^2$,
  cf. $(\star)$) whose vertex lies to the left of the whole feasible range
  $[\tfrac1{10},\tfrac25]$, the function is strictly increasing on that range
  for **every** $t$. So the constrained minimizer on edge $CD$ is *always*
  its left endpoint, $y=\tfrac1{10}$, i.e. vertex $C$ — never any interior
  point of $CD$, and never vertex $D=(\tfrac35,\tfrac25)$.
* *Edge $DE$ ($x+y=1$, i.e. $z=0$) is never active for any $t\in[-2,4]$,*
  because $z^*(t)$ is bounded away from $0$: across the six regimes,
  $z^*(t)\in\{\tfrac34\}\cup[\tfrac58,\tfrac34]\cup[\tfrac12,\tfrac58]\cup
  \{\tfrac12\}\cup[\tfrac3{10},\tfrac12]\cup\{\tfrac3{10}\}$, so
  $\min_{t\in[-2,4]}z^*(t)=\tfrac3{10}>0$ (attained on regime 6). Since
  $z^*(t)\ge\tfrac3{10}$ always, the constraint $x+y\le1$ (equivalently
  $z\ge0$) is never tight, ruling out the entire edge $DE$ and, again, vertex
  $D$ and vertex $E$.

Together, (a) shows the six listed regimes leave no $t$ uncovered, and (b)
shows no other face of the pentagon (2 whole edges and 3 vertices) could ever
have been the answer for any $t$ in the domain — so the case analysis is
exhaustive by construction, not by search.

## 6. The optimal value function: continuity and differentiability

$v(t):=g_t(x^*(t),y^*(t))$, given piecewise in §1. By §5(a) it is continuous
on $[-2,4]$ (matching values at every junction). More is true:

**$v$ is continuously differentiable ($C^1$) on all of $[-2,4]$, with**
$$v'(t) = -2\,x^*(t).$$
This is the envelope theorem: writing $g_t(x,y)=\varphi(x,y)-(5+2t)x$, we have
$\partial_tg_t(x,y)=-2x$, and since the minimizer $(x^*(t),y^*(t))$ is unique
and continuous (§2.1, §5(a)), $v'(t)=\partial_tg_t(x^*(t),y^*(t))=-2x^*(t)$ at
every $t$, including at the five breakpoints (both one-sided derivatives equal
$-2x^*(t)$ there because $x^*$ itself is continuous). Direct differentiation
of each closed form in §1 confirms this identity piece by piece, e.g. regime
2: $v'=-\tfrac{36+24t}{16}=-\tfrac{9+6t}4=-2x^*(t)$; regime 6: $v'=-\tfrac65=-2\cdot\tfrac35$; etc.

Since $x^*(t)$ is non-decreasing (§2.2 Lemma), $v'(t)=-2x^*(t)$ is
**non-increasing**, so $v$ is **concave** on $[-2,4]$ — a single global statement consistent with
every piece (three affine segments, regimes 1, 4, 6, and three strictly
concave quadratic segments, regimes 2, 3, 5, with matching slope at every
junction). $v$ is **not** $C^2$: the second derivative jumps at each of the
five breakpoints (e.g. $v''=0$ just left of $t=-\tfrac32$ but
$v''=-\tfrac32$ just right of it), because the active set — hence the local
curvature contributed by the constraint directions — changes there. This is
the complete, precise answer to "continuity and differentiability of the
value": $v\in C^1([-2,4])$, concave, piecewise smooth with curvature
(not slope) discontinuities exactly at $t\in\{-\tfrac32,-1,-\tfrac12,0,\tfrac95\}$.

## 7. What each transition means, in plain language

* **$t=-\tfrac32$ (regime 1 → 2):** for very negative $t$, the linear term
  $(2-2t)x$ in $f_t$ has a large positive coefficient, so the objective
  strongly penalizes $x>0$ and the optimizer is pinned to the wall $x=0$.
  As $t$ rises past $-\tfrac32$ that penalty weakens enough that letting $x$
  become slightly positive starts to pay off, and the optimizer peels off
  the wall into the interior.
* **$t=-1$ (regime 2 → 3):** moving further right/up along the unconstrained
  minimizer's line $8x+12y=3$, $y$ is heading toward $0$; at $t=-1$ it
  arrives at $y=0$ exactly and cannot decrease further (the region requires
  $y\ge0$), so for $t>-1$ the optimizer is pushed along the floor $y=0$
  instead.
* **$t=-\tfrac12$ (regime 3 → 4):** sliding right along $y=0$, $x$ increases
  until it hits $x=\tfrac12$, which is exactly where the floor $y=0$ meets the
  constraint $2y+z\ge\tfrac12$ (vertex $B$). The optimizer is momentarily
  pinned at this corner.
* **$t=0$ (regime 4 → 5):** past $t=0$, increasing $t$ makes it worthwhile to
  leave the floor $y=0$ and instead slide along the slanted wall
  $2y+z=\tfrac12$ (trading a bit of $y$ for a lot of $x$), because that
  constraint's "resistance" (multiplier) is now the binding one.
* **$t=\tfrac95$ (regime 5 → 6):** sliding up the slanted wall, $x$ reaches
  its cap $\tfrac35$; from here on, both walls $x=\tfrac35$ and
  $2y+z=\tfrac12$ hold simultaneously (vertex $C$), and — as shown in §5(b) —
  the geometry of the problem means it is *never* worth continuing further up
  the $x=\tfrac35$ wall toward $D$, so the optimizer simply stays at $C$ for
  the rest of the interval, $t\in[\tfrac95,4]$.

In short: the optimizer starts pinned to the left wall, crosses the interior
once, walks along the bottom, sits in the bottom-right corner, climbs the
slanted wall, and then sits in the top-right corner of that wall for the rest
of the range — and it never reaches the top of the pentagon at all (§5(b)).

## 8. Diagram

`diagram.svg` shows the pentagon $ABCDE$ (blue) after eliminating $z$, all
five vertices labeled, and the optimizer's $(x,y)$-path (red, numbered 1–6,
matching the six regimes of §1) as $t$ runs from $-2$ to $4$: the fixed point $(0,\tfrac14)$ (regime 1), the
diagonal slide to $(\tfrac38,0)$ (regime 2), the slide along the bottom edge
to vertex $B$ (regime 3), the stop at $B$ (regime 4), the slide up the
slanted edge to vertex $C$ (regime 5), and the stop at $C$ (regime 6). It is
plain SVG (inline styles/colors only, `viewBox`-based so it scales to any
width including mobile) and loads no external resources.
