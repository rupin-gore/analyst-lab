# 1. Clean the orders: de-duplicate, Delivered only, IST timestamps, up to 31 March 2025
o = orders.drop_duplicates()
# ...

snapshot = pd.Timestamp('2025-04-01')

# %%
# 2. Build rfm: one row per customer_id with recency_days, frequency, monetary
rfm = None

# %%
# 3. Scores R, F, M (1-5) with pd.qcut on .rank(method='first')

# %%
# 4. segment column using the rules in the task
