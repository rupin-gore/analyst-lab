"""Shared helpers for the seeded dataset generators.

Only the Python standard library is used so the scripts run anywhere with
`python data-gen/generate_all.py` and always produce byte-identical output.
"""
from __future__ import annotations

import csv
import json
import random
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "datasets"

# Diwali (Lakshmi Puja) dates for the years we generate. Fictional data, real calendar.
DIWALI = {2023: date(2023, 11, 12), 2024: date(2024, 11, 1), 2025: date(2025, 10, 21)}

IST = timedelta(hours=5, minutes=30)

# (city, state, weight, tier)
CITIES = [
    ("Mumbai", "Maharashtra", 14, 1),
    ("Delhi", "Delhi", 13, 1),
    ("Bengaluru", "Karnataka", 12, 1),
    ("Hyderabad", "Telangana", 9, 1),
    ("Chennai", "Tamil Nadu", 8, 1),
    ("Pune", "Maharashtra", 7, 1),
    ("Kolkata", "West Bengal", 7, 1),
    ("Ahmedabad", "Gujarat", 5, 2),
    ("Jaipur", "Rajasthan", 4, 2),
    ("Lucknow", "Uttar Pradesh", 4, 2),
    ("Kochi", "Kerala", 3, 2),
    ("Indore", "Madhya Pradesh", 3, 2),
    ("Chandigarh", "Chandigarh", 2, 2),
    ("Bhubaneswar", "Odisha", 2, 2),
    ("Guwahati", "Assam", 2, 2),
    ("Nagpur", "Maharashtra", 2, 2),
    ("Surat", "Gujarat", 2, 2),
    ("Coimbatore", "Tamil Nadu", 2, 2),
    ("Patna", "Bihar", 2, 2),
    ("Visakhapatnam", "Andhra Pradesh", 2, 2),
]

FIRST = ["Aarav", "Vihaan", "Aditya", "Arjun", "Sai", "Reyansh", "Ishaan", "Kabir", "Rohan", "Karthik",
         "Ananya", "Diya", "Saanvi", "Aadhya", "Kavya", "Priya", "Meera", "Isha", "Nisha", "Pooja",
         "Rahul", "Vikram", "Siddharth", "Nikhil", "Harsh", "Neha", "Sneha", "Riya", "Tanvi", "Shreya",
         "Farhan", "Zoya", "Imran", "Ayesha", "Gurpreet", "Harleen", "Joseph", "Maria", "Anil", "Lakshmi"]
LAST = ["Sharma", "Verma", "Iyer", "Reddy", "Nair", "Patel", "Shah", "Gupta", "Mehta", "Rao",
        "Das", "Banerjee", "Mukherjee", "Kulkarni", "Joshi", "Pillai", "Menon", "Singh", "Kaur", "Khan",
        "Fernandes", "D'Souza", "Agarwal", "Chatterjee", "Bhat", "Naidu", "Mishra", "Pandey", "Yadav", "Gill"]


def rng(seed: int) -> random.Random:
    return random.Random(seed)


def weighted(r: random.Random, items, weights):
    return r.choices(items, weights=weights, k=1)[0]


def daterange(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


def write_csv(dataset: str, table: str, header: list[str], rows: list[list]) -> None:
    folder = OUT / dataset
    folder.mkdir(parents=True, exist_ok=True)
    with open(folder / f"{table}.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(header)
        for row in rows:
            w.writerow(["" if v is None else v for v in row])


def write_manifest(dataset: str, manifest: dict) -> None:
    folder = OUT / dataset
    folder.mkdir(parents=True, exist_ok=True)
    with open(folder / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write("\n")


def fmt_ts(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d %H:%M:%S")
