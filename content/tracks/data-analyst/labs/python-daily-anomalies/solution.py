# 1. Clean orders and add the IST order date
o = orders.drop_duplicates().copy()
o['order_ts_ist'] = pd.to_datetime(o['order_ts_utc']) + pd.Timedelta(hours=5, minutes=30)
o['order_date'] = o['order_ts_ist'].dt.normalize()

# %%
# 2. Daily delivered net revenue for every day of FY2024-25 (days with no orders = 0)
fy_days = pd.date_range('2024-04-01', '2025-03-31', freq='D')
daily = (o[o['order_status'] == 'Delivered']
         .groupby('order_date')['net_amount_inr'].sum()
         .reindex(fy_days, fill_value=0.0))

# %%
# 3. Compare each day with the median of the previous 28 days
baseline = daily.shift(1).rolling(28).median()
ratio = daily / baseline
flagged = ratio[(ratio > 4) | (ratio < 0.25)]
anomalies = sorted(d.strftime('%Y-%m-%d') for d in flagged.index)
anomalies

# %%
# 4. Data problem: orders where the discount exceeded the gross amount
bug_orders = o[o['net_amount_inr'] < 0]
bug_orders[['order_id', 'order_ts_ist', 'gross_amount_inr', 'discount_inr', 'net_amount_inr', 'order_status']]
