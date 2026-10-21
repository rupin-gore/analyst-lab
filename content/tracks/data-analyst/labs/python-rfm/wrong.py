# Common mistake: no de-duplication and no IST conversion; qcut on raw values
o = orders[orders['order_status'] == 'Delivered'].copy()
o['ts'] = pd.to_datetime(o['order_ts_utc'])
o = o[o['ts'] < '2025-04-01']
rfm = o.groupby('customer_id').agg(last=('ts', 'max'), frequency=('order_id', 'count'), monetary=('net_amount_inr', 'sum'))
rfm['recency_days'] = (pd.Timestamp('2025-04-01') - rfm['last'].dt.normalize()).dt.days
rfm = rfm.drop(columns='last')
rfm['R'] = pd.qcut(rfm['recency_days'], 5, labels=[5, 4, 3, 2, 1], duplicates='drop').astype(int)
rfm['F'] = pd.qcut(rfm['frequency'].rank(method='first'), 5, labels=[1, 2, 3, 4, 5]).astype(int)
rfm['M'] = pd.qcut(rfm['monetary'], 5, labels=[1, 2, 3, 4, 5]).astype(int)
rfm['segment'] = 'Needs attention'
