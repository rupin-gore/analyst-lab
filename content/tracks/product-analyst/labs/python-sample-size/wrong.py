from scipy import stats
import math
# Common mistake: relative MDE (2% of baseline) instead of +2 percentage points, and internal users kept
e = events.copy()
e['event_ts_ist'] = pd.to_datetime(e['event_ts_ist'])
w = e[(e['event_ts_ist'] >= '2025-07-07') & (e['event_ts_ist'] < '2025-08-04')]
co = set(w.loc[w['event_name'] == 'checkout_start', 'user_id'])
pay = set(w.loc[w['event_name'] == 'payment_success', 'user_id'])
baseline = len(co & pay) / len(co)
weekly_checkout_users = len(co) / 4
p1, p2 = baseline, baseline * 1.02
pb = (p1 + p2) / 2
n_per_arm = math.ceil((1.96 * math.sqrt(2 * pb * (1 - pb)) + 0.84 * math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2 / (p2 - p1) ** 2)
weeks_needed = math.ceil(n_per_arm / weekly_checkout_users)
