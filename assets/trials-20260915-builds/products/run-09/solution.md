# Exact solution of the parametric QP, for all real $t\in[-2,4]$

## 0. Problem statement

For $t\in[-2,4]$, minimize

$$f_t(x,y,z)=x^2+2y^2+3z^2+xy-yz+(2-2t)x+5y+z$$

subject to

$$x+y+z=1,\quad x\ge0,\ y\ge0,\ z\ge0,\quad x\le\tfrac35,\quad 2y+z\ge\tfrac12 .$$

All constraints are affine, so the feasible set $F_t=F$ (it does not depend on $t$) is a fixed convex polytope. We will show $F$ is a two‑dimensional convex polygon (a pentagon), that $f_t$ is strictly convex, and derive the unique minimizer as an explicit function of $t$.

## 1. Reduction to two variables

Eliminate $z=1-x-y$ using the equality constraint. A direct expansion (verified with a CAS) gives

$$f_t(x,y):=f_t(x,y,1-x-y)=4x^2+8xy+6y^2+(-5-2t)x-3y+4. \tag{1}$$

**Hessian / strict convexity.** $\nabla^2 f_t=\begin{pmatrix}8&8\\8&12\end{pmatrix}$ for every $t$ (only the linear part depends on $t$). Its leading minors are $8>0$ and $\det=8\cdot12-8^2=32>0$, so $\nabla^2 f_t\succ0$: $f_t$ is **strictly convex on $\mathbb R^2$**, for every $t$. Consequently $f_t(x,y,z)$ restricted to the plane $x+y+z=1$ is strictly convex, and the global minimizer over any convex subset of that plane, if it exists, is **unique**.

**The feasible region in $(x,y)$.** Substituting $z=1-x-y$, the five inequalities become

$$g_1:\,x\ge0,\quad g_2:\,y\ge0,\quad g_3:\,x+y\le1,\quad g_4:\,x\le\tfrac35,\quad g_5:\,y\ge x-\tfrac12 .$$

This is an intersection of $5$ half‑planes, hence a convex polygon; it is bounded ($0\le x\le3/5$, $0\le y\le1-x\le1$), hence compact. Tracing each bounding line and intersecting it with the other four constraints (elementary linear algebra, done exhaustively below in §5) shows the polygon has **exactly five vertices**:

$$V_1=(0,0),\quad V_2=(\tfrac12,0),\quad V_3=(\tfrac35,\tfrac1{10}),\quad V_4=(\tfrac35,\tfrac25),\quad V_5=(0,1),$$

joined in this cyclic order by edges
$$A: x=0\ (V_1\!-\!V_5),\quad B: y=0\ (V_1\!-\!V_2),\quad E: y=x-\tfrac12\ (V_2\!-\!V_3),\quad D: x=\tfrac35\ (V_3\!-\!V_4),\quad C: x+y=1\ (V_4\!-\!V_5).$$

(No other pair of the five constraint‑lines produces a *feasible* vertex — e.g. $x=0\wedge x=\tfrac35$ is empty, $y=0\wedge x=\tfrac35$ gives $(\tfrac35,0)$ which violates $g_5$ since $0<\tfrac35-\tfrac12$. This is confirmed exhaustively in §5.)

Since $F$ is compact and $f_t$ continuous, a minimizer exists for every $t$; by strict convexity it is unique.

## 2. KKT framework (sign convention)

Work with the original three variables. Write every inequality in "$\le0$" form and use multipliers $\mu_i\ge0$; the equality gets a free‑sign multiplier $\lambda$:

$$g_1=-x\le0,\ \ g_2=-y\le0,\ \ g_3=-z\le0,\ \ g_4=x-\tfrac35\le0,\ \ g_5=\tfrac12-2y-z\le0,\qquad h=x+y+z-1=0.$$

Lagrangian $L=f_t+\lambda h+\sum_i\mu_i g_i$. KKT stationarity:

$$\frac{\partial f_t}{\partial x}-\mu_1+\mu_4+\lambda=0,\qquad
\frac{\partial f_t}{\partial y}-\mu_2-2\mu_5+\lambda=0,\qquad
\frac{\partial f_t}{\partial z}-\mu_3-\mu_5+\lambda=0, \tag{2}$$

with $\partial f_t/\partial x=2x+y+2-2t$, $\partial f_t/\partial y=x+4y-z+5$, $\partial f_t/\partial z=6z-y+1$, complementary slackness $\mu_ig_i=0$, and $\mu_i\ge0$.

**Necessity and sufficiency.** All six constraint functions ($h,g_1,\dots,g_5$) are affine, so the *linearity constraint qualification* holds automatically at every feasible point (no Slater‑type non‑degeneracy is needed) — hence KKT is **necessary** for optimality everywhere on $F$. Because $f_t$ is convex (§1) and $F$ is convex, KKT is also **sufficient**: any $(x,y,z)$ satisfying (2) with feasible multiplier signs is a global minimizer, and by strict convexity it is the unique one. This is the standard convex‑QP KKT sufficiency theorem, so the case analysis below (find, for each $t$, one KKT point) is a complete proof, not a heuristic search.

## 3. The exhaustive case analysis

The polytope has $5$ vertices, $5$ edges, and $1$ two‑dimensional interior — $11$ possible active‑constraint patterns in total. For each we solve the reduced stationarity conditions from (1)–(2), express the resulting multipliers as functions of $t$, and find the (possibly empty) range of $t$ for which all inequality multipliers are $\ge0$ **and** the candidate point is feasible. All algebra below was carried out and cross-checked symbolically (see `verification.md`) both on the reduced 2‑variable form and independently on the full 3‑variable KKT system (2); the two derivations agree exactly.

### 3.1 Interior ($F^\circ$, no inequality active)
Solve $\nabla f_t=0$ from (1): $8x+8y-5-2t=0,\ 8x+12y-3=0$, giving
$$x^{*}(t)=\frac{9+6t}{8},\qquad y^{*}(t)=-\frac{1+t}{2}.$$
Feasibility ($0\le x^*\le3/5$, $0\le y^*\le1$, plus $g_3,g_5$ inactive with correct sign — all checked) holds **iff $t\in[-\tfrac32,-1]$**. ($y^*\ge0\Leftrightarrow t\le-1$; $y^*\le1\Leftrightarrow t\ge-3$; $x^*\ge0\Leftrightarrow t\ge-\tfrac32$; $x^*\le\tfrac35\Leftrightarrow t\le-\tfrac7{10}$; the binding pair is $t\in[-\tfrac32,-1]$, and $g_3,g_5$ are checked slack throughout this range.) Here $z^*(t)=\tfrac38-\tfrac t4$.

Multipliers (all $\mu_i=0$): $\lambda=t-\tfrac{15}4$ (free sign, no constraint).

### 3.2 Edge $A$ ($x=0$, i.e. $g_1$ active alone)
With $x=0$, $\partial f_t/\partial y=0\Rightarrow 12y-3=0\Rightarrow y=\tfrac14$ (independent of $t$!). Then $z=\tfrac34$. Solving the full 3‑variable linear system (2) with only $\mu_1$ free (done symbolically in `verification.md`) gives
$$\lambda=-\tfrac{21}4,\qquad \mu_1=-2t-3 .$$
Feasibility of the point is unconditional ($y=\tfrac14\in[0,1]$, $z=\tfrac34\ge0$, etc.); the sign condition $\mu_1\ge0\Leftrightarrow t\le-\tfrac32$. **Valid for $t\le-\tfrac32$**, in particular the whole sub‑interval $t\in[-2,-\tfrac32]$.

### 3.3 Edge $B$ ($y=0$, $g_2$ active alone)
$\partial f_t/\partial x=0$ at $y=0\Rightarrow 8x-5-2t=0\Rightarrow x=\tfrac{5+2t}8$, $z=\tfrac38-\tfrac t4$. Multipliers: $\lambda=\tfrac{3t}2-\tfrac{13}4,\ \mu_2=2t+2$. Sign: $\mu_2\ge0\Leftrightarrow t\ge-1$. Feasibility of the *edge* segment additionally needs $x\in[0,\tfrac12]$ (else $g_5$ or $g_1$ would also bind): $x\le\tfrac12\Leftrightarrow t\le-\tfrac12$. **Valid for $t\in[-1,-\tfrac12]$.**

### 3.4 Vertex $V_2=(\tfrac12,0,\tfrac12)$ ($g_2,g_5$ active)
Solving (2) with $\mu_1=\mu_3=\mu_4=0$: $\lambda=2t-3,\ \mu_2=-2t,\ \mu_5=2t+1$. Both $\ge0$ requires $t\le0$ and $t\ge-\tfrac12$. **Valid for $t\in[-\tfrac12,0]$.**

### 3.5 Edge $E$ ($2y+z=\tfrac12$, i.e. $y=x-\tfrac12$, $g_5$ active alone)
Substituting $y=x-\tfrac12$ into (1) and setting the derivative along the line to $0$ gives $x=\tfrac12+\tfrac t{18}$, hence $y=\tfrac t{18}$, $z=\tfrac12-\tfrac t9$. Multipliers: $\lambda=\tfrac{11t}6-3,\ \mu_5=\tfrac{10t}9+1\ (\ge0\Leftrightarrow t\ge-\tfrac9{10}$, automatically true on the range below). Edge‑segment feasibility needs $x\in[\tfrac12,\tfrac35]\Leftrightarrow t\in[0,\tfrac95]$. **Valid for $t\in[0,\tfrac95]$.**

### 3.6 Vertex $V_3=(\tfrac35,\tfrac1{10},\tfrac3{10})$ ($g_4,g_5$ active)
Solving (2) with $\mu_1=\mu_2=\mu_3=0$: $\lambda=\tfrac3{10},\ \mu_5=3,\ \mu_4=2t-\tfrac{18}5$. Sign: $\mu_5=3\ge0$ always; $\mu_4\ge0\Leftrightarrow t\ge\tfrac95$. **Valid for $t\ge\tfrac95$**, in particular the whole sub‑interval $t\in[\tfrac95,4]$.

### 3.7 The other five faces are *never* active, for **any** real $t$

* **Vertex $V_1=(0,0,1)$** ($g_1,g_2$ active): solving (2) gives $\mu_2=-3$ identically — always negative. Excluded for every $t$.
* **Vertex $V_4=(\tfrac35,\tfrac25,0)$** ($g_3,g_4$ active): gives $\mu_3=-\tfrac{33}5$ identically — always negative. Excluded for every $t$.
* **Vertex $V_5=(0,1,0)$** ($g_1,g_3$ active): gives $\mu_3=-9$ identically — always negative. Excluded for every $t$.
* **Edge $D$** ($x=\tfrac35$, $g_4$ alone): the stationarity equation in $y$ gives $y=-\tfrac3{20}$ **independent of $t$**, which is negative — the candidate point already violates $y\ge0$, so it is never *feasible*, regardless of the multiplier sign. (Equivalently: for $x=3/5$ fixed, $f_t$ is a convex parabola in $y$ minimized at $y=-3/20<1/10$, hence strictly increasing over the feasible sub‑range $y\in[1/10,2/5]$; the true constrained minimum along this edge is always at its lower endpoint $V_3$, never in the interior of $D$, and never at $V_4$.) Excluded for every $t$.
* **Edge $C$** ($x+y=1$, $g_3$ alone): stationarity gives $x=\tfrac t2+\tfrac32$ with multiplier $\mu_3=2t-3$, requiring $t\ge\tfrac32$ for a valid sign, but the edge‑segment feasibility requires $x\le\tfrac35$, i.e. $t\le-\tfrac95$. These two requirements are contradictory ($\tfrac32\le t\le-\tfrac95$ is empty), so no $t$ makes this edge active. Excluded for every $t$.

Since strict convexity guarantees the KKT point is unique when it exists, and we have just shown that for every $t\in[-2,4]$ **at least one** of the six patterns in §3.1–3.6 supplies a valid KKT point while the remaining five patterns *never* do (for any real $t$, not just in $[-2,4]$), the enumeration is complete: no feasible face has been overlooked, and there is nothing left to check.

## 4. The piecewise solution

Collecting §3.1–3.6, and noting the five candidate ranges
$(-\infty,-\tfrac32],\,[-\tfrac32,-1],\,[-1,-\tfrac12],\,[-\tfrac12,0],\,[0,\tfrac95],\,[\tfrac95,\infty)$
tile the entire real line with no gap and no overlap (adjacent ranges share exactly their common endpoint), the unique global minimizer on $[-2,4]$ is:

| Range of $t$ | $x(t)$ | $y(t)$ | $z(t)$ | Active constraints |
|---|---|---|---|---|
| $[-2,-\tfrac32]$ | $0$ | $\tfrac14$ | $\tfrac34$ | $x=0$ |
| $[-\tfrac32,-1]$ | $\dfrac{9+6t}8$ | $-\dfrac{1+t}2$ | $\dfrac38-\dfrac t4$ | none (interior) |
| $[-1,-\tfrac12]$ | $\dfrac{5+2t}8$ | $0$ | $\dfrac38-\dfrac t4$ | $y=0$ |
| $[-\tfrac12,0]$ | $\tfrac12$ | $0$ | $\tfrac12$ | $y=0,\ 2y+z=\tfrac12$ |
| $[0,\tfrac95]$ | $\tfrac12+\tfrac t{18}$ | $\tfrac t{18}$ | $\tfrac12-\tfrac t9$ | $2y+z=\tfrac12$ |
| $[\tfrac95,4]$ | $\tfrac35$ | $\tfrac1{10}$ | $\tfrac3{10}$ | $x=\tfrac35,\ 2y+z=\tfrac12$ |

**Continuity check at the four interior breakpoints** ($t=-\tfrac32,-1,-\tfrac12,0,\tfrac95$): substituting the breakpoint value into the formula on each side gives the identical point in every case (e.g. at $t=-1$: left formula gives $(\tfrac38,0,\tfrac58)$, right formula gives $(\tfrac38,0,\tfrac58)$); the optimizer $t\mapsto(x(t),y(t),z(t))$ is therefore a single continuous, piecewise‑affine/piecewise‑degenerate curve.

## 5. Exact optimal value function

Substituting the table above into $f_t$ (equivalently (1)) gives, exactly:

$$
v(t)=\min_{(x,y,z)\in F} f_t(x,y,z)=
\begin{cases}
\dfrac{29}{8}, & t\in[-2,-\tfrac32],\\[4pt]
-\dfrac34t^2-\dfrac94t+\dfrac{31}{16}, & t\in[-\tfrac32,-1],\\[4pt]
-\dfrac14t^2-\dfrac54t+\dfrac{39}{16}, & t\in[-1,-\tfrac12],\\[4pt]
\dfrac52-t, & t\in[-\tfrac12,0],\\[4pt]
-\dfrac1{18}t^2-t+\dfrac52, & t\in[0,\tfrac95],\\[4pt]
\dfrac{67}{25}-\dfrac65t, & t\in[\tfrac95,4].
\end{cases}
$$

**Continuity of $v$.** Evaluating adjacent pieces at each breakpoint gives identical numbers: $v(-\tfrac32)=\tfrac{29}8$ (both), $v(-1)=\tfrac{55}{16}$ (both), $v(-\tfrac12)=3$ (both), $v(0)=\tfrac52$ (both), $v(\tfrac95)=\tfrac{13}{25}$ (both). So $v$ is continuous on $[-2,4]$.

**Differentiability ($C^1$) via the envelope theorem.** Since $t$ enters $f_t$ only through the term $-2tx$, the envelope theorem gives $v'(t)=\partial f_t/\partial t\big|_{\text{optimum}}=-2x(t)$ wherever $x(t)$ is differentiable and the active set is locally constant. Differentiating each piece of $v$ directly and comparing with $-2x(t)$ from the table confirms equality termwise, e.g. on $[-\tfrac32,-1]$: $v'(t)=-\tfrac32t-\tfrac94=-2\cdot\tfrac{9+6t}8=-2x(t)$; on $[0,\tfrac95]$: $v'(t)=-\tfrac t9-1=-2(\tfrac12+\tfrac t{18})=-2x(t)$; similarly on every other piece. Because $x(t)$ itself is continuous across every breakpoint (§4), $v'(t)=-2x(t)$ is continuous across every breakpoint too — so **$v$ is $C^1$ on all of $[-2,4]$**, even though the *optimizer* is only piecewise-smooth and the active set changes five times. ($v$ is generically not $C^2$: e.g. at $t=-\tfrac32$ the left piece has $v''\equiv0$ while the right piece has $v''=-\tfrac32$; this kink causes no contradiction since $C^1$, not $C^2$, is all that convex duality/envelope theory guarantees here.)

## 6. Summary answer

For every real $t\in[-2,4]$ the problem has a **unique** global minimizer $(x(t),y(t),z(t))$, given in closed form by the table in §4, with optimal value $v(t)$ given in §5. Both are continuous on $[-2,4]$; $v$ is in addition continuously differentiable. The optimizer is:

* constant at $(0,\tfrac14,\tfrac34)$ for $t\in[-2,-\tfrac32]$,
* an unconstrained (fully interior) point for $t\in[-\tfrac32,-1]$,
* on the face $y=0$ for $t\in[-1,-\tfrac12]$,
* pinned at the vertex $(\tfrac12,0,\tfrac12)$ for $t\in[-\tfrac12,0]$,
* on the face $2y+z=\tfrac12$ for $t\in[0,\tfrac95]$,
* constant at the vertex $(\tfrac35,\tfrac1{10},\tfrac3{10})$ for $t\in[\tfrac95,4]$.

This is proven complete (§3.7: the other five faces of the pentagon are shown to violate KKT for *every* real $t$, not merely outside $[-2,4]$), and proven optimal/unique by strict convexity of $f_t$ together with KKT sufficiency for convex programs with affine constraints (§2).
