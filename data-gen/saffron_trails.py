"""Saffron Trails Distributors: a small FMCG distributor's sales register for one month.

Small on purpose: it is loaded into the in-browser spreadsheet workspace.
"""
from __future__ import annotations

from datetime import date, timedelta

from common import rng, write_csv, write_manifest

DATASET = "saffron_trails"
SEED = 7

REPS = {"North": ["Gurpreet", "Ankit"], "South": ["Lakshmi", "Karthik"], "East": ["Sourav", "Moumita"],
        "West": ["Neha", "Farhan"]}
PRODUCTS = {"Basmati Rice 5kg": 649, "Toor Dal 1kg": 168, "Sunflower Oil 1L": 155, "Masala Chai 500g": 240,
            "Atta 10kg": 465, "Ghee 1L": 699}


def generate():
    r = rng(SEED)
    rows = []
    for i in range(36):
        region = r.choice(list(REPS))
        product = r.choice(list(PRODUCTS))
        d = date(2024, 10, 1) + timedelta(days=r.randint(0, 30))
        rows.append([f"INV-{2401 + i}", d.isoformat(), region, r.choice(REPS[region]), product,
                     r.randint(5, 80), PRODUCTS[product]])
    rows.sort(key=lambda x: (x[1], x[0]))
    write_csv(DATASET, "sales", ["invoice", "date", "region", "rep", "product", "units", "unit_price"], rows)
    write_manifest(DATASET, {
        "id": DATASET,
        "title": "Saffron Trails sales register",
        "description": "October 2024 invoices of Saffron Trails Distributors, a fictional FMCG distributor.",
        "tables": {
            "sales": {
                "file": "sales.csv",
                "rows": len(rows),
                "columns": [
                    {"name": "invoice", "type": "VARCHAR", "description": "Invoice number"},
                    {"name": "date", "type": "DATE", "description": "Invoice date"},
                    {"name": "region", "type": "VARCHAR", "description": "Sales region"},
                    {"name": "rep", "type": "VARCHAR", "description": "Sales representative"},
                    {"name": "product", "type": "VARCHAR", "description": "SKU name"},
                    {"name": "units", "type": "INTEGER", "description": "Units sold"},
                    {"name": "unit_price", "type": "DOUBLE", "description": "Price per unit in INR (excl. GST)"},
                ],
            }
        },
    })
    return len(rows)


if __name__ == "__main__":
    print("saffron_trails", generate())
