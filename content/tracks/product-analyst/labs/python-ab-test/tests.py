import numpy as np
import pandas as pd
from scipy import stats

def _expected():
    a = _fresh("experiment_assignments")
    u = _fresh("users")
    internal = set(u.loc[u["is_internal"] == 1, "user_id"])
    both = set(a.groupby("user_id")["variant"].nunique().loc[lambda s: s > 1].index)
    a = a[~a["user_id"].isin(internal | both)].copy()
    a["assigned_ts_ist"] = pd.to_datetime(a["assigned_ts_ist"])
    counts = a["variant"].value_counts()
    srm = stats.chisquare([counts["control"], counts["treatment"]]).pvalue
    e = _fresh("events")
    e = e[e["event_name"].isin(["checkout_start", "payment_success"])].copy()
    e["event_ts_ist"] = pd.to_datetime(e["event_ts_ist"])
    m = e.merge(a, on="user_id")
    m = m[(m["event_ts_ist"] >= m["assigned_ts_ist"]) & (m["event_ts_ist"] < "2025-08-29")]
    co = m[m["event_name"] == "checkout_start"].groupby("variant")["user_id"].apply(set)
    pay = m[m["event_name"] == "payment_success"].groupby("variant")["user_id"].apply(set)
    res = {}
    for v in ("control", "treatment"):
        n = len(co[v]); x = len(co[v] & pay[v])
        res[v] = (x, n)
    (xc, nc), (xt, nt) = res["control"], res["treatment"]
    pc, pt = xc / nc, xt / nt
    pp = (xc + xt) / (nc + nt)
    z = (pt - pc) / np.sqrt(pp * (1 - pp) * (1 / nc + 1 / nt))
    se = np.sqrt(pc * (1 - pc) / nc + pt * (1 - pt) / nt)
    return dict(n=len(a), srm=srm, pc=pc, pt=pt, p=2 * (1 - stats.norm.cdf(abs(z))),
                lo=(pt - pc - 1.96 * se) * 100, hi=(pt - pc + 1.96 * se) * 100)

_X = _expected()

def test_clean_assignments():
    """Internal users and users in both variants are removed"""
    assert clean["user_id"].is_unique, "a user appears more than once in clean. Drop users assigned to both variants."
    assert len(clean) == _X["n"], f"clean has {len(clean)} users; expected {_X['n']}. Exclude is_internal = 1 and users seen in both variants."

def test_srm():
    """SRM check: chi-square p-value on the variant counts"""
    assert abs(float(srm_p) - _X["srm"]) < 0.01, f"srm_p = {float(srm_p):.3f} doesn't match. Use stats.chisquare([n_control, n_treatment]) on the clean counts."

def test_rates():
    """Conversion rates among users who reached checkout after assignment"""
    assert abs(float(control_rate) - _X["pc"]) < 0.0005, f"control_rate = {float(control_rate):.4f} is off. Count users (not events) who started checkout between assignment and 2025-08-29, and the share of them who paid."
    assert abs(float(treatment_rate) - _X["pt"]) < 0.0005, f"treatment_rate = {float(treatment_rate):.4f} is off."
    assert 0 < float(control_rate) < 1, "rates should be proportions between 0 and 1"

def test_lift():
    """Lift in percentage points"""
    assert abs(float(lift_pp) - (_X["pt"] - _X["pc"]) * 100) < 0.05, "lift_pp should be (treatment_rate - control_rate) x 100"

def test_p_value():
    """Two-sided two-proportion z-test p-value"""
    assert abs(float(p_value) - _X["p"]) < 0.003, f"p_value = {float(p_value):.4f} doesn't match a two-sided pooled z-test"

def test_ci():
    """95% confidence interval for the difference, in percentage points"""
    assert abs(float(ci_low) - _X["lo"]) < 0.1 and abs(float(ci_high) - _X["hi"]) < 0.1, (
        f"CI [{float(ci_low):.2f}, {float(ci_high):.2f}] is off. Use the unpooled standard error and 1.96, in percentage points.")
