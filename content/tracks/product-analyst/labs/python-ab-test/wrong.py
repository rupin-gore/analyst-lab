from scipy import stats
# Common mistake: analyse the raw assignment log (internal users and double-bucketed users included)
clean = experiment_assignments.drop_duplicates('user_id').copy()
clean['assigned_ts_ist'] = pd.to_datetime(clean['assigned_ts_ist'])
counts = clean['variant'].value_counts()
srm_p = stats.chisquare([counts['control'], counts['treatment']]).pvalue
ev = events[events['event_name'].isin(['checkout_start', 'payment_success'])].copy()
ev['event_ts_ist'] = pd.to_datetime(ev['event_ts_ist'])
m = ev.merge(clean, on='user_id')
m = m[(m['event_ts_ist'] >= m['assigned_ts_ist']) & (m['event_ts_ist'] < '2025-08-29')]
g = m.groupby(['variant', 'user_id'])['event_name'].agg(lambda s: set(s)).reset_index()
g = g[g['event_name'].apply(lambda s: 'checkout_start' in s)]
g['paid'] = g['event_name'].apply(lambda s: 'payment_success' in s)
r = g.groupby('variant')['paid'].agg(['mean', 'count', 'sum'])
control_rate, treatment_rate = r.loc['control', 'mean'], r.loc['treatment', 'mean']
lift_pp = (treatment_rate - control_rate) * 100
p_value = stats.chi2_contingency([[r.loc['control', 'sum'], r.loc['control', 'count'] - r.loc['control', 'sum']],
                                  [r.loc['treatment', 'sum'], r.loc['treatment', 'count'] - r.loc['treatment', 'sum']]])[1]
ci_low, ci_high = lift_pp - 4, lift_pp + 4
