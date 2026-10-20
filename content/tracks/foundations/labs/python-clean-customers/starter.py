# Explore first
customers.head()
# %%
customers['city'].value_counts(dropna=False).head(15)
# %%
clean = customers.copy()
# your cleaning steps here

clean.head()
