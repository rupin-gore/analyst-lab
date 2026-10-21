# 1. Clean: de-duplicate, delivered only, IST, up to 31 March 2025
o = orders.drop_duplicates()
o = o[o['order_status'] == 'Delivered'].copy()
o['order_ts_ist'] = pd.to_datetime(o['order_ts_utc']) + pd.Timedelta(hours=5, minutes=30)
o = o[o['order_ts_ist'] < '2025-04-01']
snapshot = pd.Timestamp('2025-04-01')

# %%
# 2. Recency, frequency, monetary per customer (groupby sorts by customer_id)
rfm = o.groupby('customer_id').agg(
    last_order=('order_ts_ist', 'max'),
    frequency=('order_id', 'count'),
    monetary=('net_amount_inr', 'sum'),
)
rfm['recency_days'] = (snapshot - rfm['last_order'].dt.normalize()).dt.days
rfm = rfm.drop(columns='last_order')

# %%
# 3. Quintile scores; rank(method='first') breaks ties so qcut gets 5 equal bins
rfm['R'] = pd.qcut(rfm['recency_days'].rank(method='first'), 5, labels=[5, 4, 3, 2, 1]).astype(int)
rfm['F'] = pd.qcut(rfm['frequency'].rank(method='first'), 5, labels=[1, 2, 3, 4, 5]).astype(int)
rfm['M'] = pd.qcut(rfm['monetary'].rank(method='first'), 5, labels=[1, 2, 3, 4, 5]).astype(int)

# %%
# 4. Segments: first matching rule wins
def segment(row):
    if row.R >= 4 and row.F >= 4:
        return 'Champions'
    if row.F >= 4:
        return 'Loyal'
    if row.R >= 4 and row.F <= 2:
        return 'New'
    if row.R <= 2 and row.F >= 3:
        return 'At risk'
    if row.R <= 2:
        return 'Hibernating'
    return 'Needs attention'

rfm['segment'] = rfm.apply(segment, axis=1)
rfm.groupby('segment').agg(customers=('monetary', 'size'), revenue=('monetary', 'sum')).sort_values('revenue', ascending=False)
