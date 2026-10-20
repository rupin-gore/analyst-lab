"""Regenerate every dataset. Usage: python data-gen/generate_all.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bazaarly  # noqa: E402
import saffron_trails  # noqa: E402

GENERATORS = [bazaarly, saffron_trails]

if __name__ == "__main__":
    for g in GENERATORS:
        print(g.DATASET, g.generate())
