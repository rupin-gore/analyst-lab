from scipy import stats
import math

# 1. Pre-experiment baseline: 4 full weeks, 7 July to 3 August 2025, real users only
real = users.loc[users['is_internal'] == 0, 'user_id']
e = events[events['user_id'].isin(real)].copy()
e['event_ts_ist'] = pd.to_datetime(e['event_ts_ist'])
w = e[(e['event_ts_ist'] >= '2025-07-07') & (e['event_ts_ist'] < '2025-08-04')]
checkout_users = set(w.loc[w['event_name'] == 'checkout_start', 'user_id'])
paid_users = set(w.loc[w['event_name'] == 'payment_success', 'user_id'])
baseline = len(checkout_users & paid_users) / len(checkout_users)
weekly_checkout_users = len(checkout_users) / 4
baseline, weekly_checkout_users

# %%
# 2. Sample size per arm to detect +2 pp (absolute), alpha 0.05 two-sided, power 0.8
p1, p2 = baseline, baseline + 0.02
p_bar = (p1 + p2) / 2
z_a = stats.norm.ppf(1 - 0.05 / 2)
z_b = stats.norm.ppf(0.80)
n = (z_a * math.sqrt(2 * p_bar * (1 - p_bar)) + z_b * math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2 / (p2 - p1) ** 2
n_per_arm = math.ceil(n)

# %%
# 3. How long would the test need to run?
weeks_needed = math.ceil(2 * n_per_arm / weekly_checkout_users)
print(f"baseline {baseline:.1%}, n per arm {n_per_arm:,}, ~{weekly_checkout_users:.0f} checkout users/week -> {weeks_needed} weeks")
