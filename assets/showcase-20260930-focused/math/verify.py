"""Reproducible exact certificate checks; Python standard library only.
Run: python3 verify.py
The geometric numerical oracle is a separate, previously frozen instrument.
"""
from fractions import Fraction as F
import json
from solution import solve


def p(*values):
    return tuple(F(v) for v in values)


def add(*polys):
    size = max(map(len, polys))
    out = [sum(poly[i] if i < len(poly) else 0 for poly in polys) for i in range(size)]
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return tuple(out)


def scale(poly, scalar):
    return tuple(F(scalar)*a for a in poly)


def mul(a, b):
    out = [F(0)] * (len(a)+len(b)-1)
    for i, ai in enumerate(a):
        for j, bj in enumerate(b):
            out[i+j] += ai*bj
    return add(tuple(out))


def at(poly, t):
    return sum(a*t**i for i, a in enumerate(poly))


Z = p(0)
rows = [
    (p(-2, '-3/2'), p(0), p('1/4'), p('3/4'), p('29/8'), p('-21/4'), [p(-3,-2),Z,Z,Z,Z]),
    (p('-3/2',-1), p('9/8','3/4'), p('-1/2','-1/2'), p('3/8','-1/4'), p('31/16','-9/4','-3/4'), p('-15/4',1), [Z,Z,Z,Z,Z]),
    (p(-1,'-1/2'), p('5/8','1/4'), Z, p('3/8','-1/4'), p('39/16','-5/4','-1/4'), p('-13/4','3/2'), [Z,p(2,2),Z,Z,Z]),
    (p('-1/2',0), p('1/2'), Z, p('1/2'), p('5/2',-1), p(-3,2), [Z,p(0,-2),Z,Z,p(1,2)]),
    (p(0,'9/5'), p('1/2','1/18'), p(0,'1/18'), p('1/2','-1/9'), p('5/2',-1,'-1/18'), p(-3,'11/6'), [Z,Z,Z,Z,p(1,'10/9')]),
    (p('9/5',4), p('3/5'), p('1/10'), p('3/10'), p('67/25','-6/5'), p('3/10'), [Z,Z,Z,p('-18/5',2),p(3)]),
]


def verify():
    checked = 0
    numerical = 0
    def check(value, approximate=False):
        nonlocal checked, numerical
        assert value
        checked += 1
        numerical += int(approximate)
    check(8 > 0 and 8*12-8*8 == 32)
    for interval,x,y,z,value,nu,l in rows:
        check(add(x,y,z,p(-1)) == Z)
        h = [scale(x,-1),scale(y,-1),scale(z,-1),add(x,p('-3/5')),add(p('1/2'),scale(y,-2),scale(z,-1))]
        for constraint, multiplier in zip(h,l):
            check(all(at(constraint,t)<=0 for t in interval))
            check(all(at(multiplier,t)>=0 for t in interval))
            check(mul(constraint,multiplier)==Z)
        check(add(scale(x,2),y,p(2,-2),nu,scale(l[0],-1),l[3])==Z)
        check(add(x,scale(y,4),scale(z,-1),p(5),nu,scale(l[1],-1),scale(l[4],-2))==Z)
        check(add(scale(z,6),scale(y,-1),p(1),nu,scale(l[2],-1),scale(l[4],-1))==Z)
        objective=add(mul(x,x),scale(mul(y,y),2),scale(mul(z,z),3),mul(x,y),scale(mul(y,z),-1),mul(p(2,-2),x),scale(y,5),z)
        check(objective == value)
        derivative=tuple(i*a for i,a in enumerate(value) if i) or Z
        check(add(derivative,scale(x,2))==Z)
        for t in [interval[0],sum(interval)/2,interval[1]]:
            actual=solve(float(t))
            for key,poly in [('x',x),('y',y),('z',z),('value',value)]:
                check(abs(actual[key]-float(at(poly,t)))<1e-12, approximate=True)
    for left,right in zip(rows,rows[1:]):
        t=left[0][1]
        check(t==right[0][0])
        for a,b in zip(left[1:6],right[1:6]):
            check(at(a,t)==at(b,t))
        for a,b in zip(left[6],right[6]):
            check(at(a,t)==at(b,t))
    return {'passed':True,'total_assertions':checked,'exact_assertions':checked-numerical,'solver_spot_assertions':numerical,'regimes':6,'joins':5,'arithmetic':'fractions.Fraction','scope':'Exact polynomial KKT identities, affine feasibility and multiplier signs on closed intervals, objective formulas, endpoint agreement, value derivatives, and executable solver spot checks.'}


if __name__ == '__main__':
    print(json.dumps(verify(),indent=2))
