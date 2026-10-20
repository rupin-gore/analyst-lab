clean = customers.drop_duplicates('email')
clean['city'] = clean['city'].astype(str).str.strip().str.title()
clean = clean.reset_index(drop=True)
