# Exact solution of the parametric QP, for every $t\in[-2,4]$

## 0. Problem statement

$$
\min_{x,y,z}\; f_t(x,y,z) = x^2+2y^2+3z^2+xy-yz+(2-2t)x+5y+z
$$
subject to
$$
x+y+z=1,\quad x\ge 0,\; y\ge 0,\; z\ge 0,\quad x\le \tfrac35,\quad 2y+z\ge \tfrac12 .
$$

## 1. Reduction to two variables

Eliminate $z=1-x-y$ using the equality constraint. A direct expansion (verified with `sympy`, see §7) gives

$$
g_t(x,y):=f_t(x,y,1-x-y)=4x^2+8xy+6y^2-(5+2t)x-3y+4 .
$$

The remaining four inequalities become, in $(x,y)$ alone,

$$
h_1=x\ge0,\quad h_2=y\ge0,\quad h_3=\tfrac35-x\ge0,\quad h_4=1-x-y\ge0\ (\text{from }z\ge0),\quad h_5=-x+y+\tfrac12\ge0\ (\text{from }2y+z\ge\tfrac12).
$$

So the problem is: minimize $g_t$ over the polygon $P=\{h_1,\dots,h_5\ge0\}\subset\mathbb R^2$, which **does not depend on $t$** — only the linear part of the objective does.

### 1.1 The feasible polygon is a fixed pentagon

Intersecting the five half-planes (every pair of the five boundary lines was tested for feasibility; see §7, `polygon.py`) yields exactly five vertices, each formed by two constraints becoming simultaneously active, and no others:

| vertex | coordinates $(x,y)$ | $z=1-x-y$ | active pair |
|---|---|---|---|
| $V_1$ | $(0,0)$ | $1$ | $h_1,h_2$ |
| $V_2$ | $(1/2,0)$ | $1/2$ | $h_2,h_5$ |
| $V_3$ | $(3/5,1/10)$ | $3/10$ | $h_3,h_5$ |
| $V_4$ | $(3/5,2/5)$ | $0$ | $h_3,h_4$ |
| $V_5$ | $(0,1)$ | $0$ | $h_1,h_4$ |

Traversing $V_1\to V_2\to V_3\to V_4\to V_5\to V_1$ traces the boundary of a convex pentagon (each consecutive pair shares exactly one active constraint, giving the five edges $h_2=0$, $h_5=0$, $h_3=0$, $h_4=0$, $h_1=0$ respectively). Since $P$ is the intersection of five half-planes it is convex automatically; exhibiting these five vertices with these five edges shows all five constraints are non‑redundant and that $P$ is exactly this pentagon — nothing is missing and nothing is slack.

### 1.2 Strict convexity $\Rightarrow$ unique global minimizer

Write $g_t(x,y)=v^\top M v - (5+2t)x-3y+4$ with $v=(x,y)^\top$ and
$$
M=\begin{pmatrix}4&4\\4&6\end{pmatrix},\qquad \det M = 24-16=8>0,\ \operatorname{tr}M=10>0.
$$
$M$ is symmetric positive‑definite (both eigenvalues positive), so $g_t$ is **strictly convex** on $\mathbb R^2$ for every $t$. The feasible pentagon $P$ is compact and convex and non‑empty. Hence for **every** $t$:

* a minimizer exists (continuous function on a compact set),
* it is **unique** (strict convexity: if $u\neq v$ both minimized $g_t$ on convex $P$, the midpoint would give a strictly smaller value, contradiction),
* the **KKT conditions are both necessary and sufficient** for global optimality (strictly convex objective, convex feasible region defined by affine constraints ⇒ Slater's condition holds trivially and KKT ⇔ global optimum).

This is the backbone of the whole proof: to solve the problem for a given $t$ it suffices to *exhibit one point together with KKT multipliers of the correct sign*; uniqueness then guarantees nothing else needs to be checked for that $t$.

## 2. The unconstrained critical line

$$
\nabla g_t = \big(8x+8y-(5+2t),\; 8x+12y-3\big) = 0
\;\Longrightarrow\;
x^\star(t)=\tfrac34t+\tfrac98,\qquad y^\star(t)=-\tfrac12t-\tfrac12 .
$$

Only the $x$-equation involves $t$; the $y$-equation, $8x+12y=3$, is the **same for every $t$**. Consequently, as $t$ ranges over $\mathbb R$, the unconstrained minimizer $(x^\star(t),y^\star(t))$ sweeps a **fixed line** $L:8x+12y=3$, moving monotonically ($dx^\star/dt=3/4>0$, $dy^\star/dt=-1/2<0$).

Because $g_t(x,y)-g_t(x^\star,y^\star)=(v-v^\star)^\top M(v-v^\star)$ (an identity verified symbolically in §7), minimizing $g_t$ over any subset of $P$ is exactly the problem of finding the point of that subset closest to $v^\star(t)$ **in the $M$-metric**. As $v^\star(t)$ slides monotonically along the fixed line $L$, its $M$-metric projection onto the fixed convex pentagon $P$ moves monotonically along the boundary of $P$ (a standard non‑expansiveness property of projection onto a convex set applied to a monotone family of targets). This is *why* a systematic sweep through the faces of $P$ in a fixed cyclic order is guaranteed to find the optimizer for every $t$, and why, once the active face starts moving in one direction as $t$ increases, it never has to backtrack.

## 3. KKT system

Standard form: feasible set $\{h_i\ge0\}$, Lagrangian stationarity
$$
\nabla g_t(x,y)=\sum_{i=1}^5 \lambda_i\,\nabla h_i(x,y),\qquad \lambda_i\ge0,\qquad \lambda_i\,h_i(x,y)=0\ \ (i=1,\dots,5).
$$
($\lambda_i \ge 0$ is the *explicit sign convention* used throughout: $\lambda_i$ is the multiplier of the constraint written in the "$\ge 0$" form given in §1.)

Equivalently, in the original three variables, with $\nu$ the (sign‑free) multiplier of the equality $x+y+z=1$ and $\mu_1,\dots,\mu_5\ge0$ the multipliers of $x\ge0,\,y\ge0,\,z\ge0,\,\tfrac35-x\ge0,\,2y+z-\tfrac12\ge0$ respectively,
$$
\nabla f_t = \nu(1,1,1)+\mu_1(1,0,0)+\mu_2(0,1,0)+\mu_3(0,0,1)+\mu_4(-1,0,0)+\mu_5(0,2,1),
$$
with complementary slackness $\mu_i\cdot(\text{constraint value})=0$.

For every candidate face below, $\mu_3=0$ throughout (verified: $z^\star(t)\in[0.3,0.75]>0$ for all $t\in[-2,4]$, so $z\ge0$ is never active), which is consistent with the reduced 2‑variable system: $\mu_1=\lambda_1,\mu_2=\lambda_2,\mu_4=\lambda_3,\mu_5=\lambda_5$, and $\lambda_4$ (for $h_4$, i.e. $z\ge0$) is likewise always $0$ except that $h_4$ never binds either (shown in §5). All values below were produced and cross-checked by exact symbolic linear-algebra (`scratch/full_kkt.py`, `scratch/kkt3d.py`); only the results are reproduced here.

## 4. The six regions

Sweeping the pentagon's boundary in the direction dictated by §2 (starting from the edge $h_1=0$ for very negative $t$, ending at vertex $V_3$ for large $t$) produces exactly six pieces. Each was solved by writing the stationarity equations for a specific active set, solving for $(x,y)$ and the multipliers as functions of $t$, and then computing the exact range of $t$ for which **both** (a) the multiplier(s) of the newly active constraint(s) are $\ge0$ and (b) all *other* $h_i\ge0$ remain satisfied. The two boundary types are different for edges: one boundary of an edge's validity is where the incoming multiplier crosses $0$ (dual feasibility fails ⇒ hand off to the interior/previous face), the other is where a *different* constraint's value hits $0$ (primal feasibility fails ⇒ hand off to the next vertex). Both were solved exactly with `sympy` inequality solving (`scratch/rigor.py`), not just checked numerically.

Recall $z=1-x-y$ throughout.

### Region 1 — $t\in[-2,\,-3/2\,]$ — edge $h_1=0$ ($x=0$), interior point

Only $h_1$ active. Stationarity in the $y$–direction, $8x+12y-3=0$ at $x=0$, gives $y=1/4$ **independent of $t$** (the $y$-equation never involves $t$). So
$$
(x,y,z)=\Big(0,\ \tfrac14,\ \tfrac34\Big)\quad\text{(constant on this whole sub-range).}
$$
Multiplier: $\mu_1=\lambda_1=-2t-3$. Requiring $\lambda_1\ge0$ gives exactly $t\le-3/2$; combined with the domain floor $t\ge-2$, this is $[-2,-3/2]$. ($h_2,h_3,h_4,h_5$ at this point equal $\tfrac14,\tfrac35,\tfrac34,\tfrac34>0$, all strictly positive and independent of $t$ — never a concern.) Equality multiplier: $\nu=21/4$.

**Value:** $f_t=\dfrac{29}{8}$ (constant).

### Region 2 — $t\in[-3/2,\,-1\,]$ — interior of $P$

No constraint active; $(x,y)=(x^\star(t),y^\star(t))=\left(\tfrac34t+\tfrac98,\,-\tfrac12t-\tfrac12\right)$, i.e.
$$
z=\tfrac38-\tfrac t4 .
$$
Feasibility of all five $h_i\ge0$ simultaneously reduces (exact `sympy` solve of the conjunction of five linear inequalities in $t$) to precisely $-\tfrac32\le t\le-1$: the lower end is where $h_1=x^\star=0$ turns on, the upper end is where $h_2=y^\star=0$ turns on; $h_3,h_4,h_5$ stay strictly positive throughout the open interval. Equality multiplier: $\nu = 15/4-t$; all $\lambda_i=0$.

**Value:** $f_t=-\dfrac34t^2-\dfrac94t+\dfrac{31}{16}$.

### Region 3 — $t\in[-1,\,-1/2\,]$ — edge $h_2=0$ ($y=0$)

Only $h_2$ active. Stationarity in $x$: $8x-(5+2t)=0\Rightarrow x=\tfrac{5+2t}8$, so
$$
(x,y,z)=\left(\frac{5+2t}{8},\ 0,\ \frac{3-2t}{8}\right).
$$
Multiplier $\lambda_2=2t+2\ge0\iff t\ge-1$ (this is the lower boundary — dual feasibility failing below $t=-1$ hands back to the interior). The upper boundary is primal: $h_5=\tfrac12-x\ge0\iff t\le-\tfrac12$ becomes tight exactly at $t=-\tfrac12$ (while $h_1,h_3,h_4$ stay strictly positive on $(-1,-\tfrac12)$: e.g. $h_3=\tfrac35-x>0$ needs $t<-\tfrac1{10}$, which is slack here). Equality multiplier: $\nu=13/4-\tfrac32t$.

**Value:** $f_t=-\dfrac14t^2-\dfrac54t+\dfrac{39}{16}$.

### Region 4 — $t\in[-1/2,\,0\,]$ — vertex $V_2=(1/2,0)$

Both $h_2,h_5$ active: $(x,y,z)=(1/2,0,1/2)$. Solving the $2\times2$ multiplier system gives $\lambda_2=-2t$, $\lambda_5=2t+1$. Both $\ge0$ exactly for $t\in[-\tfrac12,0]$ (the two sign conditions bound the interval from *both* sides — a genuine vertex range, not a half-open one). Equality multiplier: $\nu=3-2t$.

**Value:** $f_t=\dfrac52-t$.

### Region 5 — $t\in[0,\,9/5\,]$ — edge $h_5=0$ ($2y+z=1/2$, i.e. $y=x-\tfrac12$)

Only $h_5$ active. Substituting $y=x-\tfrac12$ into stationarity and solving gives
$$
(x,y,z)=\left(\frac12+\frac t{18},\ \frac t{18},\ \frac12-\frac t9\right).
$$
Multiplier $\lambda_5=\tfrac{10}9t+1\ge0\iff t\ge-\tfrac9{10}$ — slack throughout this whole region, so it is **not** what bounds this piece. The true bounds are primal: $h_2=y\ge0\iff t\ge0$ (lower) and $h_3=\tfrac1{10}-\tfrac t{18}\ge0\iff t\le\tfrac95$ (upper); $h_1,h_4$ stay strictly positive throughout. Equality multiplier: $\nu=3-\tfrac{11}6t$.

**Value:** $f_t=-\dfrac1{18}t^2-t+\dfrac52$.

### Region 6 — $t\in[9/5,\,4\,]$ — vertex $V_3=(3/5,1/10)$

Both $h_3,h_5$ active: $(x,y,z)=(3/5,\,1/10,\,3/10)$. Multipliers $\lambda_3=2t-\tfrac{18}5$, $\lambda_5=3$. $\lambda_5\ge0$ always; $\lambda_3\ge0\iff t\ge\tfrac95$, and this condition **never turns off again for larger $t$** — it keeps increasing. So this face remains optimal for every $t$ up to and including the right end of the domain, $t=4$. (Why it never has to hand off to edge $h_3$/vertex $V_4$: see §5.) Equality multiplier: $\nu=-3/10$ (constant).

**Value:** $f_t=\dfrac{67}{25}-\dfrac65t$.

## 5. Why no region or face was missed

The pentagon has $5$ vertices, $5$ edges, and $1$ interior — $11$ faces in total. Six were used above and together they **exactly tile** $[-2,4]$:
$$
[-2,-\tfrac32]\cup[-\tfrac32,-1]\cup[-1,-\tfrac12]\cup[-\tfrac12,0]\cup[0,\tfrac95]\cup[\tfrac95,4]=[-2,4],
$$
with the value and both coordinates matching exactly at every one of the five interior breakpoints ($t=-\tfrac32,-1,-\tfrac12,0,\tfrac95$; checked symbolically, §7). By the necessity+sufficiency of KKT for this strictly convex problem (§1.2), whenever a face's multiplier signs are all $\ge0$ and its point is primal‑feasible, that point **is** the unique global minimizer for that $t$ — no further search is needed for that $t$. Since the six ranges cover $[-2,4]$ with no gap, every $t$ in the domain is accounted for; since the problem is strictly convex, no two different faces can *both* be correct for the same $t$ (uniqueness), so the tiling could not have overlapped even before checking.

For completeness — to positively confirm the remaining $5$ faces truly never apply on $[-2,4]$ (and not merely "were not needed") — each was checked directly:

* **Vertex $V_1=(0,0)$** ($h_1,h_2$ active): solving gives $\lambda_{h_2}=-3$, a constant, **always negative**. $V_1$ never satisfies KKT for *any* $t$.
* **Vertex $V_4=(3/5,2/5)$** ($h_3,h_4$ active): $\lambda_{h_4}=-33/5<0$ always. Never valid.
* **Vertex $V_5=(0,1)$** ($h_1,h_4$ active): $\lambda_{h_4}=-9<0$ always. Never valid.
* **Edge $h_3=0$ alone** ($x=3/5$, $y$ free on $[1/10,2/5]$): the unconstrained-in-$y$ critical point is $y^\star=-3/20$ — a constant (this coordinate's stationarity equation never involves $t$) that lies **outside** $[1/10,2/5]$ for every $t$. So the minimum of $g_t$ restricted to this edge is always attained at its endpoint $y=1/10$, i.e. always collapses into vertex $V_3$ — exactly the face used in Region 6, for all $t$.
* **Edge $h_4=0$ alone** ($x+y=1$, i.e. $z=0$): solving gives multiplier $\lambda_{h_4}=2t-3$, requiring $t\ge3/2$ for dual feasibility, while primal feasibility of the free coordinate on the segment $V_4V_5$ requires $t\le-9/5$. These two requirements are disjoint ($3/2 > -9/5$), so this face is **never** simultaneously primal- and dual-feasible for *any* real $t$ — $z=0$ never occurs anywhere on $[-2,4]$ (consistent with $z^\star(t)\in[0.3,0.75]$ found directly in every region above).

Every one of the $11$ faces has thus been either used (with an exact, non-empty, correctly-signed validity interval) or explicitly excluded (with a proof that its sign/feasibility conditions cannot hold on $[-2,4]$, or anywhere). This is the complete case analysis; nothing was left unchecked.

## 6. The value function: continuity and differentiability

Collecting the six pieces,
$$
V(t)=\min f_t=
\begin{cases}
\dfrac{29}{8}, & -2\le t\le-\dfrac32,\\[2mm]
-\dfrac34t^2-\dfrac94t+\dfrac{31}{16}, & -\dfrac32\le t\le-1,\\[2mm]
-\dfrac14t^2-\dfrac54t+\dfrac{39}{16}, & -1\le t\le-\dfrac12,\\[2mm]
\dfrac52-t, & -\dfrac12\le t\le0,\\[2mm]
-\dfrac1{18}t^2-t+\dfrac52, & 0\le t\le\dfrac95,\\[2mm]
\dfrac{67}{25}-\dfrac65t, & \dfrac95\le t\le4.
\end{cases}
$$

**Continuity.** Evaluating adjacent pieces at each of the five breakpoints gives, symbolically, equal values: $V(-3/2)=29/8$, $V(-1)=55/16$, $V(-1/2)=3$, $V(0)=5/2$, $V(9/5)=13/25$ from both sides (verified exactly with `sympy`, §7). $V$ is continuous on $[-2,4]$.

**Differentiability (envelope theorem).** For any *fixed* feasible $(x,y,z)$, $f_t$ is affine in $t$ with slope $-2x$ (the only $t$-dependence in $f_t$ is the term $-2tx$). Hence $V(t)=\min_{\text{feasible}}\big[(\text{terms not containing }t)-2tx\big]$ is a pointwise minimum of a family of affine functions of $t$ — therefore **concave** on all of $\mathbb R$, in particular on $[-2,4]$. A concave function that is piecewise-$C^1$ and whose one-sided derivatives agree at every breakpoint is $C^1$. Direct differentiation confirms exactly this: $V'(-3/2)=0$ on both sides, $V'(-1)=-3/4$ on both sides, $V'(-1/2)=-1$ on both sides, $V'(0)=-1$ on both sides, $V'(9/5)=-6/5$ on both sides (§7). Equivalently, by the envelope theorem $V'(t)=\partial f_t/\partial t\big|_{\text{optimum}}=-2x^\star(t)$, and $x^\star(t)$ (the optimal $x$, tabulated in §4) is itself continuous across every breakpoint — automatically forcing $V'$ to be continuous. So **$V$ is $C^1$ on all of $[-2,4]$** (it is *not* $C^2$: the second derivative jumps from $0$ to $-3/2$ at $t=-3/2$, etc., because the active set changes there), and the optimizer $(x^\star,y^\star,z^\star)$ is continuous — but only *piecewise-differentiable* — in $t$, matching a change of active set at each of the five breakpoints.

**Zero multipliers at the breakpoints.** At every breakpoint, the multiplier of the constraint about to switch on/off is exactly zero: $\lambda_1=0$ at $t=-3/2$ (Region 1/2 boundary), $\lambda_2=0$ at $t=-1$ (Region 2/3) and again at $t=0$ (Region 4/5, where $\lambda_2=-2t=0$), $\lambda_5=0$ at $t=-1/2$ (Region 3/4, where $\lambda_5=2t+1=0$), and $\lambda_3=0$ at $t=9/5$ (Region 5/6, where the multiplier from Region 6 gives $\lambda_3=2t-18/5=0$). This is precisely the standard mechanism by which the value function of a parametric convex QP is $C^1$: there is never a "jump" in the shadow price of a constraint at the moment it becomes active, because it enters continuously from $0$.

## 7. Symbolic/numeric artifacts referenced above

All claims above were produced by (and cross-checked against) exact symbolic computation, not by numerical optimization alone (`sympy`, exact rational arithmetic throughout):

* `scratch/reduce.py` — derives $g_t(x,y)$ from $f_t$ by eliminating $z$, and re-derives the unconstrained critical point.
* `scratch/polygon.py` — enumerates all $\binom52=10$ pairwise intersections of the five boundary lines and keeps only the $5$ that are feasible, confirming the pentagon's vertex list.
* `scratch/analyze.py` — verifies the identity $g_t(x,y)-g_t(x^\star,y^\star)=(v-v^\star)^\top M(v-v^\star)$ used for the $M$-metric projection argument, and computes the raw (unsigned) projection onto each edge as a first pass.
* `scratch/full_kkt.py` / `scratch/kkt3d.py` — solves the exact $2$-variable and $3$-variable KKT stationarity systems (symbolically, in $t$) for every region used, producing the multiplier formulas quoted in §4.
* `scratch/rigor.py` — solves, exactly and symbolically, the full conjunction of feasibility/dual-feasibility inequalities defining each region's $t$-interval (not just spot-checking the endpoints), confirming every interval in §4 verbatim.
* `scratch/other_faces.py` — checks the five unused faces (§5) and shows each is infeasible/dual-infeasible for all $t$, or for all real $t$.
* `scratch/crosscheck.py` — an *independent* numerical confirmation: `scipy.optimize.minimize` (SLSQP, $6$ random restarts per $t$) run at $28$ values of $t$ spanning the domain and straddling every breakpoint by $\pm10^{-6}$, compared against the closed-form formulas above; maximum discrepancy in $(x,y,z)$ and in the objective value was $\approx1.2\times10^{-8}$ (solver tolerance), with correct primal feasibility throughout.

(This numerical run is corroborating evidence only; the proof of optimality is the exact KKT argument in §§1–5, per the strict-convexity necessity-and-sufficiency argument.)

## 8. Summary table

| $t$-range | active constraints | $(x,y,z)$ | optimal value $f_t$ |
|---|---|---|---|
| $[-2,-3/2]$ | $x\ge0$ | $\left(0,\ \tfrac14,\ \tfrac34\right)$ | $\tfrac{29}{8}$ |
| $[-3/2,-1]$ | none (interior) | $\left(\tfrac{6t+9}8,\ -\tfrac{t+1}2,\ \tfrac{3-2t}8\right)$ | $-\tfrac34t^2-\tfrac94t+\tfrac{31}{16}$ |
| $[-1,-1/2]$ | $y\ge0$ | $\left(\tfrac{5+2t}8,\ 0,\ \tfrac{3-2t}8\right)$ | $-\tfrac14t^2-\tfrac54t+\tfrac{39}{16}$ |
| $[-1/2,0]$ | $y\ge0,\ 2y+z\ge\tfrac12$ | $\left(\tfrac12,\ 0,\ \tfrac12\right)$ | $\tfrac52-t$ |
| $[0,9/5]$ | $2y+z\ge\tfrac12$ | $\left(\tfrac12+\tfrac t{18},\ \tfrac t{18},\ \tfrac12-\tfrac t9\right)$ | $-\tfrac1{18}t^2-t+\tfrac52$ |
| $[9/5,4]$ | $x\le\tfrac35,\ 2y+z\ge\tfrac12$ | $\left(\tfrac35,\ \tfrac1{10},\ \tfrac3{10}\right)$ | $\tfrac{67}{25}-\tfrac65t$ |

All boundary values agree between adjacent rows (checked exactly), $x,y,z\ge0$, $x+y+z=1$, $x\le3/5$ and $2y+z\ge1/2$ hold throughout (checked exactly per region in §4), and this is the **unique** global minimizer for every $t\in[-2,4]$ by §1.2.
