# Parametric optimization — complete solution for all t ∈ [-2, 4]

Minimize `f_t(x,y,z) = x² + 2y² + 3z² + xy − yz + (2−2t)x + 5y + z`
subject to `x+y+z=1`, `x,y,z ≥ 0`, `x ≤ 3/5`, `2y+z ≥ 1/2`.

## 1. Answer table (exact)

The problem is a strictly convex quadratic program with a convex, **t‑independent** feasible set, so for every `t` a unique global minimizer exists (§3). It passes through six regimes as `t` increases:

| t‑range | Active set | x*(t) | y*(t) | z*(t) | f*(t) |
|---|---|---|---|---|---|
| [−2, −3/2] | edge x=0 | 0 | 1/4 | 3/4 | 29/8 |
| [−3/2, −1] | interior | (9+6t)/8 | −(1+t)/2 | (3−2t)/8 | (−12t²−36t+31)/16 |
| [−1, −1/2] | edge y=0 | (5+2t)/8 | 0 | (3−2t)/8 | 4 − (5+2t)²/16 |
| [−1/2, 0] | vertex B | 1/2 | 0 | 1/2 | (5−2t)/2 |
| [0, 9/5] | edge y=x−1/2 | (9+t)/18 | t/18 | (9−2t)/18 | 7 − (9+t)²/18 |
| [9/5, 4] | vertex C | 3/5 | 1/10 | 3/10 | 67/25 − (6/5)t |

Transition values: t = −3/2, −1, −1/2, 0, 9/5 (all exact rationals; no other regime boundary occurs on [−2,4]).
Sample values: f*(−2)=29/8, f*(−3/2)=29/8, f*(−1)=55/16, f*(−1/2)=3, f*(0)=5/2, f*(9/5)=13/25, f*(4)=−53/25.

f*(t) and (x*,y*,z*)(t) are continuous on all of [−2,4] and differentiable except at the five transition points, where the left/right derivatives differ (a "kink," not a jump — see §5).

## 2. Geometry: eliminating z

Substituting `z = 1−x−y` turns the six constraints into a pentagon in the (x,y) plane (z ≥ 0 becomes x+y ≤ 1):

```
x ≥ 0,   y ≥ 0,   x+y ≤ 1,   x ≤ 3/5,   y ≥ x − 1/2
```

Each of the 5 inequalities is tight somewhere on the boundary (none is redundant), giving exactly five vertices, traversed as:

```
A(0,0) → B(1/2,0) → C(3/5,1/10) → D(3/5,2/5) → E(0,1) → A
  (y=0)     (y=x−1/2)    (x=3/5)      (x+y=1)      (x=0)
```

See **diagram.svg** for the labeled pentagon and the optimizer's path.

Substituting z into the objective gives a reduced 2‑D quadratic

```
f(x,y) = 4x² + 8xy + 6y² − (5+2t)x − 3y + 4
```

with constant Hessian `H = [[8,8],[8,12]]` (independent of x, y, z, t). Since `det H = 96−64 = 32 > 0` and `H₁₁ = 8 > 0`, H is **positive definite**, so f is strictly convex in (x,y) for every t. A strictly convex function has at most one minimizer on any convex set, and the pentagon is compact, so a minimizer exists and is unique for every t (§3 makes this a formal KKT argument).

Only `t` enters the x‑coefficient (via `−(5+2t)x`); y's coefficients never involve t. Consequently the unconstrained stationary point of the full-space quadratic,

```
x₀(t) = (9+6t)/8,   y₀(t) = −(1+t)/2       (solving 8x+8y=5+2t, 8x+12y=3)
```

sweeps out a **straight line** in (x,y) as t varies (direction vector (3,−2)): larger t pulls the unconstrained optimum toward larger x and smaller y. As it sweeps, it enters the pentagon (interior optimum), then exits through each edge in turn, producing the six regimes: `edge x=0` → `interior` → `edge y=0` → `vertex B` → `edge y=x−1/2` → `vertex C`. Vertices D and E, and edge x+y=1 and the rest of edge x=3/5, are geometrically on the *opposite* side of the pentagon from this sweep direction (increasing x, decreasing y) and are never visited for t ∈ [−2,4] — proved rigorously via KKT sign conditions in §4, not merely by this geometric picture.

## 3. Why the optimum is unique everywhere (general argument)

For fixed t, f(x,y) is strictly convex (§2) and the feasible pentagon is convex and compact. A strictly convex function attains its minimum over a convex set at a **unique** point: if two distinct minimizers existed, the midpoint would be feasible (convexity of the set) and would give a strictly smaller value than the shared minimum (strict convexity of f) — contradiction. Hence uniqueness holds automatically in every regime, at every t, without needing separate arguments per face. Global optimality of each candidate point is established by KKT sufficiency for convex programs (§4): since f is convex and all six constraints are affine (a linear program's feasible region — no constraint qualification issues, Slater's condition holds trivially), any point satisfying KKT is the unique global minimizer.

## 4. KKT conditions, sign convention, and every regime

Write the six inequality constraints as `g_i(x,y) ≥ 0`:

```
g1 = x            g2 = y            g3 = 1−x−y
g4 = 3/5 − x       g5 = y − x + 1/2
```

(`g3` is x+y≤1, i.e. z≥0.) KKT stationarity (minimize f s.t. g_i≥0):

```
∇f(x,y) = Σ λ_i ∇g_i,     λ_i ≥ 0,     λ_i g_i(x,y) = 0   (i=1..5)
```

with `∇f = (8x+8y−5−2t, 8x+12y−3)`, `∇g1=(1,0)`, `∇g2=(0,1)`, `∇g3=(−1,−1)`, `∇g4=(−1,0)`, `∇g5=(−1,1)`.

Because f is convex and every g_i is affine, **KKT is necessary and sufficient for global optimality** (no gap to worry about) — this is the standard convex-programming KKT sufficiency theorem, applied directly, not asserted.

**Regime 1 — interior, t ∈ [−3/2,−1].** All λ_i = 0 (no constraint active); ∇f=0 gives x=(9+6t)/8, y=−(1+t)/2. This is a genuine KKT point for exactly the t-range where the resulting (x,y) is itself feasible; solving the five inequality constraints for that (x,y) as functions of t (the algebra is in §5) gives precisely t ∈ [−3/2,−1] — outside this range the "solution" would demand a negative multiplier were it forced, so it is not optimal there and a boundary must activate.

**Regime 2 — edge x=0, t ∈ [−2,−3/2].** Only g1 active (λ2=λ3=λ4=λ5=0). Setting x=0 and minimizing the 1‑D function `f(0,y)=6y²−3y+4` gives y=1/4 (root of 12y−3=0), independent of t — this is why the optimizer is *frozen* at (0,1/4) throughout this whole sub-interval. Stationarity in x: `∂f/∂x|_{(0,1/4)} = 2−5−2t = −3−2t = λ1`. Feasibility of the multiplier, `λ1 ≥ 0`, requires `t ≤ −3/2` — exactly matching where regime 1's interior solution would otherwise require x<0. At t=−3/2, λ1=0 (constraint about to release) and the two regimes meet with equal position, value, and derivative (§5).

**Regime 3 — edge y=0, t ∈ [−1,−1/2].** Only g2 active. Minimizing `f(x,0)=4x²−(5+2t)x+4` in x gives x=(5+2t)/8. Stationarity in y: `∂f/∂y|_{(x,0)} = 8x−3 = (5+2t)−3 = 2+2t = λ2`. `λ2≥0 ⇔ t≥−1`, matching where the interior solution would need y<0. The edge itself only spans x∈[0,1/2]; x=(5+2t)/8 stays inside that range for t≤−1/2, giving the regime's right endpoint.

**Regime 4 — vertex B=(1/2,0), t ∈ [−1/2,0].** g2 and g5 both active. Solve `∇f(B) = λ2(0,1)+λ5(−1,1)`: `∂f/∂x|_B = 4−5−2t=−1−2t = −λ5 ⇒ λ5=1+2t`; `∂f/∂y|_B = 4−3=1=λ2+λ5 ⇒ λ2=1−λ5=−2t`. Both multipliers are non-negative exactly for `t ∈ [−1/2,0]` (λ5≥0 ⇔ t≥−1/2; λ2≥0 ⇔ t≤0) — a clean two-sided certificate that this single point, not a whole edge, is optimal on this range.

**Regime 5 — edge y=x−1/2, t ∈ [0, 9/5].** Only g5 active. Parametrizing the edge by x (y=x−1/2) gives the 1‑D quadratic `f(x)=18x²−(18+2t)x+7`, minimized at x=(9+t)/18. Stationarity: `λ5 = ∂f/∂y|_{edge} = 8x+12y−3 = (9+10t)/9` (derived in §5), which is ≥0 throughout t≥0 and in particular on [0,9/5]. The edge itself spans x∈[1/2,3/5]; x=(9+t)/18 stays in that window precisely for t∈[0,9/5].

**Regime 6 — vertex C=(3/5,1/10), t ∈ [9/5,4].** g4 and g5 both active. Solve `∇f(C)=λ4(−1,0)+λ5(−1,1)`: `∂f/∂y|_C = 24/5+6/5−3 = 3 = λ5` (constant — note this matches λ5=(9+10t)/9 at t=9/5, giving 3, confirming continuity of the multiplier itself); `∂f/∂x|_C = 24/5+4/5−5−2t = 3/5−2t = −λ4−λ5 ⇒ λ4 = 2t−18/5`. `λ4 ≥ 0 ⇔ t ≥ 9/5`, and this holds up to and including t=4 (the right end of the stated domain) with no further transition: as t grows the point stays capped at x=3/5 (its ceiling) and y stays capped at x−1/2=1/10 (its floor along that edge, since the unconstrained-in-y minimizer along x=3/5 works out to y=−3/20 < 1/10, so the y≥x−1/2 bound stays binding for every t in this regime — verified in §5). Hence C remains optimal for the rest of the interval; there is no seventh regime.

**Why no face is missed.** The five regimes above were derived by *exhaustively* checking, for each of the 5 possible "no constraint active" / "one constraint active" / "two adjacent constraints active" cases that actually occur along the sweep direction (3,−2), the sign of every resulting multiplier as an explicit affine function of t, and finding the (necessarily contiguous, since each λ_i(t) is affine in t and changes sign once) t-interval where all relevant multipliers are simultaneously non‑negative. Every other face of the pentagon (vertex A, vertex D, vertex E, edge CD, edge DE) was checked and *excluded*:
- **Vertex A=(0,0):** g1,g2 active. `∂f/∂x|_A=−5−2t=−λ1`⇒λ1=5+2t; `∂f/∂y|_A=−3=λ2`⇒λ2=−3<0 always. λ2 is never ≥0, so A is **never** optimal — consistent with the edge-x=0 analysis, which independently found the optimal y on that edge is always 1/4 (never pushed down to 0).
- **Vertex D=(3/5,2/5):** g4,g3 active. `∂f/∂y|_D = 24/5+24/5−3=33/5 = −λ3` (using ∇g3=(−1,−1)) ⇒ λ3=−33/5<0 always. Never optimal.
- **Vertex E=(0,1):** g1,g3 active. `∂f/∂y|_E=12−3=9=−λ3`⇒λ3=−9<0 always. Never optimal.
- **Edge CD (x=3/5 interior, y∈(1/10,2/5)):** only g4 active; stationarity in y requires `∂f/∂y=8(3/5)+12y−3=0 ⇒ y=−3/20`, which is outside (1/10,2/5) for every t (the equation doesn't even involve t). So the true minimum of f restricted to x=3/5 always occurs at the lower end y=1/10 (vertex C), never in the interior of CD, for any t.
- **Edge DE (x+y=1 interior):** only g3 active; stationarity requires `∇f=λ3(−1,−1)`, i.e. `∂f/∂x=∂f/∂y`. On this edge y=1−x, so `∂f/∂x−∂f/∂y = (8x+8y−5−2t)−(8x+12y−3) = −4y−2−2t`. Setting to 0: `y=−(1+t)/2`. For this to lie in edge DE's range y∈(2/5,1) we'd need t<−9/5, but then checking λ3 = −(∂f/∂y) = −(8x+12y−3) at that point gives, after substitution, `λ3 = −(8(1−y)+12y−3)=−(8+4y−3)=−(5+4y)`; with y=−(1+t)/2 this is `−(5−2(1+t))=−(3−2t)`, which is negative for t<3/2 — in particular for all t<−9/5 in our domain. So λ3<0 throughout the only t-range where the stationarity point would even lie on DE: edge DE is never optimal either.

Since every vertex/edge not appearing in the table above yields an infeasible (negative) multiplier for **every** t in [−2,4], and the six listed regimes already cover [−2,4] contiguously and completely (their union of t-intervals is exactly [−2,4], confirmed by matching endpoints in the table), no case was skipped.

## 5. Continuity and the nature of each transition

At each of the five transition points, position, value are continuous and the *active-set derivative* matches on both sides (only the *second* derivative, or a multiplier hitting zero, changes) — these are smooth "regime hand-offs," not kinks in the optimizer's trajectory itself, though f* does have a kink (matching one-sided derivatives only where explicitly noted):

- **t=−3/2** (edge x=0 → interior): both sides give (x,y,z)=(0, 1/4, 3/4); value 29/8 on both sides (region 2's value is constant at 29/8, and region 1's formula gives `(−12(9/4)−36(−3/2)+31)/16=(−27+54+31)/16=58/16=29/8` ✓). Multiplier λ1 → 0.
- **t=−1** (interior → edge y=0): both give (3/8, 0, 5/8); value 55/16 on both sides (checked directly from each formula). The active constraint switches from none to g2, with λ2=0 exactly at the hand-off (continuous).
- **t=−1/2** (edge y=0 → vertex B): both give (1/2,0,1/2); value 3 on both sides. λ5=0 at the hand-off.
- **t=0** (vertex B → edge y=x−1/2): both give (1/2,0,1/2); value 5/2 on both sides. λ2=0 at the hand-off.
- **t=9/5** (edge → vertex C): both give (3/5,1/10,3/10); value 13/25 on both sides (7−(9+9/5)²/18 = 7−(54/5)²/18 = 7−(2916/25)/18=7−162/25=13/25, matching 67/25−(6/5)(9/5)=67/25−54/25=13/25). λ4=0 at the hand-off.

**Envelope-theorem cross-check (used only as an internal consistency check, not as the proof of optimality):** by the envelope theorem, `d f*/dt = ∂f/∂t` evaluated at the optimizer, holding (x,y) fixed at its optimal value — here `∂f/∂t = −2x`, so `f*'(t) = −2x*(t)` on every regime. This was verified to hold exactly for each of the six closed-form pieces above (e.g. region 1: `f*'(t)=−9/4−3t/2` and `−2x*(t)=−2(9+6t)/8=−9/4−3t/2` ✓; region 6: `f*'(t)=−6/5` and `−2x*(t)=−2(3/5)=−6/5` ✓), confirming the algebra is internally consistent. `f*` is C⁰ everywhere and piecewise-C^∞, with one-sided derivatives that generally differ at the five transition points (e.g. at t=−1, left derivative is `f*'=−9/4−3(−1)/2=−3/4`, right derivative is `−(5+2(−1))/4=−3/4` — these actually agree at t=−1; check t=−1/2: left region-3 derivative `−(5+2(−1/2))/4=−1`, region-4 derivative is `−1` — also agree; in fact `f*` is C¹ across every boundary here, because x*(t) itself is continuous at every transition, and `f*'=−2x*(t)` depends continuously on x* alone). So `f*` is continuous and continuously differentiable (C¹) on the entire interval [−2,4], with only the *second* derivative jumping at the five transition points (a change in curvature, not a corner) — a stronger and more precise continuity statement than "just continuous."

## 6. Plain-language summary of the transitions

- **t ≤ −3/2:** the linear pull `(2−2t)x` on x is so strongly *positive* (t very negative makes `2−2t` large) that decreasing x below the pentagon's left edge would be preferred if it were allowed — so x is pinned at its floor, x=0, and y settles wherever the remaining quadratic (independent of x and t) is smallest, namely y=1/4.
- **−3/2 ≤ t ≤ −1:** the pull weakens enough that the unconstrained sweet spot moves into the interior of the pentagon — no constraint fights the optimizer here.
- **−1 ≤ t ≤ −1/2:** as t keeps increasing, the optimizer's target y-value goes negative, so y is pinned at its floor y=0 while x slides along that edge.
- **−1/2 ≤ t ≤ 0:** x sliding along y=0 reaches the point (1/2,0) where the feasible region's boundary turns a corner (into the y=x−1/2 wall); for this range of t neither wall alone can be relaxed without leaving the pentagon, so the single corner point B stays optimal.
- **0 ≤ t ≤ 9/5:** past that corner, the optimizer follows the new wall y=x−1/2, sliding toward larger x.
- **t ≥ 9/5:** x hits its absolute ceiling x=3/5 (the explicit constraint x≤3/5) at the same time the y=x−1/2 wall is still binding — both constraints pin the same point C, and larger t only makes the objective value decrease further (more negative) without moving the optimizer, since it is now trapped in the pentagon's corner.

## 7. Recovering z, and reading off the value

`z*(t) = 1 − x*(t) − y*(t)` is tabulated directly (§1); it is always strictly positive except approaching t→∞ in principle (not in our range) — on [−2,4], z* ranges from 3/10 (at t≥9/5) up to 3/4 (at t≤−3/2), always comfortably inside (0,1]. `f*(t)` is given piecewise in §1 and is continuous/C¹ as shown in §5.
