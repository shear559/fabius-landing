# Exact solution of the parametric QP, for every $t \in [-2,4]$

## 0. Problem

$$\min_{x,y,z}\; f_t(x,y,z)=x^2+2y^2+3z^2+xy-yz+(2-2t)x+5y+z$$

subject to

$$x+y+z=1,\quad x\ge0,\ y\ge0,\ z\ge0,\quad x\le\tfrac35,\quad 2y+z\ge\tfrac12 .$$

---

## 1. Reduction to two variables (exact, not an approximation)

The equality constraint is affine and can be solved for $z$ exactly:
$z=1-x-y$. Substituting is a bijection between $\{(x,y,z): x+y+z=1\}$ and
$\mathbb R^2$, so the 3‑variable problem is *identical* to the following
2‑variable problem (no information is lost):

$$f_t(x,y)=4x^2+8xy+6y^2-(5+2t)x-3y+4 \tag{1}$$

(expand $3(1-x-y)^2-y(1-x-y)+(1-x-y)$ and collect with the other terms; every
coefficient below is checked again by the numerical script in
`verification.md`).

The remaining constraints become, in $(x,y)$:

| name | constraint | as $g_i\le0$ |
|---|---|---|
| $g_1$ | $x\ge0$ | $-x\le0$ |
| $g_2$ | $y\ge0$ | $-y\le0$ |
| $g_3$ | $z=1-x-y\ge0$ | $x+y-1\le0$ |
| $g_4$ | $x\le3/5$ | $x-3/5\le0$ |
| $g_5$ | $2y+z\ge1/2 \iff y\ge x-1/2$ | $x-y-1/2\le0$ |

These five half-planes bound a convex pentagon $P$ with vertices (in order)

$$A=(0,0),\quad B=(\tfrac12,0),\quad C=(\tfrac35,\tfrac1{10}),\quad D=(\tfrac35,\tfrac25),\quad E=(0,1),$$

edges $AB$ ($y=0$), $BC$ ($g_5$: $y=x-\tfrac12$), $CD$ ($x=\tfrac35$), $DE$
($x+y=1$), $EA$ ($x=0$). ($z$ recovers as $1-x-y$; $z\ge0$ is exactly $g_3$,
i.e. staying left of $DE$, which none of the found optima ever approach.)

## 2. Convexity ⇒ KKT is sufficient, not merely necessary

The Hessian of $f_t$ on the *original* $(x,y,z)$ is constant in $t$:

$$H=\begin{pmatrix}2&1&0\\1&4&-1\\0&-1&6\end{pmatrix},$$

leading principal minors $2,\ 7,\ 40$ — all positive, so $H\succ0$: $f_t$ is
**strictly convex on all of $\mathbb R^3$** for every $t$, hence strictly
convex on the affine slice $x+y+z=1$ and on the reduced form (1), whose own
Hessian $\begin{pmatrix}8&8\\8&12\end{pmatrix}$ has trace $20>0$,
determinant $32>0$ — confirms the same thing directly in $(x,y)$.

The feasible pentagon $P$ is a (nonempty, compact) convex polygon. For a
**strictly convex** objective over a **convex** feasible set:

* the minimizer, if it exists, is unique;
* any point that is primal feasible, and admits multipliers making it
  KKT‑stationary with the correct signs and complementary slackness, **is**
  the global minimizer (KKT is sufficient for convex programs, not just
  necessary).

So the strategy below is airtight: for every $t\in[-2,4]$ we exhibit one
feasible point and a valid multiplier certificate. Because $P$ is compact and
$f_t$ continuous, a minimizer always exists, and strict convexity makes it
unique — so there is no other competing point, face, or vertex left to check
once a valid certificate is produced. This is why an exhaustive walk over the
pentagon's other faces ($D$, $E$, edges $CD$/$DE$/$EA$ beyond what is used
below) is unnecessary: uniqueness is already guaranteed by convexity, and the
certificate identifies which unique point it is.

**Sign convention.** Lagrangian $L=f+\sum_i\lambda_i g_i$, $\lambda_i\ge0$,
stationarity $\nabla f+\sum_i\lambda_i\nabla g_i=0$, complementary slackness
$\lambda_i g_i=0$. Gradients: $\nabla g_1=(-1,0)$, $\nabla g_2=(0,-1)$,
$\nabla g_3=(1,1)$, $\nabla g_4=(1,0)$, $\nabla g_5=(1,-1)$, and
$\nabla f_t=(8x+8y-(5+2t),\ 8x+12y-3)$.

## 3. The unconstrained critical line

Setting $\nabla f_t=0$: $8x+8y=5+2t$, $8x+12y=3$. The **second** equation
never involves $t$, so every unconstrained critical point (over all $t\in\mathbb R$)
lies on the fixed line
$$L:\ 8x+12y=3.$$
Solving jointly: $x^\*(t)=\tfrac{9+6t}{8}$, $y^\*(t)=-\tfrac{1+t}{2}$. As $t$
increases from $-2$ to $4$, $x^\*$ increases monotonically from $-3/8$ to
$33/8$ and $y^\*$ decreases monotonically from $1/2$ to $-5/2$: the
unconstrained optimum sweeps rightward along $L$, entering and leaving $P$
exactly once (since $P$ is convex and $L$ is a line, $L\cap P$ is a single
segment). This one fact is what guarantees the optimal path only ever needs
to travel monotonically "rightward" through $P$ — through the interior, then
along the lower/lower‑right boundary — and never needs to detour toward $D$
or $E$; the certificate check in each regime below confirms this formally.

$L\cap P$: on $L$, $y=\tfrac38-x$; this satisfies $y\ge0$ iff $x\le\tfrac38$,
and is automatically inside all other constraints there. So $L\cap P$ is the
segment from $x=0$ (giving $(0,\tfrac38)$, inside edge $EA$, strictly between
$A,E$) to $x=\tfrac38$ (giving $(\tfrac38,0)$, on edge $AB$).

## 4. The six regimes

Six exhaustive, KKT-certified regimes partition $[-2,4]$ with no gaps and
matching values (and matching multipliers-to-zero) at every junction —
verified explicitly below.

### Regime 1 — $t\in[-2,-\tfrac32]$: vertex-adjacent point on edge $EA$ ($x=0$)

Only $g_1$ active. Stationarity on $x=0$: $\partial f/\partial y=0\Rightarrow
12y-3=0\Rightarrow y=\tfrac14$ (independent of $t$ — the $t$-term multiplies
$x=0$). Then $\lambda_1=\partial f/\partial x=8y-(5+2t)=-3-2t$.

$$\boxed{(x,y,z)=(0,\ \tfrac14,\ \tfrac34)},\qquad \lambda_1=-3-2t\ge0\iff t\le-\tfrac32.$$

All other constraints strict: $x+y-1=-\tfrac34<0$, $x-\tfrac35<0$,
$x-y-\tfrac12=-\tfrac34<0$, $y>0$. Valid exactly on $t\in[-2,-\tfrac32]$.

### Regime 2 — $t\in[-\tfrac32,-1]$: interior (no constraint active)

The point sits on $L\cap P$ found in §3:
$$x(t)=\frac{9+6t}{8},\qquad y(t)=-\frac{1+t}{2},\qquad z(t)=1-x-y=\frac{3-2t}{8}.$$
All $\lambda_i=0$ by construction (unconstrained critical point). Feasibility
of the *inactive* constraints must be checked on the whole sub-interval, not
just endpoints, since it is a live region, not a boundary point:

* $x\ge0$: $9+6t\ge0\iff t\ge-1.5$ ✓ (equality exactly at the left end).
* $y\ge0\iff x\le3/8$: $x(-1)=3/8$, and $x(t)$ is increasing, so $x\le3/8$ throughout, equality exactly at the right end $t=-1$.
* $x\le3/5$: $x(-1)=3/8<3/5$ ✓.
* $2y+z\ge\tfrac12$: reduces to $-5-10t\ge4$, i.e. $t\le-0.9$; satisfied with margin on all of $[-1.5,-1]$.

So the point is strictly interior to $P$ on the *open* interval and touches
edge $EA$ at $t=-1.5$, edge $AB$ at $t=-1$ — matching Regimes 1 and 3.

### Regime 3 — $t\in[-1,-\tfrac12]$: edge $AB$ ($y=0$)

Only $g_2$ active. Stationarity: $\partial f/\partial x=0\Rightarrow
8x-(5+2t)=0\Rightarrow x=\tfrac{5+2t}{8}$; $\lambda_2=\partial f/\partial y=8x-3=2t+2$.

$$x(t)=\frac{5+2t}{8},\quad y=0,\quad z(t)=\frac{3-2t}{8},\qquad \lambda_2=2+2t.$$

Range: need $x\in[3/8,1/2]$ (interior of edge $AB$, i.e. between $A$'s side
and vertex $B$) $\Rightarrow t\in[-1,-\tfrac12]$, and independently
$\lambda_2\ge0\iff t\ge-1$. Both agree: valid on $[-1,-\tfrac12]$, matching
Regime 2 at $t=-1$ ($x=3/8,\lambda_2=0$) and reaching vertex $B=(\tfrac12,0)$ at $t=-\tfrac12$.
Inactive-constraint check: $g_5$ at $y=0$ is $x\le\tfrac12$, true on this range with equality only at $t=-\tfrac12$; $g_3,g_4$ strict since $x\le\tfrac12<\tfrac35$.

### Regime 4 — $t\in[-\tfrac12,0]$: vertex $B=(\tfrac12,0)$

$g_2,g_5$ active ($g_1,g_3,g_4$ strict: $x=\tfrac12>0$, $x+y-1=-\tfrac12<0$,
$x-\tfrac35=-\tfrac1{10}<0$). Two active constraints, two multipliers:

$$\partial f/\partial x+\lambda_5=0\Rightarrow \lambda_5=(5+2t)-8x-8y=1+2t,$$
$$\partial f/\partial y-\lambda_2-\lambda_5=0\Rightarrow \lambda_2=(8x+12y-3)-\lambda_5=1-\lambda_5=-2t.$$

$$\boxed{(x,y,z)=(\tfrac12,0,\tfrac12)},\qquad \lambda_5=1+2t\ge0\iff t\ge-\tfrac12,\qquad \lambda_2=-2t\ge0\iff t\le0.$$

Valid exactly on $t\in[-\tfrac12,0]$; at $t=-\tfrac12$, $\lambda_5=0$ (matches Regime 3's $\lambda_2\to$ edge with $g_5$ just touching); at $t=0$, $\lambda_2=0$ (matches Regime 5 below).

### Regime 5 — $t\in[0,\tfrac95]$: edge $BC$ ($g_5$: $y=x-\tfrac12$)

Only $g_5$ active. Substituting $y=x-\tfrac12$ into (1) gives, after
collecting terms, the single-variable quadratic
$f_t(x,x-\tfrac12)=18x^2-(18+2t)x+7$; its minimizer is
$x(t)=\tfrac{9+t}{18}$, and then $y(t)=x(t)-\tfrac12=\tfrac t{18}$,
$z(t)=1-x-y=\tfrac{9-2t}{18}$.

Multiplier: from $\partial f/\partial y=\lambda_5$ (since $g_2,g_3,g_4=0$
coefficients), $\lambda_5=20x-9=\tfrac{9+10t}{9}$ (equivalently from the
$x$-equation $\lambda_5=(5+2t)-16x+4=\tfrac{9+10t}{9}$ — the two agree, a
cross-check on the algebra).

$$x(t)=\frac{9+t}{18},\quad y(t)=\frac t{18},\quad z(t)=\frac{9-2t}{18},\qquad \lambda_5=\frac{9+10t}{9}.$$

Range: interior of edge $BC$ needs $x\in[\tfrac12,\tfrac35]\Rightarrow
t\in[0,\tfrac95]$; and $\lambda_5\ge0\iff t\ge-0.9$, automatically true
here. So the binding restriction is the edge-length condition,
$t\in[0,9/5]$, matching vertex $B$ at $t=0$ ($\lambda_5=1$, matches Regime 4)
and reaching vertex $C=(\tfrac35,\tfrac1{10})$ at $t=\tfrac95$.
Inactive checks: $y=t/18\ge0$ for $t\ge0$ ✓ (equality only at $t=0$); $x\le3/5$ for $t\le9/5$ ✓ (equality only at $t=9/5$); $x+y-1<0$ throughout.

### Regime 6 — $t\in[\tfrac95,4]$: vertex $C=(\tfrac35,\tfrac1{10})$

$g_4,g_5$ active ($g_1,g_2,g_3$ strict: $x=0.6>0$, $y=0.1>0$,
$x+y-1=-0.3<0$).

$$\lambda_4+\lambda_5=(5+2t)-8x-8y=2t-0.6,\qquad \lambda_5=8x+12y-3=3.$$

$$\boxed{(x,y,z)=(\tfrac35,\tfrac1{10},\tfrac3{10})},\qquad \lambda_5=3\ (\text{constant}),\qquad \lambda_4=2t-3.6=\frac{10t-18}{5}.$$

$\lambda_5=3\ge0$ always; $\lambda_4\ge0\iff t\ge\tfrac95$. So this vertex is
valid for **every** $t\ge\tfrac95$ — in particular for all of $[\tfrac95,4]$
— with no further transition inside the given range. (Sanity check: fixing
$x=\tfrac35$ and minimizing over $y\in[\tfrac1{10},\tfrac25]$ along edge $CD$
gives $f_t(\tfrac35,y)=6y^2+1.8y+\text{const}(t)$, whose unconstrained
minimizer is $y=-0.15<\tfrac1{10}$; since this is independent of $t$, the
function is increasing throughout $[\tfrac1{10},\tfrac25]$ for *every* $t$,
so $y=\tfrac1{10}$, i.e. vertex $C$, beats all of edge $CD$ for every $t$,
confirming no seventh regime exists inside $[-2,4]$; vertex $D$ and edge $DE$
are even farther from the fixed line $L$ and are dominated a fortiori by
convexity.)

## 5. Summary — exact optimizer and value for all $t\in[-2,4]$

| $t$-range | $x(t)$ | $y(t)$ | $z(t)$ | active set |
|---|---|---|---|---|
| $[-2,-\frac32]$ | $0$ | $\frac14$ | $\frac34$ | $x=0$ |
| $[-\frac32,-1]$ | $\frac{9+6t}{8}$ | $-\frac{1+t}{2}$ | $\frac{3-2t}{8}$ | none |
| $[-1,-\frac12]$ | $\frac{5+2t}{8}$ | $0$ | $\frac{3-2t}{8}$ | $y=0$ |
| $[-\frac12,0]$ | $\frac12$ | $0$ | $\frac12$ | $y=0,\ 2y+z=\frac12$ |
| $[0,\frac95]$ | $\frac{9+t}{18}$ | $\frac t{18}$ | $\frac{9-2t}{18}$ | $2y+z=\frac12$ |
| $[\frac95,4]$ | $\frac35$ | $\frac1{10}$ | $\frac3{10}$ | $x=\frac35,\ 2y+z=\frac12$ |

$x(t)$ is continuous and monotonically non-decreasing over all six pieces
(checked at each junction above), confirming a single left-to-right sweep
through $P$ with no backtracking — an independent structural confirmation
that nothing was skipped.

**Optimal value function**, obtained by substituting each piece into (1)
(equivalently using $v(t)=4-Q(x(t),y(t))$ where $Q=4x^2+8xy+6y^2$, valid at
any point with $\lambda\cdot(\text{active }g)=0$ pattern used here — or just
direct substitution, both were done and cross-checked):

$$v(t)=\begin{cases}
\dfrac{29}{8} & t\in[-2,-\frac32]\\[6pt]
\dfrac{-12t^2-36t+31}{16} & t\in[-\frac32,-1]\\[6pt]
\dfrac{64-(2t+5)^2}{16} & t\in[-1,-\frac12]\\[6pt]
\dfrac{5-2t}{2} & t\in[-\frac12,0]\\[6pt]
7-\dfrac{(t+9)^2}{18} & t\in[0,\frac95]\\[6pt]
\dfrac{67-30t}{25} & t\in[\frac95,4]
\end{cases}$$

**Continuity of value at junctions** (exact arithmetic):
$v(-\tfrac32)=\tfrac{29}8=\tfrac{58}{16}$ both sides;
$v(-1)=\tfrac{55}{16}$ both sides; $v(-\tfrac12)=3$ both sides; $v(0)=\tfrac52$
both sides; $v(\tfrac95)=\tfrac{13}{25}$ both sides.

**Differentiability of $v$ (envelope theorem).** Since $t$ enters $f_t$ only
through $(2-2t)x$, $\partial f_t/\partial t=-2x$, so by the envelope theorem
$v'(t)=-2x(t)$ at every point of differentiability. $x(t)$ is continuous, so
$v'(t)=-2x(t)$ is continuous too: $v\in C^1[-2,4]$, and one can verify
directly that the two one-sided derivatives at each junction match this
formula ($v'\to0,-\frac34,-\frac34,-1,-1,-1.2,-1.2$ at the six
pieces' interior/boundaries in order — computed independently from the $v(t)$
formulas above and found identical to $-2x(t)$ at each breakpoint). Because
$x(t)$ is monotonically non-decreasing, $v'(t)$ is non-increasing, so $v$ is
**concave** on $[-2,4]$ — consistent with $v$ being a pointwise minimum of
functions ($f_t$ restricted to feasible points) each *affine* in $t$, which
is always concave. $v$ is $C^1$ but not $C^2$ (its second derivative jumps at
the five breakpoints, since $x(t)$'s slope jumps there); this is the expected
regularity for a parametric strictly-convex QP with a linearly perturbed
objective and a polyhedral feasible set.

## 6. Why nothing was missed

1. **Existence & uniqueness** are guaranteed a priori for every $t$ by
   compactness of $P$ (continuous image of a bounded polyhedron) and strict
   convexity of $f_t$ (§2) — so at most one candidate needs to be found per
   $t$, not compared against a list of competitors.
2. **Completeness of coverage**: the six regimes' $t$-ranges are
   $[-2,-\frac32],[-\frac32,-1],[-1,-\frac12],[-\frac12,0],[0,\frac95],[\frac95,4]$,
   whose union is exactly $[-2,4]$ with consecutive endpoints shared —
   verified by listing them (§5); there is no gap and no overlap ambiguity
   (values and points agree exactly at each shared endpoint).
3. **Validity of each piece** was checked two ways per regime: (a) the
   *active* constraints hold with the required sign on the *multiplier*, on
   the stated $t$-subrange only (derived, not assumed), and (b) the
   *inactive* constraints hold strictly there, so no other constraint could
   also be tight and change the KKT system. This rules out hidden extra
   activity within a regime.
4. **No unexplored face**: the unconstrained critical line $L$ (§3) shows the
   optimum can only travel through $P$ along a single monotone sweep as $t$
   increases (since $\nabla f_t$ changes only in its $x$-component, driving
   $x^\*(t)$ monotonically right while pinned to the fixed line $L$ for the
   free-direction part); the pentagon has exactly 5 vertices and 5 edges, and
   the sweep visits $EA\to$ interior $\to AB\to B\to BC\to C$ before running
   out of room at $x=\frac35$ — vertices $D,E$ and edges $CD,DE$ are shown in
   Regime 6's parenthetical to be dominated for *every* $t$ in range (in
   fact, for every $t\ge\frac95$, hence a fortiori here), so they are not
   silently skipped, they are explicitly ruled out.
5. **Boundary of the $t$-domain** ($t=-2$ and $t=4$) are ordinary interior
   points of Regimes 1 and 6 respectively (not additional edge cases): at
   $t=-2$, $\lambda_1=1>0$ strictly; at $t=4$, $\lambda_4=4.4>0$ strictly —
   no further transition is triggered by the domain endpoints themselves.
