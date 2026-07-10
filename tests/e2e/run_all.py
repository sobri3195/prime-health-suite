#!/usr/bin/env python3
"""Run E2E scripts with parallelism + retry. Exit non-zero if any fail.

Env:
  E2E_WORKERS   - parallel workers (default: min(4, len(SCRIPTS)))
  E2E_RETRIES   - retries per failing script (default: 2 => up to 3 attempts)
  E2E_TIMEOUT   - per-script timeout seconds (default: 180)
  E2E_ONLY      - comma-separated subset of script filenames to run
"""
import os, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

HERE = Path(__file__).parent
LOGS = HERE / "logs"; LOGS.mkdir(exist_ok=True)

SCRIPTS = [
    "sim_reg_happy.py",
    "sim_reg_with_data.py",
    "sim_reg_empty.py",
    "sim_reg_denied.py",
    "sim_reg_500.py",
    "sim_reg_timeout.py",
    "sim_reg_loading.py",
    "sim_reg_loading_skeleton.py",
    "sim_reg_create_400.py",
    "sim_reg_create_400_message.py",
    "sim_reg_create_400_retry.py",
    "sim_reg_validate.py",
    "sim_reg_persist.py",
    "sim_reg_dynamic.py",
    "sim_reg_realtime_unavailable.py",
    "sim_reg_queue_persist.py",
    "sim_reg_reload_validate.py",
    "sim_reg_slot_persist.py",
    "smoke_unknown_slug_404.py",
    "finance_master_smoke.py",
]


only = os.environ.get("E2E_ONLY", "").strip()
if only:
    wanted = {s.strip() for s in only.split(",") if s.strip()}
    SCRIPTS = [s for s in SCRIPTS if s in wanted]

WORKERS = int(os.environ.get("E2E_WORKERS", str(min(4, max(1, len(SCRIPTS))))))
RETRIES = int(os.environ.get("E2E_RETRIES", "2"))
TIMEOUT = int(os.environ.get("E2E_TIMEOUT", "180"))


def run_one(script: str) -> tuple[str, int, float, str]:
    log_path = LOGS / f"{script}.log"
    start = time.time()
    attempts = RETRIES + 1
    rc = 1
    with open(log_path, "w") as fh:
        for i in range(1, attempts + 1):
            fh.write(f"\n===== attempt {i}/{attempts} =====\n"); fh.flush()
            try:
                rc = subprocess.call(
                    [sys.executable, str(HERE / script)],
                    stdout=fh, stderr=subprocess.STDOUT, timeout=TIMEOUT,
                )
            except subprocess.TimeoutExpired:
                fh.write(f"\n[timeout after {TIMEOUT}s]\n"); fh.flush()
                rc = 124
            if rc == 0:
                break
            time.sleep(2)
    return script, rc, time.time() - start, str(log_path)


print(f"running {len(SCRIPTS)} scripts | workers={WORKERS} retries={RETRIES} timeout={TIMEOUT}s", flush=True)

results: list[tuple[str, int, float, str]] = []
with ThreadPoolExecutor(max_workers=WORKERS) as ex:
    futs = {ex.submit(run_one, s): s for s in SCRIPTS}
    for fut in as_completed(futs):
        name, rc, dur, log = fut.result()
        status = "PASS" if rc == 0 else f"FAIL(rc={rc})"
        print(f"[{status}] {name} ({dur:.1f}s) log={log}", flush=True)
        results.append((name, rc, dur, log))

failed = [(n, log) for n, rc, _, log in results if rc != 0]
if failed:
    print("\n===== FAILED =====")
    for n, log in failed:
        print(f"\n--- {n} (tail) ---")
        try:
            tail = Path(log).read_text().splitlines()[-40:]
            print("\n".join(tail))
        except Exception as e:
            print(f"(no log: {e})")
    sys.exit(1)

print("\nALL E2E PASS")
