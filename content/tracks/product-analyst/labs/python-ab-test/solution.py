from scipy import stats

# 1. Clean the assignment log: drop internal users and users bucketed into both variants
a = experiment_assignments.merge(users[['user_id', 'is_internal']], on='user_id')
n_variants = a.groupby('user_id')['variant'].nunique()
both = n_variants[n_variants > 1].index
clean = a[(a['is_internal'] == 0) & (~a['user_id'].isin(both))].copy()
clean['assigned_ts_ist'] = pd.to_datetime(clean['assigned_ts_ist'])
print(f"Dropped {len(both)} users in both variants; {clean.user_id.nunique()} users remain")

# %%
# 2. Sample ratio mismatch check: were users split ~50/50?
counts = clean['variant'].value_counts()
srm_p = stats.chisquare([counts['control'], counts['treatment']]).pvalue
counts, srm_p

# %%
# 3. Checkout events after assignment, until the end of the test (28 Aug inclusive)
ev = events[events['event_name'].isin(['checkout_start', 'payment_success'])].copy()
ev['event_ts_ist'] = pd.to_datetime(ev['event_ts_ist'])
m = ev.merge(clean[['user_id', 'variant', 'assigned_ts_ist']], on='user_id')
m = m[(m['event_ts_ist'] >= m['assigned_ts_ist']) & (m['event_ts_ist'] < '2025-08-29')]

per_user = (m.assign(one=1)
             .pivot_table(index=['user_id', 'variant'], columns='event_name', values='one', aggfunc='sum', fill_value=0)
             .reset_index())
reached = per_user[per_user['checkout_start'] > 0]
summary = reached.groupby('variant').agg(users=('user_id', 'count'),
                                         converted=('payment_success', lambda s: int((s > 0).sum())))
summary

# %%
# 4. Rates, lift, two-proportion z-test and 95% confidence interval
c, t = summary.loc['control'], summary.loc['treatment']
control_rate = c.converted / c.users
treatment_rate = t.converted / t.users
diff = treatment_rate - control_rate
lift_pp = diff * 100

p_pool = (c.converted + t.converted) / (c.users + t.users)
se_pool = np.sqrt(p_pool * (1 - p_pool) * (1 / c.users + 1 / t.users))
z = diff / se_pool
p_value = 2 * (1 - stats.norm.cdf(abs(z)))

se = np.sqrt(control_rate * (1 - control_rate) / c.users + treatment_rate * (1 - treatment_rate) / t.users)
ci_low, ci_high = (diff - 1.96 * se) * 100, (diff + 1.96 * se) * 100
print(f"control {control_rate:.1%}  treatment {treatment_rate:.1%}  lift {lift_pp:+.1f} pp  "
      f"p = {p_value:.3f}  95% CI [{ci_low:.1f}, {ci_high:.1f}] pp")
