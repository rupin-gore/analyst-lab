"""Bazaarly seller onboarding: applications from sellers who want to list on the marketplace,
January to June 2025, plus a small product backlog for prioritisation.

Planted problems (do NOT show these in the UI):
  * KYC verification turnaround grows from ~4 days (Jan-Mar) to ~8 days (Apr-Jun): a backlog
  * "Duplicate application" rejections are the same seller applying twice; they are not real demand
  * In-progress and withdrawn applications have NULL downstream dates
  * Most rejections come from a few fixable-at-upload reasons (blurry documents, bank name mismatch)
"""
from __future__ import annotations

import math
from datetime import date, timedelta

from common import rng, weighted, write_csv, write_manifest

DATASET = "seller_onboarding"
SEED = 2025_01_01
START = date(2025, 1, 1)
END = date(2025, 6, 30)
AS_OF = date(2025, 7, 10)

STATES = [("Maharashtra", 18), ("Gujarat", 14), ("Uttar Pradesh", 12), ("Tamil Nadu", 10), ("Karnataka", 10),
          ("Delhi", 9), ("Rajasthan", 8), ("West Bengal", 7), ("Telangana", 6), ("Punjab", 6)]
CATEGORIES = [("Fashion", 30), ("Home & Kitchen", 20), ("Beauty", 14), ("Electronics", 12), ("Grocery", 12),
              ("Books", 7), ("Toys", 5)]
REASONS = [("Blurry or unreadable document", 34), ("Bank account name mismatch", 22), ("GSTIN mismatch", 18),
           ("Incomplete address", 12), ("Restricted category", 8), ("Duplicate application", 6)]


def lognorm_days(r, median, sigma=0.5):
    return max(0, round(math.exp(r.gauss(math.log(median), sigma))))


def generate():
    r = rng(SEED)
    rows = []
    days = (END - START).days
    for i in range(1, 1801):
        applied = START + timedelta(days=int(days * (r.random() ** 0.85)))
        channel = weighted(r, ["Web", "App", "Assisted"], [55, 30, 15])
        seller_type = weighted(r, ["Individual", "Proprietorship", "Private Limited"], [45, 40, 15])
        category = weighted(r, [c for c, _ in CATEGORIES], [w for _, w in CATEGORIES])
        gstin = "N" if (category == "Books" or (seller_type == "Individual" and r.random() < 0.35)) else "Y"
        state = weighted(r, [s for s, _ in STATES], [w for _, w in STATES])
        docs = kyc = live = rejected = None
        reason = None
        resubmissions = 0
        status = "In progress"

        if r.random() < 0.08:
            status = "Withdrawn"
        else:
            docs = applied + timedelta(days=lognorm_days(r, 3 if channel == "Web" else 2 if channel == "App" else 1))
            # KYC backlog builds from April
            kyc_median = 4 if applied.month <= 3 else 8
            reject_p = 0.30 if channel != "Assisted" else 0.15
            if r.random() < reject_p:
                reason = weighted(r, [x for x, _ in REASONS], [w for _, w in REASONS])
                resubmissions = r.choice([0, 0, 1, 2]) if reason not in ("Restricted category", "Duplicate application") else 0
                rejected = docs + timedelta(days=lognorm_days(r, kyc_median) + resubmissions * 3)
                status = "Rejected"
            else:
                resubmissions = 1 if r.random() < 0.15 else 0
                kyc = docs + timedelta(days=lognorm_days(r, kyc_median) + resubmissions * 3)
                live = kyc + timedelta(days=lognorm_days(r, 3))
                status = "Live"
        # Anything that would complete after the extract date is still in progress.
        if live and live > AS_OF:
            live = None
            status = "In progress"
        if kyc and kyc > AS_OF:
            kyc = None
            status = "In progress"
        if rejected and rejected > AS_OF:
            rejected = None
            reason = None
            status = "In progress"
        if docs and docs > AS_OF:
            docs = None
        rows.append([None, applied, channel, seller_type, state, category, gstin, status,
                     docs, kyc, live, rejected, reason, resubmissions])

    rows.sort(key=lambda x: x[1])
    for i, row in enumerate(rows):
        row[0] = f"SA{20001 + i}"
        for j in (1, 8, 9, 10, 11):
            row[j] = row[j].isoformat() if row[j] else None

    write_csv(DATASET, "applications",
              ["application_id", "applied_date", "channel", "seller_type", "state", "category", "gstin_provided",
               "status", "docs_submitted_date", "kyc_approved_date", "live_date", "rejected_date",
               "rejection_reason", "resubmissions"], rows)

    backlog = [
        ["B1", "Auto-check document clarity at upload", 1500, 2, 0.8, 3],
        ["B2", "Penny-drop bank account verification", 1200, 2, 1.0, 2],
        ["B3", "GSTIN auto-fetch from GST portal", 900, 1, 0.8, 4],
        ["B4", "Hindi and Tamil onboarding screens", 2500, 0.5, 0.5, 6],
        ["B5", "WhatsApp status updates for sellers", 3000, 0.5, 0.8, 2],
        ["B6", "Bulk catalogue upload via Excel", 600, 3, 0.8, 8],
        ["B7", "Pincode-based address autofill", 1400, 1, 1.0, 1],
        ["B8", "Assisted onboarding call-back", 400, 2, 0.5, 5],
    ]
    write_csv(DATASET, "backlog", ["id", "feature", "reach_per_quarter", "impact", "confidence", "effort_weeks"], backlog)

    write_manifest(DATASET, {
        "id": DATASET,
        "title": "Bazaarly seller onboarding",
        "description": "Seller applications to list on Bazaarly (January to June 2025, extracted 10 July 2025) "
                       "and the onboarding team's product backlog.",
        "tables": {
            "applications": {"file": "applications.csv", "rows": len(rows), "columns": [
                {"name": "application_id", "type": "VARCHAR", "description": "Application key"},
                {"name": "applied_date", "type": "DATE", "description": "Date the seller started the application"},
                {"name": "channel", "type": "VARCHAR", "description": "Web, App or Assisted (field agent)"},
                {"name": "seller_type", "type": "VARCHAR", "description": "Individual, Proprietorship or Private Limited"},
                {"name": "state", "type": "VARCHAR", "description": "Seller's registered state"},
                {"name": "category", "type": "VARCHAR", "description": "Main product category"},
                {"name": "gstin_provided", "type": "VARCHAR", "description": "Y if a GSTIN was provided"},
                {"name": "status", "type": "VARCHAR", "description": "Live, Rejected, In progress or Withdrawn"},
                {"name": "docs_submitted_date", "type": "DATE", "description": "All KYC documents uploaded"},
                {"name": "kyc_approved_date", "type": "DATE", "description": "KYC approved by the verification team"},
                {"name": "live_date", "type": "DATE", "description": "First listing went live"},
                {"name": "rejected_date", "type": "DATE", "description": "Application rejected"},
                {"name": "rejection_reason", "type": "VARCHAR", "description": "Why it was rejected"},
                {"name": "resubmissions", "type": "INTEGER", "description": "Times documents were re-uploaded"},
            ]},
            "backlog": {"file": "backlog.csv", "rows": len(backlog), "columns": [
                {"name": "id", "type": "VARCHAR", "description": "Backlog item"},
                {"name": "feature", "type": "VARCHAR", "description": "Proposed feature"},
                {"name": "reach_per_quarter", "type": "INTEGER", "description": "Sellers affected per quarter"},
                {"name": "impact", "type": "DOUBLE", "description": "0.5 low, 1 medium, 2 high, 3 massive"},
                {"name": "confidence", "type": "DOUBLE", "description": "0.5 to 1.0"},
                {"name": "effort_weeks", "type": "DOUBLE", "description": "Person-weeks of work"},
            ]},
        },
    })
    return len(rows), len(backlog)


if __name__ == "__main__":
    print(DATASET, generate())
