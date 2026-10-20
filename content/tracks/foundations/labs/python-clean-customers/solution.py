clean = customers.copy()

# 1. Normalise email so duplicates can be matched
clean['email'] = clean['email'].str.strip().str.lower()

# 2. Keep the earliest signup per email
clean = (clean.sort_values(['signup_date', 'customer_id'])
              .drop_duplicates('email', keep='first'))

# 3. Standardise city names; NaN stays NaN because .str methods skip it
clean['city'] = (clean['city'].str.strip().str.title()
                              .replace({'Bangalore': 'Bengaluru', 'Bombay': 'Mumbai'}))

# 4. Hyderabad is in Telangana (state formed in 2014)
clean.loc[clean['city'] == 'Hyderabad', 'state'] = 'Telangana'

# 5. Tidy order and index
clean = clean.sort_values('customer_id').reset_index(drop=True)
clean.head()
