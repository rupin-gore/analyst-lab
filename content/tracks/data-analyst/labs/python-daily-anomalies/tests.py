import pandas as pd

def _expected():
    o = _fresh("orders").drop_duplicates().copy()
    o["d"] = (pd.to_datetime(o["order_ts_utc"]) + pd.Timedelta(hours=5, minutes=30)).dt.normalize()
    days = pd.date_range("2024-04-01", "2025-03-31", freq="D")
    daily = o[o["order_status"] == "Delivered"].groupby("d")["net_amount_inr"].sum().reindex(days, fill_value=0.0)
    ratio = daily / daily.shift(1).rolling(28).median()
    anomalies = sorted(x.strftime("%Y-%m-%d") for x in ratio[(ratio > 4) | (ratio < 0.25)].index)
    return daily, anomalies, o[o["net_amount_inr"] < 0]

_DAILY, _ANOM, _BUG = _expected()

def test_daily_shape():
    """daily has one value for every day of FY2024-25"""
    assert isinstance(daily, pd.Series), "daily should be a pandas Series"
    assert len(daily) == 365, f"daily has {len(daily)} days; FY2024-25 has 365. Reindex to every day and fill missing days with 0."
    idx = pd.to_datetime(daily.index)
    assert idx.min() == pd.Timestamp("2024-04-01") and idx.max() == pd.Timestamp("2025-03-31"), "daily should run from 2024-04-01 to 2025-03-31"

def test_daily_values():
    """Daily revenue uses IST dates and de-duplicated delivered orders"""
    s = pd.Series(daily.values, index=pd.to_datetime(daily.index))
    diff = (s - _DAILY).abs()
    bad = int((diff > 0.01).sum())
    assert bad == 0, f"{bad} days have the wrong revenue (first: {diff[diff > 0.01].index[0].date()}). Check IST conversion and duplicates."

def test_anomalies():
    """The flagged days match the rule (ratio to previous 28-day median > 4 or < 0.25)"""
    got = sorted(str(pd.Timestamp(x).date()) for x in anomalies)
    missing = sorted(set(_ANOM) - set(got))
    extra = sorted(set(got) - set(_ANOM))
    assert not missing and not extra, (
        f"{len(missing)} expected day(s) missing and {len(extra)} unexpected day(s) flagged. "
        "The baseline must exclude the day itself: daily.shift(1).rolling(28).median().")

def test_bug_orders():
    """bug_orders lists each negative-net order once"""
    assert isinstance(bug_orders, pd.DataFrame), "bug_orders should be a DataFrame"
    assert bug_orders["order_id"].is_unique, "some orders appear twice. De-duplicate first."
    assert len(bug_orders) == len(_BUG), f"bug_orders has {len(bug_orders)} rows; expected {len(_BUG)}"
