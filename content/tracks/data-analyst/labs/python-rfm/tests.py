import pandas as pd

def _expected():
    o = _fresh("orders").drop_duplicates()
    o = o[o["order_status"] == "Delivered"].copy()
    o["ts"] = pd.to_datetime(o["order_ts_utc"]) + pd.Timedelta(hours=5, minutes=30)
    o = o[o["ts"] < "2025-04-01"]
    e = o.groupby("customer_id").agg(last=("ts", "max"), frequency=("order_id", "count"), monetary=("net_amount_inr", "sum"))
    e["recency_days"] = (pd.Timestamp("2025-04-01") - e["last"].dt.normalize()).dt.days
    e["R"] = pd.qcut(e["recency_days"].rank(method="first"), 5, labels=[5, 4, 3, 2, 1]).astype(int)
    e["F"] = pd.qcut(e["frequency"].rank(method="first"), 5, labels=[1, 2, 3, 4, 5]).astype(int)
    e["M"] = pd.qcut(e["monetary"].rank(method="first"), 5, labels=[1, 2, 3, 4, 5]).astype(int)
    def seg(r):
        if r.R >= 4 and r.F >= 4: return "Champions"
        if r.F >= 4: return "Loyal"
        if r.R >= 4 and r.F <= 2: return "New"
        if r.R <= 2 and r.F >= 3: return "At risk"
        if r.R <= 2: return "Hibernating"
        return "Needs attention"
    e["segment"] = e.apply(seg, axis=1)
    return e

_E = _expected()

def _rfm():
    df = rfm
    if "customer_id" in df.columns:
        df = df.set_index("customer_id")
    return df

def test_structure():
    """rfm has one row per customer and the required columns"""
    assert isinstance(rfm, pd.DataFrame), "rfm should be a DataFrame"
    missing = {"recency_days", "frequency", "monetary", "R", "F", "M", "segment"} - set(rfm.columns)
    assert not missing, f"rfm is missing columns: {sorted(missing)}"
    df = _rfm()
    assert df.index.is_unique, "each customer_id should appear once"

def test_customers():
    """The right set of customers (delivered orders up to 31 March 2025, IST)"""
    df = _rfm()
    assert len(df) == len(_E), f"rfm has {len(df)} customers; expected {len(_E)}. Check status filter and the IST date cut-off."

def test_frequency_monetary():
    """Frequency and monetary values are right (duplicates removed)"""
    df = _rfm().reindex(_E.index)
    bad_f = (df["frequency"] != _E["frequency"]).sum()
    assert bad_f == 0, f"{bad_f} customers have the wrong frequency. Did you remove duplicate order rows?"
    bad_m = ((df["monetary"] - _E["monetary"]).abs() > 0.01).sum()
    assert bad_m == 0, f"{bad_m} customers have the wrong monetary value"

def test_recency():
    """Recency is days from the last IST order date to 2025-04-01"""
    df = _rfm().reindex(_E.index)
    bad = (df["recency_days"] != _E["recency_days"]).sum()
    assert bad == 0, f"{bad} customers have the wrong recency_days. Convert to IST and use whole dates."

def test_scores():
    """R, F and M scores follow the quintile rules"""
    df = _rfm().reindex(_E.index)
    for col in ["R", "F", "M"]:
        bad = (df[col].astype(int) != _E[col]).sum()
        assert bad == 0, f"{bad} customers have the wrong {col} score. Use pd.qcut on .rank(method='first'); for R, a lower recency is a higher score."

def test_segments():
    """Segments follow the rules in order"""
    df = _rfm().reindex(_E.index)
    bad = (df["segment"] != _E["segment"]).sum()
    assert bad == 0, f"{bad} customers are in the wrong segment. Apply the rules top to bottom; the first match wins."
