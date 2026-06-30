#!/usr/bin/env python3
"""Run all E2E scripts sequentially; exit non-zero if any fail."""
import subprocess, sys
from pathlib import Path

HERE = Path(__file__).parent
SCRIPTS = [
    "sim_reg_happy.py",
    "sim_reg_with_data.py",
    "sim_reg_empty.py",
    "sim_reg_denied.py",
    "sim_reg_500.py",
    "sim_reg_validate.py",
    "sim_reg_persist.py",
    "sim_reg_dynamic.py",
]

failed = []
for s in SCRIPTS:
    print(f"\n=== {s} ===", flush=True)
    rc = subprocess.call([sys.executable, str(HERE / s)])
    print(f"--- {s} exit={rc} ---", flush=True)
    if rc != 0:
        failed.append(s)

if failed:
    print(f"\nFAILED: {failed}")
    sys.exit(1)
print("\nALL E2E PASS")
