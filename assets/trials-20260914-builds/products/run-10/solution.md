# Parametric QP — complete solution for all t in [-2, 4]

## 0. Problem

Minimize, for fixed real `t`,

```
f_t(x,y,z) = x^2 + 2y^2 + 3z^2 + xy - yz + (2-2t)x + 5y + z
```

subject to

```
x + y + z = 1,   x,y,z >= 0,   x <= 3/5,   2y + z >= 1/2.
```

We solve this exactly for every `t in [-2,4]`, prove global optimality and
uniqueness of the optimizer at every `t`, give KKT multipliers with an
explicit sign convention, and prove no feasible region or parameter
sub-range was missed.

---

## 1. Reduction to two variables

Eliminate `z = 1-x-y`. Substituting into `f_t` and expanding term by term
(quadratic terms `x^2`, `2y^2`, `3(1-x-y)^2`, `xy`, `-y(1-x-y)`, then the
linear terms) gives, after collecting coefficients,

```
g_t(x,y) := f_t(x,y,1-x-y) = 4x^2 + 6y^2 + 8xy - (5+2t)x - 3y + 4.
```

**Check** (random-sampled, machine precision, 2×10^5 trials over
`t∈[-2,4]`, `x,y∈[-5,5]`): `max|f_t(x,y,1-x-y) - g_t(x,y)| = 2.8e-13`
(rounding only). Three sign checks by hand: `g_t(0,0)=4=f_t(0,0,1)`;
`g_t(1,0)=8-(5+2t)+4=3-2t=f_t(1,0,0)`; `g_t(0,1)=6-3+4=7=f_t(0,1,0)`. ✓.

The equality constraint eliminates the extra dimension exactly once, so
the reduced problem

```
minimize  g_t(x,y)   over the polygon K = { (x,y) : constraints below }
```

is *equivalent* to the original problem (bijection `(x,y) ↔ (x,y,1-x-y)`),
and every claim about `(x*(t),y*(t))` below carries over to
`z*(t) = 1-x*(t)-y*(t)` automatically.

The five inequality constraints become, in `(x,y)`:

| original | in (x,y) |
|---|---|
| x ≥ 0 | x ≥ 0 |
| y ≥ 0 | y ≥ 0 |
| z ≥ 0 | x+y ≤ 1 |
| x ≤ 3/5 | x ≤ 3/5 |
| 2y+z ≥ 1/2 | y ≥ x - 1/2 |

## 2. Strict convexity ⇒ unique global minimizer for every t

`g_t` is quadratic with Hessian `H = [[8,8],[8,12]]` (constant, independent
of `t`). `tr H = 20 > 0`, `det H = 96-64 = 32 > 0` ⇒ both eigenvalues
positive (exactly `10 ± √68`, i.e. `≈1.754` and `≈18.246`, confirmed
numerically). So `g_t` is **strictly convex** in `(x,y)` for every `t`,
and `K` is a nonempty compact convex polygon (bounded inside `[0,0.6]×[0,1]`,
nonempty since e.g. `(0.3,0.3)∈K`). A strictly convex function on a
nonempty compact convex set has a **unique** global minimizer. This holds
for *every* real `t`; existence/uniqueness is never in question, only its
location.

`K` has nonempty interior (e.g. `(0.3,0.3)`: `x+y=0.6<1`, `x<0.6`,
`y-x=0>-0.5`, all strict) — **Slater's condition holds**, so for this
convex problem KKT is not only necessary but **sufficient** for global
optimality. Every stationary point exhibited below that also satisfies
primal feasibility, dual feasibility (`λ≥0`) and complementary slackness
is therefore *the* global optimum, and by strict convexity it is unique.

## 3. The feasible polygon K

Solving all pairs of the 5 boundary lines and keeping only the
feasible intersections (independently re-derived by brute-force
pairwise intersection + feasibility filtering — see `verification.md`)
gives exactly five vertices, in cyclic order:

```
V1 = (0, 0)      V2 = (1/2, 0)     V3 = (3/5, 1/10)
V4 = (3/5, 2/5)  V5 = (0, 1)
```

with edges `V1V2: y=0`, `V2V3: y=x-1/2`, `V3V4: x=3/5`, `V4V5: x+y=1`,
`V5V1: x=0`. (5 constraints ⇒ at most 5 vertices generically; all 5
materialize here, confirmed by the count of feasible pairwise
intersections: 5 feasible out of 9 non-parallel pairs.)

## 4. Monotonicity lemma (the key structural fact)

**Lemma.** Let `t1 < t2` and let `v1=(x1,y1,z1)`, `v2=(x2,y2,z2)` be *any*
respective minimizers of `f_{t1}`, `f_{t2}` over the same feasible set
(no convexity or uniqueness needed yet). Then `x1 ≤ x2`.

*Proof.* Write `f_t(v) = h(v) - 2t·x_v` where
`h(v)=x^2+2y^2+3z^2+xy-yz+2x+5y+z` does not depend on `t` and `x_v` is the
x-coordinate of `v`. Optimality of `v1` for `t1` and `v2` for `t2` gives

```
h(v1) - 2t1 x1 ≤ h(v2) - 2t1 x2        (v1 optimal at t1)
h(v2) - 2t2 x2 ≤ h(v1) - 2t2 x1        (v2 optimal at t2)
```

Adding: `-2t1x1 - 2t2x2 ≤ -2t1x2 - 2t2x1`, i.e.
`2(t2-t1)(x2-x1) ≥ 0`. Since `t2>t1`, `x2 ≥ x1`. ∎

Because the minimizer is **unique** for every `t` (§2), this makes
`x*(t)` a genuine non-decreasing function of `t` on all of `ℝ`, in
particular on `[-2,4]`. Continuity of `(x*(t),y*(t))` follows from a
standard compactness argument (any sequence `t_n→t` has minimizers in the
compact set `K`; every convergent subsequence's limit is feasible and, by
joint continuity of `g_t` in `(t,x,y)`, optimal for `f_t`; by uniqueness
the limit must be `(x*(t),y*(t))`, so the whole sequence converges to it).

**Consequence used for completeness (§6):** the true optimal path
`t ↦ (x*(t),y*(t))` is a *continuous, x-monotone* curve. It can only pass
through the boundary faces of `K` in an order compatible with
non-decreasing `x`. This is what lets us certify, by direct KKT check on
each candidate face, that we have found *all* of it with no gap.

## 5. KKT sign convention

Write the inequality constraints as `≤ 0`: `-x≤0, -y≤0, -z≤0, x-3/5≤0,
1/2-2y-z≤0`, with multipliers `λ1,λ2,λ3,λ4,λ5 ≥ 0` respectively, and
`ν ∈ ℝ` free for the equality `x+y+z=1`. Lagrangian:

```
L = f_t + ν(x+y+z-1) + λ1(-x)+λ2(-y)+λ3(-z)+λ4(x-3/5)+λ5(1/2-2y-z)
```

Stationarity `∇L=0`:

```
2x+y+(2-2t) + ν - λ1 + λ4        = 0     (∂x)
4y+x-z+5    + ν - λ2 - 2λ5       = 0     (∂y)
6z-y+1      + ν - λ3 - λ5        = 0     (∂z)
```

plus complementary slackness `λ1x=λ2y=λ3z=λ4(x-3/5)=λ5(1/2-2y-z)=0` and
`λi ≥ 0`.

## 6. Case analysis — every candidate face

We test the interior and each of the 10 boundary faces of `K` (5
vertices + 5 open edges). Each test: assume that face's active set,
solve stationarity exactly (done independently in exact rational
arithmetic with `sympy`, and cross-checked with brute-force numerics —
see `verification.md`), then find the exact `t`-range where (a) the
point stays within the face's geometric extent and (b) all multipliers
are `≥0`.

### 6.1 Interior (no inequality active)

`∇g_t=0`: `8x+8y=5+2t`, `8x+12y=3` ⇒

```
x = (9+6t)/8,   y = -(1+t)/2,   z = (3-2t)/8.
```

Feasible (all 5 inequalities strict) exactly for `t ∈ (-3/2,-1)`; at the
two endpoints one constraint touches with zero slack (matching the
adjacent pieces below by continuity). Multipliers: `ν=(4t-15)/4`, all
`λi=0`.

### 6.2 Edge `V5V1` (x=0)

With `x=0`: `g_t(0,y)=6y^2-3y+4`, minimized at `y=1/4` — **independent of
`t`**, because the only `t`-dependent term multiplies `x=0`. KKT: need
`λ1 = ∂g/∂x|_{(0,1/4)} = -3-2t ≥ 0 ⟺ t ≤ -3/2`. Point `(0,1/4,3/4)` lies
strictly inside the edge (`1/4∈(0,1)`), so it is valid for **all**
`t ≤ -3/2`, in particular the whole sub-range `t ∈ [-2,-3/2]` of our
domain (and beyond, arbitrarily negative `t`).

### 6.3 Edge `V1V2` (y=0)

`g_t(x,0)=4x^2-(5+2t)x+4`, minimized at `x=(5+2t)/8`. Need
`0≤x≤1/2 ⟺ t∈[-5/2,-1/2]`, and `λ2 = 8x-3 = 2t+2 ≥ 0 ⟺ t≥-1`. Combined:
`t ∈ [-1,-1/2]`.

### 6.4 Vertex V2 = (1/2,0)

Active constraints: `y≥0` and `y≥x-1/2` (both). Feasible directions from
`V2` are spanned by `d1=(-1,0)` (toward V1) and `d2=(1,1)` (toward V3).
`∇g_t(V2) = (-1-2t, 1)`. Need `∇g_t·d1 = 1+2t ≥ 0 ⟺ t≥-1/2` and
`∇g_t·d2 = -2t ≥ 0 ⟺ t≤0`. Combined: `t ∈ [-1/2,0]`. (Equivalently,
solving stationarity with `λ2,λ5` free gives `λ2=-2t, λ5=2t+1`, same
range.)

### 6.5 Edge `V2V3` (y = x-1/2)

Substituting `y=x-1/2`: `h(x)=18x^2-(18+2t)x+7`, minimized at
`x=(9+t)/18`. Need `1/2≤x≤3/5 ⟺ t∈[0,9/5]`. On this edge only `λ5` can be
nonzero; solving gives `λ5=(9+10t)/9 ≥0 ⟺ t≥-9/10`, satisfied throughout
`[0,9/5]` with room to spare (so the binding limits are the edge's own
extent, not the multiplier sign). Point: `x=(9+t)/18, y=t/18,
z=(9-2t)/18`.

### 6.6 Vertex V3 = (3/5,1/10)

Active: `x≤3/5` and `y≥x-1/2`. Feasible directions: `d1=(-1,-1)` (toward
V2), `d2=(0,1)` (toward V4). `∇g_t(V3) = (0.6-2t, 3)`. Need
`∇g_t·d1 = 2t-3.6 ≥ 0 ⟺ t≥9/5` and `∇g_t·d2 = 3 ≥ 0` (always true,
independent of `t`). So V3 is optimal for **all `t ≥ 9/5`**, in
particular the whole sub-range `t∈[9/5,4]` of our domain (and beyond).
Multipliers: `λ4=2t-18/5, λ5=3` (constant).

### 6.7 The remaining four faces are never optimal — completeness

The four remaining candidates are vertex `V1`, edge `V3V4`(interior),
vertex `V4`, edge `V4V5`, vertex `V5`. We show none of them satisfies
KKT for **any** real `t`, so together with §6.1–6.6 the case analysis is
exhaustive.

* **V1=(0,0):** feasible directions `(1,0)` (toward V2), `(0,1)` (toward
  V5). `∇g_t(V1)=(-(5+2t),-3)`. The `(0,1)`-directional derivative is
  `-3 < 0` for *every* `t` — moving from V1 toward V5 always strictly
  decreases `g_t`. V1 is never a local (hence never a global) minimum.

* **Edge V3V4 (x=3/5, y∈(1/10,2/5)):** `g_t(3/5,y)=6y^2+1.8y+(2.44-1.2t)`,
  minimized at `y=-3/20`, which is **independent of `t`** and lies
  *outside* `[1/10,2/5]` for every `t` (it's below the whole range).
  Since the parabola is increasing for `y>-3/20`, the constrained minimum
  on `y∈[1/10,2/5]` is always at the left endpoint `y=1/10`, i.e. at
  vertex V3 — the open edge interior is never attained.

* **V4=(3/5,2/5):** feasible directions `(0,-1)` (toward V3), `(-1,1)`
  (toward V5). `∇g_t(V4)=(3-2t, 6.6)`. The `(0,-1)`-directional
  derivative is `-6.6 < 0` for every `t` — moving from V4 toward V3
  always strictly decreases `g_t`. Never optimal.

* **Edge V4V5 (x+y=1, i.e. z=0, x∈(0,3/5)):** substituting `y=1-x`:
  `h(x)=2x^2-(6+2t)x+7`, minimized at `x=(3+t)/2`. Requiring
  `x∈[0,3/5]` forces `t ≤ -9/5`. But solving stationarity with `λ3` free
  gives `λ3 = 2t-3`, which requires `t ≥ 3/2`. `t≤-9/5` and `t≥3/2`
  cannot both hold — **contradiction for every real `t`**. This edge's
  interior is never optimal.

* **V5=(0,1):** feasible directions `(0,-1)` (toward V1), `(1,-1)`
  (toward V4). `∇g_t(V5)=(3-2t,9)`. The `(0,-1)`-directional derivative
  is `-9 < 0` for every `t`. Never optimal.

**Numerical confirmation** (see `verification.md`): evaluating `g_t` at
V1, V4, V5, and interior points of edges V3V4 and V4V5, against the
value our solution attains, the margin `g_t(candidate) - g_t(ours)` is
strictly positive (≥ 0.375) at every sampled `t ∈ [-2,4]`.

### 6.8 Why the six surviving pieces tile [-2,4] with no gap

By §4, `x*(t)` is continuous and non-decreasing. The six pieces found
have `x`-ranges `{0}, [0,3/8], [3/8,1/2], \{1/2\}, [1/2,3/5], \{3/5\}`
respectively (using the endpoint values, computed below) that are
consecutive and non-decreasing, and their `t`-validity intervals
`[-2,-3/2],[-3/2,-1],[-1,-1/2],[-1/2,0],[0,9/5],[9/5,4]` partition
`[-2,4]` exactly, meeting only at shared endpoints where the two
formulas agree (checked below, §8). Since (i) every face of `K` has been
tested, (ii) the four untested-and-excluded faces are proven dead for
all real `t` (§6.7), and (iii) the six surviving pieces' validity
intervals already cover `[-2,4]` with no room left over, there is no
missing sub-range and no missed competing face.

## 7. The complete piecewise-exact answer

| `t` range | `x*` | `y*` | `z*` | active constraints |
|---|---|---|---|---|
| `[-2, -3/2]` | `0` | `1/4` | `3/4` | `x≥0` |
| `[-3/2, -1]` | `(9+6t)/8` | `-(1+t)/2` | `(3-2t)/8` | none (interior) |
| `[-1, -1/2]` | `(5+2t)/8` | `0` | `(3-2t)/8` | `y≥0` |
| `[-1/2, 0]` | `1/2` | `0` | `1/2` | `y≥0`, `2y+z≥1/2` |
| `[0, 9/5]` | `(9+t)/18` | `t/18` | `(9-2t)/18` | `2y+z≥1/2` |
| `[9/5, 4]` | `3/5` | `1/10` | `3/10` | `x≤3/5`, `2y+z≥1/2` |

All six formulas satisfy `x+y+z=1` identically in `t` (verified
symbolically), and all lie in the box `[0,3/5]×[0,1]×[0,1]`.

### KKT multipliers (sign convention of §5), exact

| `t` range | `ν` | `λ1` | `λ2` | `λ3` | `λ4` | `λ5` |
|---|---|---|---|---|---|---|
| `[-2,-3/2]` | `-21/4` | `-2t-3` | 0 | 0 | 0 | 0 |
| `[-3/2,-1]` | `t-15/4` | 0 | 0 | 0 | 0 | 0 |
| `[-1,-1/2]` | `3t/2-13/4` | 0 | `2t+2` | 0 | 0 | 0 |
| `[-1/2,0]` | `2t-3` | 0 | `-2t` | 0 | 0 | `2t+1` |
| `[0,9/5]` | `11t/6-3` | 0 | 0 | 0 | 0 | `10t/9+1` |
| `[9/5,4]` | `3/10` | 0 | 0 | 0 | `2t-18/5` | `3` |

All non-listed multipliers are `0` on that row; every listed multiplier
is `≥0` throughout its stated range, with equality exactly at the
row's outer endpoint that borders the next/previous piece (e.g.
`λ1=0` at `t=-3/2`, `λ2=0` at `t=-1` and again at `t=0`, `λ5=0` at
`t=-1/2`, `λ4=0` at `t=9/5`) — this is exactly the complementary
zero-crossing that makes the transition continuous (§8). All formulas
were solved exactly and independently with `sympy` and match the
by-hand derivation bit-for-bit; see `verification.md`.

### Optimal value function φ(t) = f_t(x*(t),y*(t),z*(t))

| `t` range | `φ(t)` |
|---|---|
| `[-2,-3/2]` | `29/8` |
| `[-3/2,-1]` | `-3t²/4 - 9t/4 + 31/16` |
| `[-1,-1/2]` | `-t²/4 - 5t/4 + 39/16` |
| `[-1/2,0]` | `5/2 - t` |
| `[0,9/5]` | `-t²/18 - t + 5/2` |
| `[9/5,4]` | `67/25 - 6t/5` |

## 8. Continuity and differentiability of φ, and of the optimizer

**Optimizer continuity.** Direct substitution shows the *point*
`(x*,y*,z*)` agrees at every shared boundary:

```
t=-3/2:  (0,1/4,3/4)   both sides
t=-1  :  (3/8,0,5/8)   both sides
t=-1/2:  (1/2,0,1/2)   both sides
t=0   :  (1/2,0,1/2)   both sides
t=9/5 :  (3/5,1/10,3/10)  both sides
```

so `(x*(t),y*(t),z*(t))` is continuous on `[-2,4]` (confirmed
numerically to `~1e-6` by evaluating at `t=breakpoint±1e-6`, matching
the step size — i.e. Lipschitz, not just continuous; see
`verification.md`).

**Value function is C¹ (not merely continuous), and concave.** Because
`t` enters `f_t` only through the affine term `-2t·x`, for any *fixed*
feasible point `v`, `f_t(v)` is affine in `t` with slope `-2x_v`. Hence
`φ(t) = min_{v∈K} f_t(v)` is the pointwise infimum of a family of affine
functions of `t` — so `φ` is **concave** on `[-2,4]` (matches: every
piece above has second derivative `≤0`: `-3/2, -1/2, 0, -1/9, 0` in
order). By Danskin's / the envelope theorem (applicable here because
the minimizer is unique and depends continuously on `t`, §4), `φ` is
differentiable with `φ'(t) = ∂f_t/∂t|_{opt} = -2x*(t)`. Concavity of `φ`
is then *equivalent* to `x*(t)` being non-decreasing — exactly Lemma §4.
Symbolic differentiation of each row of the `φ(t)` table confirms
`φ'(t)=-2x*(t)` exactly on every piece, and the one-sided derivatives of
adjacent pieces agree at all five interior breakpoints:

```
t=-3/2: φ' = 0 = 0        t=-1: φ' = -3/4 = -3/4     t=-1/2: φ' = -1 = -1
t=0   : φ' = -1 = -1      t=9/5: φ' = -6/5 = -6/5
```

So `φ` is globally `C¹` on `[-2,4]` — a stronger statement than the
problem requires but a strong internal consistency check: it can only
happen because the multiplier that is *about to switch on* is exactly
`0` at each transition (seen in the multiplier table, §7), which is
precisely the standard "no kink unless a multiplier jumps away from
zero" fact for parametric convex QP.

## 9. Why this is the whole story, once more, compactly

1. `g_t` strictly convex ⇒ unique global minimizer for every `t` (§2).
2. Slater holds ⇒ KKT is necessary *and* sufficient here (§2).
3. Every one of the 10 boundary faces of the pentagon `K`, plus its
   interior, was tested against full KKT (§6.1–6.6); the four that
   never satisfy it are proven dead **for every real `t`**, not merely
   outside `[-2,4]` (§6.7) — so nothing exotic can appear even if the
   interval were extended.
4. The six surviving pieces' validity intervals are pairwise disjoint
   except at shared endpoints, and their union is exactly `[-2,4]`
   (§6.8), which is only possible because `x*(t)` is provably
   monotone (§4) — a monotone continuous curve sweeping through a
   convex polygon's boundary cannot skip a face without contradicting
   the KKT sign conditions already excluded in §6.7.
5. Independent numerical cross-checks (dense SLSQP multi-start solves,
   an independent fine grid search, and exact symbolic re-derivation of
   every multiplier) all agree with the closed form to numerical/exact
   precision; see `verification.md` for the executed commands and
   results.
