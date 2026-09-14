Solve this parametric constrained optimization problem completely, for every real t in [-2,4]:

Minimize f_t(x,y,z) = x^2 + 2y^2 + 3z^2 + xy - yz + (2-2t)x + 5y + z
subject to x+y+z=1, x>=0, y>=0, z>=0, x<=3/5, and 2y+z>=1/2.

Deliver:
1. solution.md: a rigorous self-contained solution with the exact piecewise unique optimizer, all exact transition values and active sets, the exact optimal value function, and a proof of global optimality/uniqueness for the complete closed parameter interval. Give KKT multipliers with an explicit sign convention and address all regime boundaries, including zero multipliers and continuity/differentiability of the value. Explain why no parameter range or feasible competing face was missed. Numerical optimization alone is not a proof.
2. solution.py, Python standard library only: expose solve(t), accepting an int or float in the stated interval and returning a dictionary with finite numeric x, y, z and value (additional fields allowed). It must agree with your formulas on interior points, boundaries and arbitrarily close points on either side. Importing the module must not run a CLI, print output or read external files.
3. verification.md: record the checks you actually executed and any limitations. Include reproducible commands or a small verification script. Work independently and complete within the run deadline.

You may use the provided local Python/Node tools to reason, implement and validate. Do not access the internet, external files or hidden evaluation material. Derive the answer yourself. Tests will compare feasibility, optimizer and objective against an independently constructed exact geometric oracle; the proof will be reviewed separately. Sample points are checks of this one problem, not separate benchmark questions.
