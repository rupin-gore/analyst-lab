# Common mistake: UTC dates, duplicates kept, missing days dropped, baseline includes the day itself
o = orders.copy()
o['order_date'] = pd.to_datetime(o['order_ts_utc']).dt.normalize()
d = o[(o['order_status'] == 'Delivered') & (o['order_date'] >= '2024-04-01') & (o['order_date'] <= '2025-03-31')]
daily = d.groupby('order_date')['net_amount_inr'].sum()
ratio = daily / daily.rolling(28).median()
anomalies = sorted(x.strftime('%Y-%m-%d') for x in ratio[(ratio > 4) | (ratio < 0.25)].index)
bug_orders = orders[orders['net_amount_inr'] < 0]
