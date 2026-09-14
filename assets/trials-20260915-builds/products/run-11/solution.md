# Parametric QP: complete solution for all $t\in[-2,4]$

## 0. Problem

$$\min f_t(x,y,z)=x^2+2y^2+3z^2+xy-yz+(2-2t)x+5y+z$$
subject to
$$x+y+z=1,\quad x\ge0,\ y\ge0,\ z\ge0,\quad x\le\tfrac35,\quad 2y+z\ge\tfrac12 .$$

## 1. Strict convexity ⇒ unique global minimizer exists for every $t$

Write $f_t(x,y,z)=\tfrac12 w^{\!\top}\! H w + b(t)^{\!\top} w$ with $w=(x,y,z)$,
$$H=\begin{pmatrix}2&1&0\\1&4&-1\\0&-1&6\end{pmatrix},\qquad b(t)=(2-2t,\,5,\,1)^{\!\top}.$$
$H$ does not depend on $t$. Its leading principal minors are $2,\ \det\begin{pmatrix}2&1\\1&4\end{pmatrix}=7,\ \det H=40$, all positive, so $H\succ0$: $f_t$ is **strictly convex** for every $t$.

The feasible set
$$F=\{(x,y,z): x+y+z=1,\ x,y,z\ge0,\ x\le\tfrac35,\ 2y+z\ge\tfrac12\}$$
is a fixed (t‑independent), nonempty, compact, convex polytope (it is bounded since it lies in the simplex $x,y,z\ge0,\ x+y+z=1$, and closed since defined by non‑strict linear inequalities).

A strictly convex function on a nonempty compact convex set attains a **unique** global minimum. Hence for every $t\in[-2,4]$ the problem has exactly one optimizer $(x(t),y(t),z(t))$, and because the constraints are all affine, Slater/LICQ‑type regularity is automatic and the KKT conditions are **necessary and sufficient** for global optimality (this is standard convex‑QP duality: for a convex program with affine constraints, any KKT point is a global minimizer, with no constraint qualification needed beyond affineness).

This settles existence, uniqueness and "KKT ⇒ global optimum" once and for all; the rest of the work is to *locate* the KKT point for each $t$.

## 2. Reduction to two variables

Eliminate $z=1-x-y$. A direct expansion (shown in full below) gives
$$f_t(x,y)=4x^2+6y^2+8xy-(5+2t)x-3y+4,$$
and the constraints become, in $(x,y)$:
$$x\ge0,\quad y\ge0,\quad x+y\le1,\quad x\le\tfrac35,\quad x-y\le\tfrac12 .$$
(The last comes from $2y+z\ge\tfrac12 \iff 2y+(1-x-y)\ge\tfrac12\iff y-x\ge-\tfrac12\iff x-y\le\tfrac12$.)

**Expansion check.** $3z^2=3(1-x-y)^2=3-6x-6y+3x^2+6xy+3y^2$; $-yz=-y(1-x-y)=-y+xy+y^2$; $z=1-x-y$. Summing all pieces:
- $x^2$: $1+3=4$
- $y^2$: $2+3+1=6$
- $xy$: $6+1+1=8$
- $x$ (linear): $-6+(2-2t)-1=-5-2t$
- $y$ (linear): $-6-1+5-1=-3$
- constant: $3+1=4$

matching the formula above.

The Hessian of $g(x,y):=4x^2+8xy+6y^2$ is $A=\begin{pmatrix}4&4\\4&6\end{pmatrix}$, $\det A=8>0$, $A\succ0$ — consistent with §1 (eliminating one variable of a PD quadratic under an affine constraint keeps it PD).

The feasible region in $(x,y)$ is the pentagon $P$ with edges
$$e_1: x=0,\quad e_2: y=0,\quad e_3: x+y=1,\quad e_4: x=\tfrac35,\quad e_5: x-y=\tfrac12,$$
and vertices (found by intersecting adjacent edge pairs and checking the other three inequalities)
$$(0,0)\to^{e_1}(0,1)\to^{e_3}(0.6,0.4)\to^{e_4}(0.6,0.1)\to^{e_5}(0.5,0)\to^{e_2}(0,0).$$
(The pairs $x=0,x-y=\tfrac12$ and $y=0,x+y=1$ and $y=0,x=\tfrac35$ and $x+y=1,x-y=\tfrac12$ all give points that violate some other constraint, so they are *not* vertices of $P$; this was checked directly, e.g. $y=0,x=\tfrac35\Rightarrow x-y=0.6>0.5$, infeasible.)

## 3. The unconstrained minimizer moves along a straight line in $t$

$\nabla g=0$ (i.e. $8x+8y=5+2t,\ 8x+12y=3$) gives
$$x^\*(t)=\frac{9+6t}{8},\qquad y^\*(t)=-\frac{1+t}{2},\qquad z^\*(t)=1-x^\*-y^\*=\frac{3-2t}{8}.$$
As $t$ ranges over $\mathbb R$, $(x^\*(t),y^\*(t))$ traces the line through direction $(dx^\*/dt,dy^\*/dt)=(3/4,-1/2)\parallel(3,-2)$.

Because $g$ is a strictly convex quadratic with the *same* Hessian $A$ for every $t$, the constrained minimizer over the fixed polygon $P$ equals the **$A$‑orthogonal projection of $(x^\*(t),y^\*(t))$ onto $P$** (standard fact: minimizing $\tfrac12(w-w^\*)^{\!\top}A(w-w^\*)$ over a convex set $P$, which is what $g(w)-g(w^\*)$ equals up to the constant $-\tfrac12 w^{\*\top}Aw^\*$, is exactly the $A$-projection of $w^\*$ onto $P$). Projection onto a convex polygon of a point moving along a straight line is a classical, *monotone* operation: as the source point moves along the line, the projection moves monotonically around $\partial P$ (through edges and vertices in the order dictated by the geometry), and equals the source point itself exactly while the source point lies inside $P$. This is what makes an exhaustive, non‑overlapping case split possible, and is the structural reason no face can be skipped: the projection can only enter/leave a face's parameter range through the same face's neighbours in $\partial P$'s cyclic order — it cannot jump.

We now simply compute, for the actual line above, exactly where it is inside $P$, and where it crosses each edge — and confirm the resulting sequence of faces is a contiguous walk along $\partial P$'s cycle from §2, which is the completeness certificate.

## 4. Region 2 (interior): where $(x^\*,y^\*)\in P$

Impose all five inequalities on $(x^\*(t),y^\*(t))$:

| constraint | condition on $t$ |
|---|---|
| $x^\*\ge0$ | $t\ge-3/2$ |
| $y^\*\ge0$ | $t\le-1$ |
| $x^\*+y^\*\le1$ | $t\le 3/2$ |
| $x^\*\le3/5$ | $t\le-7/10$ |
| $x^\*-y^\*\le1/2$ | $t\le-9/10$ |

Intersection: $t\in[-3/2,-1]$. On this interval the unconstrained minimizer is feasible, hence (§1) it **is** the global minimizer:
$$\boxed{x(t)=\tfrac{9+6t}8,\quad y(t)=-\tfrac{1+t}2,\quad z(t)=\tfrac{3-2t}8}\qquad t\in[-3/2,-1].$$
All constraints besides $e_1,e_2$ are *strictly* satisfied throughout the open sub‑interval (their bounds on $t$, $3/2,-7/10,-9/10$, are outside $[-3/2,-1]$ except at the two endpoints where they coincide with $e_1,e_2$ — see below), so no other face can be active in this range: this is a rigorous exclusion, not a numerical guess.

At $t=-3/2$: $x=0$ (edge $e_1$ becomes active). At $t=-1$: $y=0$ (edge $e_2$ becomes active). These are precisely the two neighbours of $P$'s interior in the direction the line travels, matching the walk order of §2.

## 5. Region 1 ($t\le-3/2$): edge $x=0$

For $t<-3/2$, $x^\*(t)<0$, so $x\ge0$ must bind: set $x=0$. Then $g(0,y)=6y^2-3y+4$, minimized at $y=1/4$ (unconstrained in $y$, since $\partial g/\partial y=12y-3=0$). Check remaining constraints at $(0,1/4)$: $y=1/4\ge0$✓, $x+y=1/4\le1$✓, $x\le3/5$✓, $x-y=-1/4\le1/2$✓ — all strict, so this is exactly the KKT point with only $x\ge0$ active. Translating back, $z=3/4$:
$$\boxed{x=0,\ y=\tfrac14,\ z=\tfrac34}\qquad t\in[-2,-3/2].$$
This point does not depend on $t$ (the only $t$‑dependence of $f_t$ is through the $x$‑term, and $x=0$ kills it), so it stays optimal for the *entire* remaining range down to $t=-2$ provided the KKT multiplier of $x\ge0$ stays $\ge0$ (verified in §8: $\alpha_1(t)=-3-2t\ge0\iff t\le-3/2$, true on all of $[-2,-3/2]$, with $\alpha_1(-2)=1>0$ strictly, so there is no further breakpoint before $t=-2$ — the region legitimately extends to the left edge of the domain).

## 6. Region 3 ($t\in[-1,-1/2]$): edge $y=0$

For $t>-1$ (up to where a further constraint binds), $y^\*(t)<0$ so $y\ge0$ binds: set $y=0$. Then $g(x,0)=4x^2-(5+2t)x+4$, minimized at $x=(5+2t)/8$. Constraints at $(x,0)$: $x\ge0\iff t\ge-5/2$ (slack throughout); $x+y=x\le1$ (slack); $x\le3/5\iff t\le-1/10$; $x-y=x\le1/2\iff t\le-1/2$.
The binding upper bound is $t\le-1/2$ (tighter than $t\le-1/10$), so this branch is valid for $t\in[-1,-1/2]$:
$$\boxed{x(t)=\tfrac{5+2t}8,\ y(t)=0,\ z(t)=\tfrac{3-2t}8}\qquad t\in[-1,-1/2].$$
At $t=-1$ this matches Region 2's value $x=3/8,y=0,z=5/8$ (continuity, checked in §9). At $t=-1/2$, $x=1/2$, and now $x-y=1/2$ — edge $e_5$ becomes active too, exactly the next neighbour of $e_2$ on $\partial P$ (vertex $(0.5,0)=e_2\cap e_5$), matching §2's cyclic order.

## 7. Region 4 ($t\in[-1/2,0]$): vertex $(1/2,0)=e_2\cap e_5$

Set $x=1/2,y=0$ (so $z=1/2$) and check the KKT system with the two multipliers $\alpha_2\ge0$ (for $-y\le0$) and $\alpha_5\ge0$ (for $x-y-\tfrac12\le0$) free, all others $0$ (verified strict slack of $x\ge0,x+y\le1,x\le3/5$ at this point: $x=1/2>0$, $x+y=1/2<1$, $x=1/2<3/5$). Stationarity of $g$: $\nabla g(1/2,0)+\alpha_2(0,-1)+\alpha_5(1,-1)=0$ with $\nabla g(1/2,0)=(8\cdot\tfrac12-5-2t,\,8\cdot\tfrac12-3)=(-1-2t,\,1)$:
$$-1-2t+\alpha_5=0\Rightarrow\alpha_5=1+2t,\qquad 1-\alpha_2-\alpha_5=0\Rightarrow\alpha_2=1-\alpha_5=-2t.$$
Both are $\ge0$ exactly for $t\in[-1/2,0]$:
$$\boxed{x=\tfrac12,\ y=0,\ z=\tfrac12}\qquad t\in[-1/2,0].$$
This is the "stays at a vertex over a whole interval of $t$" phenomenon predicted in §3: while the projected source point's normal‑cone membership at the vertex persists, the projection does not move even though the source point does. At $t=-1/2$, $\alpha_5=0$ (edge $e_5$ multiplier vanishes — smooth hand‑off to Region 3, which has $\alpha_5\equiv0$). At $t=0$, $\alpha_2=0$ (hand‑off to Region 5, which has $\alpha_2\equiv0$).

## 8. Region 5 ($t\in[0,9/5]$): edge $x-y=1/2$ ($e_5$)

Set $x=y+\tfrac12$ (i.e. $2y+z=\tfrac12$) and minimize over $y$ alone:
$$g(y+\tfrac12,y)=18y^2-2ty+\tfrac{5-2t}2\quad(\text{substitute and collect; }\partial_y=36y-2t=0)$$
$$\Rightarrow y(t)=\frac t{18},\qquad x(t)=\frac t{18}+\frac12,\qquad z(t)=\frac12-\frac{2t}{18}=\frac12-\frac t9 .$$
Feasibility: $y\ge0\iff t\ge0$; $x\le3/5\iff t\le9/5$; $x+y\le1$ and $x\ge0$ are slack throughout ($t\le4.5$ resp. always true). So valid for $t\in[0,9/5]$:
$$\boxed{x(t)=\tfrac t{18}+\tfrac12,\quad y(t)=\tfrac t{18},\quad z(t)=\tfrac12-\tfrac t9}\qquad t\in[0,9/5].$$
At $t=9/5$: $x=3/5$ — edge $e_4$ activates, the next neighbour of $e_5$ on $\partial P$ (vertex $(0.6,0.1)=e_4\cap e_5$), again matching §2's order.

## 9. Region 6 ($t\in[9/5,4]$): vertex $(3/5,1/10)=e_4\cap e_5$

Set $x=3/5,y=1/10$ (so $z=3/10$). KKT with $\alpha_4\ge0$ (for $x-\tfrac35\le0$) and $\alpha_5\ge0$ (for $x-y-\tfrac12\le0$): $\nabla g(3/5,1/10)=(8\cdot0.6+8\cdot0.1-5-2t,\ 8\cdot0.6+12\cdot0.1-3)=(0.6-2t,\,3)$.
$$3-\alpha_5=0\Rightarrow\alpha_5=3,\qquad 0.6-2t+\alpha_4+\alpha_5=0\Rightarrow\alpha_4=2t-3.6 .$$
$\alpha_5=3\ge0$ always; $\alpha_4\ge0\iff t\ge9/5$. This point does not depend on $t$, and $x+y=0.7<1$, $y>0$, $x>0$ are all slack, so nothing else can activate as $t$ grows further — the vertex remains optimal for **all** $t\ge9/5$, in particular for the remainder of the domain:
$$\boxed{x=\tfrac35,\ y=\tfrac1{10},\ z=\tfrac3{10}}\qquad t\in[9/5,4].$$

## 10. Completeness (why nothing was missed)

The six regions found, $[-2,-\tfrac32],[-\tfrac32,-1],[-1,-\tfrac12],[-\tfrac12,0],[0,\tfrac95],[\tfrac95,4]$, **partition** $[-2,4]$ exactly (consecutive endpoints match, verified again in §11) — so every $t$ in the domain is covered by exactly one derivation above, each of which is a *closed‑form solve of the exact KKT system* for a specific, justified active set, not a guess. Independently of the case‑by‑case algebra, §2–§9 also verify the *geometric* completeness argument of §3:

$$\underbrace{e_1}_{R1}\ \to\ \underbrace{\text{int}}_{R2}\ \to\ \underbrace{e_2}_{R3}\ \to\ \underbrace{e_2\cap e_5}_{R4}\ \to\ \underbrace{e_5}_{R5}\ \to\ \underbrace{e_4\cap e_5}_{R6}$$

is a **contiguous walk along the boundary cycle** of $P$ found in §2 ($e_1\to(0,1)\to e_3\to(0.6,0.4)\to e_4\to(0.6,0.1)\to e_5\to(0.5,0)\to e_2\to(0,0)\to e_1$, read backwards from $e_1$ it is $e_1,\ (0,0),\ e_2,\ (0.5,0),\ e_5,\ (0.6,0.1),\ e_4,\dots$): starting at edge $e_1$, passing through the interior, hitting $e_2$, sliding to the vertex $e_2\cap e_5$, continuing along $e_5$, and ending at the vertex $e_4\cap e_5$ — precisely the cyclic order derived independently from the vertex list. Because projection onto a convex polygon along a line is monotone (§3), and our six pieces already trace a monotone, gap‑free, non‑repeating walk matching the polygon's actual combinatorics, there is no room for a seventh region, a skipped edge, or an out‑of‑order visit: the edges $e_3$ (i.e. $x+y\le1$) and the "far side" of $e_4$/$e_1$ etc. are simply never reached because the line's fixed direction $(3,-2)$ and the domain window $t\in[-2,4]$ do not carry the projection that far — and we have *proved*, not assumed, this by checking in §4–§9 that every inequality other than the ones declared active is strictly satisfied throughout each open sub‑interval, with the two boundary constraints ($t=-2$ giving $\alpha_1=1>0$ strictly, and $t=4$ giving $\alpha_4=4.4>0$ strictly) confirming the domain's endpoints fall safely inside Regions 1 and 6 respectively, not exactly on a further breakpoint.

## 11. Continuity and differentiability of $x(t),y(t),z(t)$ and the value function

**Point continuity.** Direct substitution at each of the five breakpoints:

| $t$ | from left | from right |
|---|---|---|
| $-3/2$ | $(0,\,0.25,\,0.75)$ | $x^\*=(9-9)/8=0,\ y^\*=-(1-1.5)/2=0.25,\ z^\*=0.75$ ✓ |
| $-1$ | $x=(9-6)/8=3/8,y=0,z=5/8$ | $x=(5-2)/8=3/8,y=0,z=5/8$ ✓ |
| $-1/2$ | $x=(5-1)/8=1/2,y=0,z=1/2$ | $(1/2,0,1/2)$ ✓ |
| $0$ | $(1/2,0,1/2)$ | $x=0+1/2,y=0,z=1/2$ ✓ |
| $9/5$ | $x=\tfrac{9/5}{18}+\tfrac12=0.6,\ y=0.1,\ z=0.3$ | $(0.6,0.1,0.3)$ ✓ |

so $x(t),y(t),z(t)$ are continuous on $[-2,4]$ (piecewise affine in $t$, with kinks — slope changes — exactly at the five breakpoints).

**Optimal value function.** Evaluating $f_t$ at the optimizer in each region (algebra: substitute the boxed formulas into $f_t$, or equivalently, for the two open regions $R2,R5$ complete the square via $g_{\min}=c-\tfrac14 b^{\!\top}A^{-1}b$ with $A=\begin{pmatrix}4&4\\4&6\end{pmatrix}$, $A^{-1}=\tfrac18\begin{pmatrix}6&-4\\-4&4\end{pmatrix}$, $b=(-5-2t,-3)$, $c=4$):

$$
v(t)=\begin{cases}
\dfrac{29}8 & t\in[-2,-\tfrac32]\\[4pt]
\dfrac{31-36t-12t^2}{16}=-\dfrac34t^2-\dfrac94t+\dfrac{31}{16} & t\in[-\tfrac32,-1]\\[4pt]
\dfrac{-4t^2-20t+39}{16}=-\dfrac14t^2-\dfrac54t+\dfrac{39}{16} & t\in[-1,-\tfrac12]\\[4pt]
\dfrac52-t & t\in[-\tfrac12,0]\\[4pt]
\dfrac{-t^2-18t+45}{18}=-\dfrac1{18}t^2-t+\dfrac52 & t\in[0,\tfrac95]\\[4pt]
\dfrac{67-30t}{25} & t\in[\tfrac95,4]
\end{cases}
$$

Numerically at the breakpoints: $v(-3/2)=29/8=3.625$ from both sides; $v(-1)=55/16=3.4375$ from both; $v(-1/2)=3$ from both; $v(0)=5/2$ from both; $v(9/5)=13/25=0.52$ from both — **continuous** on all of $[-2,4]$.

**Differentiability (envelope theorem).** Since only the $x$-coefficient of $f_t$ depends on $t$ ($\partial f_t/\partial t=-2x$), and $t$ enters no constraint, the envelope theorem for parametric convex programs gives $v'(t)=-2x(t)$ wherever $v$ is differentiable, and in fact $v$ is $C^1$ on all of $[-2,4]$ with this formula holding everywhere (including at breakpoints, by continuity of $x(t)$), because $x(t)$ is continuous. Direct check:
- $R1$: $v'=0=-2\cdot0$ ✓.
- $R2$: $v'=-\tfrac32t-\tfrac94$; $-2x=-2\cdot\tfrac{9+6t}8=-\tfrac{9+6t}4=-\tfrac94-\tfrac32t$ ✓.
- $R3$: $v'=-\tfrac12t-\tfrac54$; $-2x=-2\cdot\tfrac{5+2t}8=-\tfrac{5+2t}4$ ✓.
- $R4$: $v'=-1=-2\cdot\tfrac12$ ✓.
- $R5$: $v'=-\tfrac t9-1$; $-2x=-2(\tfrac t{18}+\tfrac12)=-\tfrac t9-1$ ✓.
- $R6$: $v'=-\tfrac{30}{25}=-\tfrac65=-2\cdot\tfrac35$ ✓.

So $v$ is continuously differentiable everywhere on $[-2,4]$ (its derivative $-2x(t)$ is itself continuous, since $x(t)$ is continuous), while $v''$ has jump discontinuities exactly at the five breakpoints (where $x(t)$'s slope changes) — the expected, textbook behavior of the optimal‑value function of a strictly convex parametric QP under an active‑set change.

## 12. KKT multipliers (explicit, every region)

Sign convention: constraints written as $h_i(x,y,z)\le0$,
$$h_1=-x,\ h_2=-y,\ h_3=-z,\ h_4=x-\tfrac35,\ h_5=\tfrac12-2y-z,$$
plus equality $x+y+z-1=0$ with free-sign multiplier $\mu$. Stationarity: $\nabla f_t+\mu(1,1,1)+\sum_i\alpha_i\nabla h_i=0$, $\alpha_i\ge0$, $\alpha_ih_i=0$. Explicitly
$$2x+y+(2-2t)+\mu-\alpha_1+\alpha_4=0,\quad 4y+x-z+5+\mu-\alpha_2-2\alpha_5=0,\quad 6z-y+1+\mu-\alpha_3-\alpha_5=0.$$

| Region | $t$-range | $\mu(t)$ | $\alpha_1$ | $\alpha_2$ | $\alpha_3$ | $\alpha_4$ | $\alpha_5$ |
|---|---|---|---|---|---|---|---|
| R1 | $[-2,-3/2]$ | $-21/4$ | $-3-2t$ | $0$ | $0$ | $0$ | $0$ |
| R2 | $[-3/2,-1]$ | $t-15/4$ | $0$ | $0$ | $0$ | $0$ | $0$ |
| R3 | $[-1,-1/2]$ | $(6t-13)/4$ | $0$ | $2t+2$ | $0$ | $0$ | $0$ |
| R4 | $[-1/2,0]$ | $2t-3$ | $0$ | $-2t$ | $0$ | $0$ | $2t+1$ |
| R5 | $[0,9/5]$ | $11t/6-3$ | $0$ | $0$ | $0$ | $0$ | $1+10t/9$ |
| R6 | $[9/5,4]$ | $3/10$ | $0$ | $0$ | $0$ | $2t-18/5$ | $3$ |

Every $\alpha_i$ listed is $\ge0$ throughout its stated range (linear in $t$, checked at both endpoints: e.g. R1's $\alpha_1=-3-2t$ is $1$ at $t=-2$ and $0$ at $t=-3/2$; R6's $\alpha_4=2t-18/5$ is $0$ at $t=9/5$ and $4.4$ at $t=4$), and $z\ge0$ is never active anywhere in $[-2,4]$ ($\alpha_3\equiv0$), consistent with $z(t)>0$ throughout (minimum value of $z(t)$ over the whole domain is $3/10$, attained on $R6$). $\mu(t)$ is continuous across all breakpoints (checked: $-21/4=-5.25$ at $-3/2$ matches R2's $t-15/4=-6-3.75=-5.25$? recompute: R2 at $t=-3/2$: $-1.5-3.75=-5.25$ ✓; R2 at $t=-1$: $-1-3.75=-4.75$, R3 at $t=-1$: $(-6-13)/4=-4.75$ ✓; R3 at $t=-1/2$: $(-3-13)/4=-4$, R4 at $t=-1/2$: $-1-3=-4$ ✓; R4 at $t=0$: $-3$, R5 at $t=0$: $-3$ ✓; R5 at $t=9/5$: $11\cdot1.8/6-3=3.3-3=0.3$, R6: $0.3$ ✓), giving an independent confirmation of every region hand-off in §11.

This completes the proof: for every $t\in[-2,4]$ the point $(x(t),y(t),z(t))$ given by the boxed formulas is feasible, satisfies the KKT stationarity and complementary-slackness conditions with multipliers as tabulated (all $\ge0$), and by §1 (strict convexity + affine constraints) that is necessary and sufficient for it to be the **unique** global minimizer.
