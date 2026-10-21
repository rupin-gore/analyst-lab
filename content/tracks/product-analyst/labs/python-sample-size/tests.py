import math
import pandas as pd
from scipy import stats

def _expected():
    u = _fresh("users")
    real = set(u.loc[u["is_internal"] == 0, "user_id"])
    e = _fresh("events")
    e = e[e["user_id"].isin(real)].copy()
    e["event_ts_ist"] = pd.to_datetime(e["event_ts_ist"])
    w = e[(e["event_ts_ist"] >= "2025-07-07") & (e["event_ts_ist"] < "2025-08-04")]
    co = set(w.loc[w["event_name"] == "checkout_start", "user_id"])
    pay = set(w.loc[w["event_name"] == "payment_success", "user_id"])
    b = len(co & pay) / len(co)
    p1, p2 = b, b + 0.02
    pb = (p1 + p2) / 2
    za, zb = stats.norm.ppf(0.975), stats.norm.ppf(0.8)
    n = math.ceil((za * math.sqrt(2 * pb * (1 - pb)) + zb * math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2 / (p2 - p1) ** 2)
    weekly = len(co) / 4
    return b, n, weekly, math.ceil(2 * n / weekly)

_B, _N, _W, _WEEKS = _expected()

def test_baseline():
    """Baseline checkout conversion (real users, 7 Jul to 3 Aug)"""
    assert 0 < float(baseline) < 1, "baseline should be a proportion between 0 and 1"
    assert abs(float(baseline) - _B) < 0.0005, f"baseline = {float(baseline):.4f} is off. Real users only; users who started checkout in the window and the share who paid."

def test_weekly_users():
    """Average weekly users reaching checkout"""
    assert abs(float(weekly_checkout_users) - _W) < 0.5, f"weekly_checkout_users = {float(weekly_checkout_users):.1f} is off (distinct checkout users in the 4 weeks / 4)"

def test_sample_size():
    """Sample size per arm for +2 pp, alpha 0.05 two-sided, power 0.8"""
    got = int(n_per_arm)
    assert abs(got - _N) / _N < 0.03, (
        f"n_per_arm = {got:,} is not within 3% of the expected value. The MDE is +2 percentage points "
        "(absolute), not 2% of the baseline; alpha is two-sided.")

def test_duration():
    """Weeks needed for both arms"""
    assert abs(int(weeks_needed) - _WEEKS) <= 1, f"weeks_needed = {int(weeks_needed)}; remember both arms need n_per_arm users"
