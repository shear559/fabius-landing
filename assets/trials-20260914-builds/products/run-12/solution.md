# Parametric constrained optimization — complete solution for all t in [-2,4]

## 0. Problem

Minimize, for each real parameter t,

  f_t(x,y,z) = x² + 2y² + 3z² + xy − yz + (2−2t)x + 5y + z

subject to

  x+y+z = 1,  x ≥ 0,  y ≥ 0,  z ≥ 0,  x ≤ 3/5,  2y+z ≥ 1/2.

Throughout, name the five inequality constraints

  c1: x ≥ 0  c2: y ≥ 0  c3: z ≥ 0  c4: 3/5 − x ≥ 0  c5: 2y+z−1/2 ≥ 0.

## 1. Reduction to two free variables

The equality constraint x+y+z=1 is affine and non‑degenerate, so it can be eliminated by direct
substitution z = 1−x−y — a standard, fully rigorous reduction (equivalent to carrying a free‑sign
Lagrange multiplier μ for the equality and eliminating it algebraically; nothing is lost). Substituting:

  g_t(x,y) := f_t(x,y,1−x−y) = 4x² + 8xy + 6y² + (−5−2t)x − 3y + 4.

(Verified symbolically; see verification.md.) Under this substitution the five inequality constraints
become, in the free variables (x,y):

  c1: x ≥ 0
  c2: y ≥ 0
  c3: 1−x−y ≥ 0  (this is z ≥ 0)
  c4: 3/5−x ≥ 0
  c5: y−x+1/2 ≥ 0  (this is 2y+z ≥ 1/2, since 2y+z−1/2 = 2y+(1−x−y)−1/2 = y−x+1/2)

The gradients (in (x,y)) of c1…c5 are, respectively, (1,0), (0,1), (−1,−1), (−1,0), (−1,1).

## 2. Strict convexity ⇒ existence and uniqueness

The quadratic part of g_t is [x y]·M·[x y]ᵗ with M = [[4,4],[4,6]] (since 4x²+8xy+6y² =
4x²+4xy+4xy+6y²). M is symmetric with trace 10 > 0 and det = 24−16 = 8 > 0, so both eigenvalues
are positive (10 ± 2√17, both > 0 since 2√17 ≈ 8.246 < 10). Hence **g_t is strictly convex on all of
ℝ² for every t**, independent of t (t only enters the linear part).

The feasible set in (x,y) — call it P — is the intersection of the five half‑planes c1,…,c5, a closed
bounded convex polygon (bounded because c1,c2,c3 alone already force 0≤x,0≤y,x+y≤1). A strictly
convex function on a nonempty compact convex set attains a **unique** global minimum. So for every
t a unique minimizer exists; the rest of this document finds it and proves it via KKT, which for a
convex problem with affine constraints is both **necessary and sufficient** for global optimality (no
constraint‑qualification subtlety arises because every constraint is affine).

**Sign convention.** Write the Lagrangian gradient condition as

  ∇g_t(x,y) = λ1∇c1 + λ2∇c2 + λ3∇c3 + λ4∇c4 + λ5∇c5,  λi ≥ 0,  λi·ci(x,y) = 0 (i=1,…,5).

A point satisfying this with all λi ≥ 0 is, by the paragraph above, **the** global minimizer.

## 3. The feasible polygon P

Intersecting the five half‑planes gives a pentagon with vertices (found by pairwise intersection of
boundary lines, each checked against the other three constraints):

| Vertex | (x,y,z) | Active constraints |
|---|---|---|
| V1 | (0, 0, 1) | c1, c2 |
| V2 | (1/2, 0, 1/2) | c2, c5 |
| V3 | (3/5, 1/10, 3/10) | c4, c5 |
| V4 | (3/5, 2/5, 0) | c3, c4 |
| V5 | (0, 1, 0) | c3, c1 |

Edges: A = V5–V1 (c1: x=0), B = V1–V2 (c2: y=0), E = V2–V3 (c5: y=x−1/2), D = V3–V4 (c4: x=3/5),
C = V4–V5 (c3: x+y=1). All five constraints are genuinely facet‑defining (P is a proper pentagon, not
degenerate): at x=0, y ranges over [0,1] (vertices V1,V5); at x=3/5, y ranges over [1/10,2/5]
(vertices V3,V4); the transition between "y=0 binds" and "y=x−1/2 binds" as the lower bound on y
occurs at x=1/2 (vertex V2).

## 4. The unconstrained stationary point

∇g_t = 0 gives the linear system 8x+8y−5−2t=0, 8x+12y−3=0, with unique solution

  x°(t) = (9+6t)/8,  y°(t) = −(1+t)/2,  z°(t) = 1−x°−y° = (3−2t)/8.

This is feasible in P exactly when t ∈ [−3/2,−1] (direct check of all five inequalities against x°,y°;
e.g. x°≥0 ⇔ t≥−3/2, y°≥0 ⇔ t≤−1, and the remaining three constraints are slack throughout
[−3/2,−1]). Where feasible it is trivially the KKT point with all λi=0, hence the global minimizer there.
Outside that window the true minimizer lies on the boundary of P; the rest of this document finds it
constructively and confirms, face by face, that no other face of P is ever the answer on [−2,4].

## 5. The six regimes

Because t enters g_t only through the coefficient of x, ∂g_t/∂y = 12y+8x−3 does not depend on t —
a structural fact used repeatedly below. Each regime is derived by restricting g_t to the relevant face
of P (a point, a line segment, or all of ℝ²), minimizing there, and then checking the KKT sign
condition(s) for the constraints active on that face. All algebra below has been checked symbolically
(verification.md); only the results are shown.

### Regime 1 — t ∈ [−2, −3/2]: edge A (x=0)

On x=0, g_t(0,y) = 6y²−3y+4, whose unconstrained minimizer y=1/4 does **not** depend on t (the
x‑terms, which carry t, vanish). Point: **(x,y,z) = (0, 1/4, 3/4)**, value = 29/8.
Active constraint: c1. Stationarity requires ∂g_t/∂y(0,1/4) = 0 (true identically) and
λ1 = ∂g_t/∂x(0,1/4) = −3−2t.
λ1 ≥ 0 ⟺ t ≤ −3/2. ✓ valid exactly on this regime.

### Regime 2 — t ∈ [−3/2, −1]: interior

**(x,y,z) = ((9+6t)/8, −(1+t)/2, (3−2t)/8)**, value = −3t²/4 − 9t/4 + 31/16.
No active constraints, all λi = 0 — this is the unconstrained point of §4, feasible exactly here.

### Regime 3 — t ∈ [−1, −1/2]: edge B (y=0)

On y=0, g_t(x,0)=4x²+(−5−2t)x+4, minimized at x=(5+2t)/8. Point:
**(x,y,z) = ((5+2t)/8, 0, (3−2t)/8)**, value = −t²/4 − 5t/4 + 39/16.
Active constraint: c2. λ2 = ∂g_t/∂y((5+2t)/8, 0) = 2t+2.
λ2 ≥ 0 ⟺ t ≥ −1. Combined with the edge's own extent (x ∈ [0,1/2] forces t ≤ −1/2), valid exactly
on [−1,−1/2].

### Regime 4 — t ∈ [−1/2, 0]: vertex V2 = (1/2, 0, 1/2)

Active constraints: c2, c5. Solving ∇g_t(1/2,0) = λ2(0,1)+λ5(−1,1):
λ5 = 1+2t,  λ2 = 1−λ5 = −2t.
λ2 ≥ 0 ⟺ t ≤ 0; λ5 ≥ 0 ⟺ t ≥ −1/2. Valid exactly on [−1/2,0]. Value = 5/2 − t.

### Regime 5 — t ∈ [0, 9/5]: edge E (2y+z=1/2, i.e. y=x−1/2)

Substituting y=x−1/2 into g_t gives 18x² + (−18−2t)x + 7, minimized at x=(9+t)/18. Point:
**(x,y,z) = ((9+t)/18, t/18, (9−2t)/18)**, value = −t²/18 − t + 5/2.
Active constraint: c5. λ5 = ∂g_t/∂y = (10t+9)/9.
λ5 ≥ 0 ⟺ t ≥ −9/10 (slack throughout this regime); the edge's own extent (x ∈ [1/2,3/5]) forces
t ∈ [0, 9/5]. Valid exactly on [0,9/5].

### Regime 6 — t ∈ [9/5, 4]: vertex V3 = (3/5, 1/10, 3/10)

Active constraints: c4, c5. Solving ∇g_t(3/5,1/10) = λ4(−1,0)+λ5(−1,1):
λ5 = 3,  λ4 = 2t − 18/5.
λ4 ≥ 0 ⟺ t ≥ 9/5; λ5 = 3 ≥ 0 always. Valid on [9/5, 4] (and beyond, but 4 is the top of the stated
domain).

## 6. Why no other face is ever the answer, on the entire interval [−2,4]

Regimes 1–6 already tile [−2,4] exactly and contiguously: [−2,−3/2]∪[−3/2,−1]∪[−1,−1/2]∪
[−1/2,0]∪[0,9/5]∪[9/5,4] = [−2,4], with matching point and value at every shared endpoint (§7).
Since §2 established a unique global minimizer exists for every t, and a KKT point with correct signs
is automatically that unique minimizer, exhibiting one valid‑sign KKT point for **every** t in the
interval already proves completeness: there is no room left for another face to be optimal anywhere
in [−2,4].

As a direct check (not required for the proof, but included for transparency), the remaining three
vertices and two edges are ruled out explicitly:

- **V1 = (0,0,1)** (active c1,c2): solving gives λ2 = −3 identically (independent of t) — never ≥ 0. Never optimal.
- **V5 = (0,1,0)** (active c1,c3): solving gives λ3 = −9 identically — never ≥ 0. Never optimal.
- **V4 = (3/5,2/5,0)** (active c3,c4): solving gives λ3 = −33/5 identically — never ≥ 0. Never optimal.
- **Edge C interior** (x+y=1, active c3 alone): stationarity forces x = t/2+3/2 *and* λ3 = 2t−3 ≥ 0
  (t ≥ 3/2). But then x = t/2+3/2 ≥ 3/4+3/2 = 9/4, far outside edge C's range x∈[0,3/5]. The two
  requirements (correct sign, correct location) never hold simultaneously for any t ∈ [−2,4].
- **Edge D interior** (x=3/5, active c4 alone): stationarity requires ∂g_t/∂y = 12y+9/5 = 0, i.e.
  y = −3/20 — independent of t, and negative, hence never inside edge D's range y∈[1/10,2/5]. Never
  reachable for any t.

So all 11 combinatorially possible KKT locations on this pentagon (1 interior + 5 edges + 5 vertices)
have been checked; exactly six of them are ever active, on six intervals that exactly tile [−2,4], and
the other five never satisfy the sign conditions anywhere in the interval. Nothing is missed.

## 7. Continuity and differentiability of the optimizer and the value function

**Point continuity.** Evaluate adjacent regimes at each breakpoint (all confirmed symbolically):

- t=−3/2: R1 gives (0, 1/4, 3/4); R2 gives ((9−9)/8, −(1−1.5)/2, ·) = (0, 1/4, 3/4). Match.
- t=−1: R2 gives (3/8, 0, 5/8); R3 gives ((5−2)/8, 0, ·) = (3/8, 0, 5/8). Match.
- t=−1/2: R3 gives (1/2, 0, 1/2); R4 is (1/2,0,1/2). Match.
- t=0: R4 is (1/2,0,1/2); R5 gives (9/18, 0, 9/18) = (1/2,0,1/2). Match.
- t=9/5: R5 gives (3/5, 1/10, 3/10); R6 is (3/5,1/10,3/10). Match.

The optimizer (x*(t),y*(t),z*(t)) is therefore continuous, in fact piecewise‑affine and continuous,
on all of [−2,4].

**Value function.** The optimal value

  F(t) = 29/8  on [−2,−3/2]
       = −3t²/4 − 9t/4 + 31/16  on [−3/2,−1]
       = −t²/4 − 5t/4 + 39/16  on [−1,−1/2]
       = 5/2 − t  on [−1/2,0]
       = −t²/18 − t + 5/2  on [0,9/5]
       = 67/25 − 6t/5  on [9/5,4]

is continuous (values match at every breakpoint: 29/8 at −3/2; 55/16 at −1; 3 at −1/2; 5/2 at 0;
13/25 at 9/5 — all confirmed symbolically) and **continuously differentiable (C¹)**. This is the
envelope theorem in action: since the active constraints are affine (their gradients don't depend on t)
and t enters f_t only through the term (2−2t)x, F′(t) = ∂f_t/∂t |_{optimum} = −2x*(t) wherever x*(t)
is differentiable, and one checks directly that this formula gives the *same* one‑sided derivative
from both sides at every breakpoint (because x*(t) itself is continuous there — §7 point continuity —
so −2x*(t) is too). Concretely, F′ is −2·0=0 on R1, −3t/2−9/4 on R2, −t/2−5/4 on R3, −1 on R4 (matches
x*≡1/2), −t/9−1 on R5, −6/5 on R6 — and these six formulas agree pairwise at −3/2,−1,−1/2,0,9/5.
F is **not** C² (the active set, hence the second derivative, jumps at each breakpoint), which is the
generic and expected behavior for a parametric convex QP whose active set changes.

## 8. Final answer

For t ∈ [−2, 4], the unique global optimizer and optimal value are:

| t‑range | x*(t) | y*(t) | z*(t) | value F(t) | Active constraints (multipliers) |
|---|---|---|---|---|---|
| [−2, −3/2] | 0 | 1/4 | 3/4 | 29/8 | c1: λ1=−3−2t |
| [−3/2, −1] | (9+6t)/8 | −(1+t)/2 | (3−2t)/8 | −3t²/4−9t/4+31/16 | none |
| [−1, −1/2] | (5+2t)/8 | 0 | (3−2t)/8 | −t²/4−5t/4+39/16 | c2: λ2=2t+2 |
| [−1/2, 0] | 1/2 | 0 | 1/2 | 5/2−t | c2: λ2=−2t; c5: λ5=2t+1 |
| [0, 9/5] | (9+t)/18 | t/18 | (9−2t)/18 | −t²/18−t+5/2 | c5: λ5=(10t+9)/9 |
| [9/5, 4] | 3/5 | 1/10 | 3/10 | 67/25−6t/5 | c4: λ4=2t−18/5; c5: λ5=3 |

Each multiplier is ≥ 0 throughout its stated range and equals 0 exactly at the range's boundary where
the corresponding constraint transitions between active and inactive (verified in §5–§6), which is
exactly the condition that makes this the unique global minimizer at every t by the convex‑KKT
sufficiency argument of §2. The optimizer and value function are continuous and C¹ on all of [−2,4]
(§7), confirming the six pieces glue into one coherent, globally optimal, piecewise‑exact answer with
no gaps and no missed competing face.
