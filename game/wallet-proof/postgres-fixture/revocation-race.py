#!/usr/bin/env python3
"""Actual independent-session revoke/verify contention in a disposable fixture."""
import os
import subprocess
import tempfile
import time

BASE = ["psql", "-X", "-v", "ON_ERROR_STOP=1", "-A", "-t", "-h", "127.0.0.1",
        "-U", "postgres", "-d", "wallet_fixture_test"]
UID = "11111111-1111-4111-8111-111111111111"
ADDR = "0x" + "4" * 40
A, B = "5" * 32, "6" * 32
ISSUED, EXP = "2026-11-27 00:00:00+00", "2026-11-27 00:05:00+00"
NOW = "2026-11-27 00:00:03+00"

def sql(command):
    return subprocess.run(BASE + ["-c", command], check=True, capture_output=True,
                          text=True, timeout=15).stdout.strip()

def consume(c):
    return f"SELECT wallet_fixture.consume_verified_fixture('{c}','{UID}','{c[0]*64}','{NOW}');"

for c in (A, B):
    sql(f"SET ROLE wallet_fixture_backend; SELECT wallet_fixture.issue('{c}','{UID}','{ADDR}','{c[0]*64}','{ISSUED}','{EXP}');")
sql("SET ROLE wallet_fixture_backend; " + consume(A))

def wait_event(app, kind, event=None):
    deadline = time.monotonic() + 6
    condition = f"application_name='{app}' AND wait_event_type='{kind}'"
    if event:
        condition += f" AND wait_event='{event}'"
    while time.monotonic() < deadline:
        if sql(f"SELECT count(*) FROM pg_stat_activity WHERE {condition};") == "1":
            return
        time.sleep(0.08)
    raise AssertionError(f"{app} never reached expected wait {kind}/{event}")

with tempfile.TemporaryFile(mode="w+") as aout, tempfile.TemporaryFile(mode="w+") as bout:
    first = second = None
    try:
        first = subprocess.Popen(BASE + ["-c", "SET statement_timeout='25s'; SET ROLE wallet_fixture_backend; BEGIN; "
             f"SELECT wallet_fixture.revoke_verified_fixture('{ADDR}','{UID}','{NOW}'); SELECT pg_sleep(10); COMMIT;"],
             stdout=aout, stderr=aout, text=True, env={**os.environ, "PGAPPNAME":"fixture-revoke-first"})
        wait_event("fixture-revoke-first", "Timeout", "PgSleep")
        second = subprocess.Popen(BASE + ["-c", "SET statement_timeout='25s'; SET ROLE wallet_fixture_backend; " + consume(B)],
             stdout=bout, stderr=bout, text=True, env={**os.environ, "PGAPPNAME":"fixture-revoke-second"})
        wait_event("fixture-revoke-second", "Lock")
        if first.wait(timeout=20) != 0:
            aout.seek(0)
            raise AssertionError(aout.read())
        code = second.wait(timeout=20)
        bout.seek(0)
        output = bout.read()
        assert code != 0 and "fixture-proof-rejected" in output, output
    finally:
        for p in (first, second):
            if p is not None and p.poll() is None:
                p.kill()
                p.wait(timeout=5)

assert sql(f"SELECT count(*) FROM wallet_fixture.revocations WHERE address='{ADDR}' AND evidence='{A}';") == "1"
assert sql(f"SELECT count(*) FROM wallet_fixture.associations WHERE address='{ADDR}' AND evidence='{A}';") == "1"
assert sql(f"SELECT consumed FROM wallet_fixture.challenges WHERE id='{B}';") == "t"
print("PASS concurrent PostgreSQL revocation first: blocked verifier rejects after freeze commits")
