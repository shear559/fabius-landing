# Exact solution of the parametric QP

Minimize, for each real $t\in[-2,4]$,
$$f_t(x,y,z)=x^2+2y^2+3z^2+xy-yz+(2-2t)x+5y+z$$
subject to
$$x+y+z=1,\quad x\ge0,\ y\ge0,\ z\ge0,\quad x\le \tfrac35,\quad 2y+z\ge\tfrac12 .$$

---

## 1. Compact exact answer table

The interval $[-2,4]$ splits into **six** consecutive regimes. In every regime the optimizer
is given by an exact closed form, and the six formulas agree at every shared boundary
(continuity is proved in §5).

| Regime | $t$-range | $x^\*(t)$ | $y^\*(t)$ | $z^\*(t)$ | Active constraints | Optimal value $\varphi(t)=f_t(x^\*,y^\*,z^\*)$ |
|---|---|---|---|---|---|---|
| **A** | $[-2,\,-\tfrac32]$ | $0$ | $\tfrac14$ | $\tfrac34$ | $x\ge0$ | $\dfrac{29}{8}$ |
| **B** | $[-\tfrac32,\,-1]$ | $\dfrac{9+6t}{8}$ | $-\dfrac{1+t}{2}$ | $\dfrac{3-2t}{8}$ | none (interior of the pentagon) | $-\dfrac{3t^2}{4}-\dfrac{9t}{4}+\dfrac{31}{16}$ |
| **C** | $[-1,\,-\tfrac12]$ | $\dfrac{5+2t}{8}$ | $0$ | $\dfrac{3-2t}{8}$ | $y\ge0$ | $-\dfrac{t^2}{4}-\dfrac{5t}{4}+\dfrac{39}{16}$ |
| **D** | $[-\tfrac12,\,0]$ | $\tfrac12$ | $0$ | $\tfrac12$ | $y\ge0$ and $2y+z\ge\tfrac12$ | $\dfrac52-t$ |
| **E** | $[0,\,\tfrac95]$ | $\dfrac{9+t}{18}$ | $\dfrac{t}{18}$ | $\dfrac{1}{2}-\dfrac{t}{9}$ | $2y+z\ge\tfrac12$ | $-\dfrac{t^2}{18}-t+\dfrac52$ |
| **F** | $[\tfrac95,\,4]$ | $\tfrac35$ | $\tfrac1{10}$ | $\tfrac3{10}$ | $x\le\tfrac35$ and $2y+z\ge\tfrac12$ | $\dfrac{67}{25}-\dfrac{6t}{5}$ |

At every $t\in[-2,4]$ this $(x^\*,y^\*,z^\*)$ is the **unique** global minimizer (strict convexity, §2).
Constraint $z\ge0$ is a genuine edge of the feasible region but is **never** active on the optimal
path (see the $z^\*(t)$ column: it stays strictly positive throughout).

Numerical spot values: $\varphi(-2)=\tfrac{29}{8}=3.625$, $\varphi(-\tfrac32)=\tfrac{29}{8}$, $\varphi(-1)=\tfrac{55}{16}$,
$\varphi(-\tfrac12)=3$, $\varphi(0)=\tfrac52$, $\varphi(\tfrac95)=\tfrac{13}{25}$, $\varphi(4)=-\tfrac{53}{25}$.

---

## 2. Geometry: reducing to a planar QP on a pentagon

Eliminate $z=1-x-y$ using the equality constraint. Substituting into $f_t$ and expanding gives,
**for every $t$**,
$$g_t(x,y):=f_t(x,y,1-x-y)=4x^2+6y^2+8xy-(5+2t)\,x-3y+4 .$$
The Hessian of $g_t$ in $(x,y)$ is
$$H=\begin{pmatrix}8&8\\8&12\end{pmatrix},\qquad \det H=32>0,\ \operatorname{tr}H>0,$$
so $H$ is **positive definite** (eigenvalues $10\pm2\sqrt{17}>0$), independent of $t$. Hence $g_t$
is a strictly convex quadratic on $\mathbb R^2$ for every $t$, and the minimization problem below is
a strictly convex QP — it has **at most one** global minimizer, and any point satisfying the KKT
conditions is automatically the global minimizer (KKT is necessary *and* sufficient for a convex
program; Slater's condition holds because the feasible set below has nonempty interior).

Substituting $z=1-x-y$ turns the five inequality constraints into five linear inequalities in
$(x,y)$:
$$x\ge0,\qquad y\ge0,\qquad x+y\le1\ \ (\text{this is }z\ge0),\qquad x\le\tfrac35,\qquad y\ge x-\tfrac12\ \ (\text{this is }2y+z\ge\tfrac12).$$

**The feasible set is the pentagon with vertices (listed counterclockwise)**
$$V_1=(0,0),\quad V_2=\left(\tfrac12,0\right),\quad V_3=\left(\tfrac35,\tfrac1{10}\right),\quad V_4=\left(\tfrac35,\tfrac25\right),\quad V_5=(0,1).$$

*Why exactly these five vertices, and why no facet is redundant:* walk the boundary of
$\{x\ge0\}\cap\{y\ge0\}\cap\{x+y\le1\}\cap\{x\le\tfrac35\}\cap\{y\ge x-\tfrac12\}$.

* For $x\in[0,\tfrac12]$ the bound $y\ge x-\tfrac12$ is $\le 0\le y$, so it is slack; the region is
  $0\le y\le 1-x$ — this is edge $V_1V_5$ (at $x=0$) and edge $V_1V_2$ (at $y=0$, $x\le\tfrac12$).
* At $x=\tfrac12$, $x-\tfrac12=0$ meets $y=0$: this creates vertex $V_2$, where constraints $y\ge0$
  and $y\ge x-\tfrac12$ cross.
* For $x\in[\tfrac12,\tfrac35]$ the binding lower bound is $y\ge x-\tfrac12>0$ (edge $V_2V_3$), while
  $y\le 1-x$ is slack there (since $x-\tfrac12\le\tfrac35-\tfrac12=\tfrac1{10}<1-\tfrac35=\tfrac25$).
* At $x=\tfrac35$ the cap $x\le\tfrac35$ becomes active: this is vertex $V_3$ (crossing of
  $y\ge x-\tfrac12$ and $x\le\tfrac35$), and for fixed $x=\tfrac35$, $y$ ranges over
  $[\tfrac1{10},\tfrac25]$ — edge $V_3V_4$.
* $V_4=(\tfrac35,\tfrac25)$ is where $x\le\tfrac35$ meets $x+y\le1$; edge $V_4V_5$ is $x+y=1$
  down to $V_5=(0,1)$, where it meets $x=0$.

Each of the five constraints is active on exactly one edge (none is implied by the others), so the
pentagon has exactly five facets — nothing was left out and nothing is redundant. (Formal check:
without the cap $x\le\tfrac35$, edges $y=x-\tfrac12$ and $x+y=1$ would meet at $x=\tfrac34$; since
$\tfrac35<\tfrac34$, the cap genuinely truncates the corner, so it is a real facet, confirmed by
the vertex-feasibility check in §6.)

### Why the optimizer moves along this specific path

$g_t$'s **unconstrained** minimizer solves $\nabla g_t=0$:
$$8x+8y=5+2t,\qquad 8x+12y=3\ \Longrightarrow\ x_u(t)=\frac{9+6t}{8},\quad y_u(t)=-\frac{1+t}{2}.$$
This point moves along a straight line as $t$ varies. For very negative $t$ it lies outside the
pentagon on the $x<0$ side; as $t$ increases it crosses into the pentagon ($t=-\tfrac32$), sweeps
through the interior, exits again through the $y=0$ edge ($t=-1$), and for large $t$ the true
constrained optimum gets pinned first to the vertex $V_2$, then slides along edge $V_2V_3$, and
finally locks onto vertex $V_3$ for all $t\ge\tfrac95$. This qualitative story is made exact by the
KKT computation in §5. Intuitively: increasing $t$ makes the linear coefficient $(2-2t)$ on $x$
more negative, i.e. it becomes cheaper (more rewarding) to increase $x$; since $x$ is capped at
$\tfrac35$ by the pentagon, the optimizer is driven monotonically **rightward** (toward larger $x$)
as $t$ grows, sliding along the lower-right boundary of the pentagon once it gets there and finally
sticking to the corner $V_3=(\tfrac35,\tfrac1{10})$ where $x$ cannot increase further.

The diagram `diagram.svg` shows this pentagon and the resulting optimizer path
$(x^\*(t),y^\*(t))$ for $t\in[-2,4]$.

---

## 3. KKT conditions — explicit sign convention

Write the five inequality constraints of the **original** 3-variable problem as
$c_i(x,y,z)\ge0$:
$$c_1=x,\quad c_2=y,\quad c_3=z,\quad c_4=\tfrac35-x,\quad c_5=2y+z-\tfrac12,$$
with gradients $\nabla c_1=(1,0,0)$, $\nabla c_2=(0,1,0)$, $\nabla c_3=(0,0,1)$,
$\nabla c_4=(-1,0,0)$, $\nabla c_5=(0,2,1)$.

For the equality constraint $x+y+z=1$ use a free-sign multiplier $\nu$. The KKT (stationarity,
primal/dual feasibility, complementary slackness) system is:
$$\nabla f_t = \nu(1,1,1)+\sum_{i=1}^5\lambda_i\nabla c_i,\qquad \lambda_i\ge0,\qquad \lambda_i\,c_i=0\quad(i=1,\dots,5),$$
i.e., componentwise, with $F_x=2x+y+2-2t$, $F_y=4y+x-z+5$, $F_z=6z-y+1$,
$$F_x=\nu+\lambda_1-\lambda_4,\qquad F_y=\nu+\lambda_2+2\lambda_5,\qquad F_z=\nu+\lambda_3+\lambda_5 .$$
Because $g_t$ is strictly convex and the feasible set is a convex polytope with nonempty interior
(Slater holds trivially), **a point is the unique global minimizer of $f_t$ on the feasible set if
and only if** it is feasible and this system has a solution $(\nu,\lambda)$ with all $\lambda_i\ge0$
and complementary slackness. We now exhibit, for each of the six regimes, the exact point and the
exact multipliers, and verify all sign conditions.

*(Standing fact, checked in every row of §1: $z^\*(t)>0$ strictly for all $t\in[-2,4]$, so
$\lambda_3=0$ identically — constraint $z\ge0$ never binds, even though it genuinely bounds the
pentagon at the far edge $V_4V_5$.)*

| Regime | Active $c_i$ | Multipliers (all others $=0$) | Sign condition $\Rightarrow$ range |
|---|---|---|---|
| A | $c_1$ | $\nu=\tfrac{21}4,\ \lambda_1=-2t-3$ | $\lambda_1\ge0\iff t\le-\tfrac32$ |
| B | — | $\nu=\tfrac{15}4-t$ | (no sign condition; range fixed by A,C boundaries) |
| C | $c_2$ | $\nu=\tfrac{13}4-\tfrac{3t}2,\ \lambda_2=2t+2$ | $\lambda_2\ge0\iff t\ge-1$; upper end fixed by $x\le\tfrac12$ boundary with D |
| D | $c_2,c_5$ | $\nu=3-2t,\ \lambda_2=-2t,\ \lambda_5=2t+1$ | $\lambda_2\ge0\iff t\le0$;\ $\lambda_5\ge0\iff t\ge-\tfrac12$ |
| E | $c_5$ | $\nu=3-\tfrac{11t}6,\ \lambda_5=\tfrac{10t}9+1$ | $\lambda_5\ge0$ for $t\ge-\tfrac9{10}$ (slack); range fixed by $x\in[\tfrac12,\tfrac35]$ |
| F | $c_4,c_5$ | $\nu=-\tfrac3{10},\ \lambda_4=2t-\tfrac{18}5,\ \lambda_5=3$ | $\lambda_4\ge0\iff t\ge\tfrac95$ |

Each entry solves the $3\times3$ linear stationarity system exactly (verified symbolically, §6).
All listed multipliers are $\ge0$ throughout the stated range, all complementary-slackness
products vanish by construction, and every regime's $(x,y,z)$ is feasible (checked in §6) — hence
by the sufficiency of KKT for this strictly convex program, **each tabulated point is the unique
global minimizer of $f_t$ on its stated range.**

---

## 4. Continuity across every boundary, and why regimes cannot overlap or leave gaps

At each of the five internal boundary points $t=-\tfrac32,-1,-\tfrac12,0,\tfrac95$:

* the position formulas from the two adjacent regimes **agree exactly** (e.g. at $t=-\tfrac32$,
  regime A gives $(0,\tfrac14)$ and regime B's formula gives $x=\frac{9-9}{8}=0,\ y=-\frac{1-3/2}{2}=\tfrac14$);
* the multiplier that is about to switch sign **passes through exactly $0$** there (e.g. regime A's
  $\lambda_1=-2t-3=0$ at $t=-\tfrac32$; regime D's $\lambda_2=-2t=0$ at $t=0$), which is exactly the
  KKT statement that a constraint stops (or starts) binding without any jump — a textbook
  "degenerate" (zero-multiplier) transition, not a discontinuity.

This zero-multiplier matching, verified for **all five** internal boundaries (see §6, "boundary
consistency" check), proves the six pieces glue into one continuous, well-defined optimizer
$(x^\*(t),y^\*(t),z^\*(t))$ on all of $[-2,4]$, with no gap and no overlap: on each open subinterval
the active set is constant and all inactive multipliers are strictly of one sign (so the KKT
solution there is unique and stable), and at the finitely many junction points the two
representations coincide.

Because $g_t$ is strictly convex for every fixed $t$, the minimizer is unique at every $t$; since
the six formulas are continuous and their domains cover $[-2,4]$ exactly, **the piecewise function
above is the complete, single-valued, exact optimizer for every $t\in[-2,4]$.**

### Value function: continuity and differentiability

Let $\varphi(t)=f_t(x^\*(t),y^\*(t),z^\*(t))$ (column 7 of the table in §1). Two independent checks:

1. **Direct substitution at the five junctions** gives matching values:
   $\varphi(-\tfrac32)=\tfrac{29}8$ (both A and B formulas), $\varphi(-1)=\tfrac{55}{16}$ (B,C),
   $\varphi(-\tfrac12)=3$ (C,D), $\varphi(0)=\tfrac52$ (D,E), $\varphi(\tfrac95)=\tfrac{13}{25}$ (E,F).
   So $\varphi$ is continuous on $[-2,4]$.
2. **Envelope theorem.** Since $t$ enters $f_t$ only through the term $(2-2t)x$,
   $\partial f_t/\partial t=-2x$. By the envelope theorem for a parametric optimum with a
   continuously-varying active set, $\varphi'(t)=-2x^\*(t)$ wherever $x^\*$ is continuous — which is
   everywhere. Direct differentiation of each of the six polynomial formulas for $\varphi$
   reproduces $-2x^\*(t)$ **exactly** in every regime (verified symbolically, §6). Since $x^\*(t)$ is
   continuous on $[-2,4]$ (§4 above), $\varphi'$ is continuous, i.e. $\varphi\in C^1[-2,4]$ — the value
   function has no kinks, even though the *optimizer* $(x^\*,y^\*)$ does have kinks in its direction
   (a corner of the pentagon is being traversed at $t=-\tfrac12,0,\tfrac95$).
   $\varphi$ is piecewise quadratic and only $C^1$, not $C^2$, in general (the coefficient of $t^2$
   changes across regimes, e.g. $-\tfrac34$ in B vs. $-\tfrac14$ in C), because the *active set* — hence
   which reduced quadratic governs $g_t$ restricted to the current face — changes at each junction.

---

## 5. Why no parameter range or competing feasible face was missed

The argument is exhaustive, not exploratory:

1. **Convexity reduces "global optimum" to "KKT point".** Because $g_t$ is strictly convex for
   *every* $t\in[-2,4]$ (Hessian positive-definite independent of $t$, §2) and the feasible pentagon
   is a fixed convex polytope, for each $t$ there is exactly one point satisfying KKT, and it is
   automatically the unique global minimizer — no other feasible point, on any face, at any
   parameter value, needs separate consideration once a KKT point is exhibited.
2. **Every face of the pentagon was tested.** The pentagon has exactly $5$ vertices, $5$ edges, and
   $1$ two-dimensional interior — $11$ "faces" in total (§2 shows there are no others: every
   inequality is a genuine, non-redundant facet). For a convex QP, the minimizer over $[-2,4]$ can
   only ever sit in the relative interior of one of these $11$ faces at a time. We derived, for each
   face, the (open) range of $t$ for which the unconstrained/edge-restricted stationary point falls
   in that face's relative interior with correctly signed multipliers:
   * interior (regime B): $t\in(-\tfrac32,-1)$;
   * edge $V_1V_2$ ($y=0$, regime C): $t\in(-1,-\tfrac12)$;
   * edge $V_2V_3$ ($2y+z=\tfrac12$, regime E): $t\in(0,\tfrac95)$;
   * edge $x=0$ interior point (regime A, a single point $(0,\tfrac14)$, valid for a whole
     sub-*range* of $t$ because the unconstrained minimizer's $y$-coordinate is independent of $t$ —
     see §2): $t\in[-2,-\tfrac32)$;
   * vertices $V_2$ (regime D): $t\in(-\tfrac12,0)$; $V_3$ (regime F): $t\in(\tfrac95,4]$.

   The remaining faces — edge $V_3V_4$ ($x=\tfrac35$ with $y$ free), edge $V_4V_5$ ($z=0$), vertices
   $V_1,V_4,V_5$ — were checked explicitly and shown to be **never** optimal for any $t\in[-2,4]$:
   * On edge $V_3V_4$ ($x=\tfrac35$ fixed), $g_t(\tfrac35,y)=6y^2+\tfrac95y+\text{const}(t)$, whose
     unconstrained minimum is at $y=-\tfrac{3}{20}<0$; since the coefficient of $y^2$ is positive,
     $g_t$ is strictly increasing in $y$ throughout $y\ge\tfrac1{10}$, so the minimum over
     $y\in[\tfrac1{10},\tfrac25]$ is always at $y=\tfrac1{10}$, i.e. at vertex $V_3$ — this is exactly
     why $V_3$ (not any relative-interior point of $V_3V_4$) is optimal, for *every* $t$ up to $4$
     and beyond (the coefficient of $y$ on this edge does not involve $t$ at all).
   * $V_1,V_4,V_5$ were tested directly by KKT (§6): at each of them at least one required multiplier
     is negative for every $t\in[-2,4]$, so they are never optimal.
3. **These six ranges are pairwise disjoint, share endpoints exactly (§4), and their union is
   $[-2,4]$** — that was verified by explicit inequality-chasing in §3's right column and confirmed
   numerically in `verification.md`. Hence the case analysis is complete: there is no value of $t$
   in $[-2,4]$, and no feasible face, left unexamined.

---

## 6. What "no missed case" and correctness rest on (computations behind §§2–5)

All of the following were carried out with an independent computer-algebra system (`sympy`) purely
to check arithmetic; the *logic* above (convexity $\Rightarrow$ KKT sufficiency; exhaustive face
enumeration; sign-chasing of multipliers) is what constitutes the proof, and holds regardless of
software. Concretely, the following symbolic identities were verified (see `verification.md` for
exact commands/output):

* $g_t(x,y)=f_t(x,y,1-x-y)=4x^2+6y^2+8xy-(5+2t)x-3y+4$ (direct expansion).
* Hessian of $g_t$ is $\begin{pmatrix}8&8\\8&12\end{pmatrix}$ for all $t$; eigenvalues
  $10\pm2\sqrt{17}$, both $>0$.
* All five pentagon vertices satisfy all five original constraints (with $z=1-x-y$) exactly, as
  fractions.
* For each of the six regimes, substituting the closed-form $(x^\*(t),y^\*(t))$ into the
  $3\times3$ KKT stationarity system with the stated active set (others $=0$) yields a unique
  solution $(\nu,\lambda_i)$, matching the table in §3, for every symbolic $t$.
* Boundary consistency: at each of the five junctions, both adjacent formulas for $(x,y,z)$ agree,
  both formulas for $\varphi(t)$ agree, and the incoming/outgoing multiplier is exactly $0$.
* Envelope identity $\varphi'(t)=-2x^\*(t)$ holds identically (symbolic difference $=0$) in every
  regime.
* Edge $V_3V_4$ is dominated by vertex $V_3$ for all $y\ge\tfrac1{10}$, for every $t$ (the relevant
  linear coefficient $\tfrac95$ does not depend on $t$).

---

## 7. Plain-language summary of the transitions

* **$t\le-\tfrac32$ (A):** the linear pull on $x$ is so weakly negative (or positive) that the true
  cheapest point wants $x<0$; clamped at $x=0$, the best $y$ is $\tfrac14$ regardless of $t$ — moving
  $y$ trades off its own $2y^2$ growth against the $-3y$ term. The optimum is a single fixed point.
* **$-\tfrac32\le t\le-1$ (B):** as $t$ grows, the reward for larger $x$ increases enough that the
  unconstrained sweet spot enters the pentagon's interior — no constraint is binding here at all;
  $(x^\*,y^\*)$ slides in a straight line.
* **$-1\le t\le-\tfrac12$ (C):** the sweet spot's $y$-coordinate would now go negative, so $y$ is
  clamped at $0$; only $x$ keeps responding to $t$.
* **$-\tfrac12\le t\le0$ (D):** $x$ would now want to exceed $\tfrac12$, but going further would
  violate $2y+z\ge\tfrac12$ unless $y$ also increases — and increasing $y$ from $0$ is not yet worth
  it. The optimizer sits exactly at the corner $V_2=(\tfrac12,0)$ where the two constraints meet.
* **$0\le t\le\tfrac95$ (E):** now it *is* worth trading $y$ up to relax the $2y+z\ge\tfrac12$
  constraint and let $x$ keep growing; the optimizer slides along that constraint's edge.
* **$t\ge\tfrac95$ (F):** $x$ hits its hard cap $\tfrac35$ and can grow no more; the optimizer locks
  onto the corner $V_3=(\tfrac35,\tfrac1{10})$ for the rest of the interval.

Throughout, $x^\*(t)$ is non-decreasing in $t$ (checked from the table: $0\to\tfrac35$ monotonically)
— exactly the expected behavior, since larger $t$ uniformly increases the marginal benefit of $x$.
