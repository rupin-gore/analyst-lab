import pandas as pd

CITIES = {"Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad", "Jaipur",
          "Lucknow", "Kochi", "Indore", "Chandigarh", "Bhubaneswar", "Guwahati", "Nagpur", "Surat", "Coimbatore",
          "Patna", "Visakhapatnam"}

def _expected():
    raw = _fresh("customers")
    raw["email"] = raw["email"].str.strip().str.lower()
    raw = raw.sort_values(["signup_date", "customer_id"]).drop_duplicates("email", keep="first")
    return raw.sort_values("customer_id").reset_index(drop=True)

def test_shape():
    """clean is a DataFrame with the same columns as customers"""
    assert isinstance(clean, pd.DataFrame), "clean should be a pandas DataFrame"
    missing = set(_fresh("customers").columns) - set(clean.columns)
    assert not missing, f"clean is missing columns: {sorted(missing)}"

def test_no_duplicate_emails():
    """One row per email (ignoring case)"""
    d = clean["email"].str.strip().str.lower().duplicated().sum()
    assert d == 0, f"{d} emails still appear more than once once case is ignored"

def test_kept_earliest():
    """For duplicates, the earliest signup is kept"""
    exp = _expected()
    assert len(clean) == len(exp), f"clean has {len(clean)} rows; expected {len(exp)}"
    wrong = set(exp["customer_id"]) - set(clean["customer_id"])
    assert not wrong, f"{len(wrong)} kept rows are not the earliest signup for that email (e.g. {sorted(wrong)[0]})"

def test_email_lowercase():
    """Emails are trimmed and lower-case"""
    bad = (clean["email"] != clean["email"].str.strip().str.lower()).sum()
    assert bad == 0, f"{bad} emails are not trimmed and lower-case"

def test_city_names():
    """City names are standardised"""
    cities = set(clean["city"].dropna())
    odd = sorted(cities - CITIES)
    assert not odd, f"unexpected city values: {odd[:5]}"

def test_nulls_preserved():
    """Missing cities stay missing (not the text 'nan')"""
    text_nan = clean["city"].astype("string").str.strip().str.lower().isin(["nan", "none", "<na>"]).sum()
    assert text_nan == 0, f"{text_nan} cities are the text 'nan' or 'None'. Did astype(str) turn missing values into text?"
    exp = _expected()
    got, want = clean["city"].isna().sum(), exp["city"].isna().sum()
    assert got == want, f"clean has {got} missing cities; expected {want}"

def test_hyderabad_state():
    """Hyderabad customers are in Telangana"""
    hyd = clean[clean["city"] == "Hyderabad"]
    bad = (hyd["state"] != "Telangana").sum()
    assert len(hyd) > 0, "no Hyderabad rows found; check your city cleaning"
    assert bad == 0, f"{bad} Hyderabad customers do not have state Telangana"

def test_sorted_index():
    """Sorted by customer_id with a fresh index"""
    assert list(clean["customer_id"]) == sorted(clean["customer_id"]), "rows are not sorted by customer_id"
    assert list(clean.index) == list(range(len(clean))), "reset the index (reset_index(drop=True))"
