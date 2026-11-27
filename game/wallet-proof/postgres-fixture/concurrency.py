#!/usr/bin/env python3
"""Disposable PostgreSQL concurrency acceptance; no production connections."""
import os
import subprocess
import tempfile
import time

BASE = ["psql", "-X", "-v", "ON_ERROR_STOP=1", "-A", "-t", "-h", "127.0.0.1",
        "-U", "postgres", "-d", "wallet_fixture_test"]
ALICE = "11111111-1111-4111-8111-111111111111"
BOB = "22222222-2222-4222-8222-222222222222"
ISSUED = "2026-11-27 00:00:00+00"
EXP = "2026-11-27 00:05:00+00"
NOW = "2026-11-27 00:00:01+00"

def sql(command):
    return subprocess.run(BASE + ["-c", command], check=True, capture_output=True,
                          text=True, timeout=15).stdout.strip()

def issue(challenge, uid, address, digest):
    sql("SET ROLE wallet_fixture_backend; SELECT wallet_fixture.issue("
        f"'{challenge}','{uid}','{address}','{digest}','{ISSUED}','{EXP}');")

def consume(challenge, uid, digest):
    return f"SELECT wallet_fixture.consume_verified_fixture('{challenge}','{uid}','{digest}','{NOW}');"

def wait_event(app, kind, event=None):
    deadline = time.monotonic() + 6
    condition = f"application_name='{app}' AND wait_event_type='{kind}'"
    if event:
        condition += f" AND wait_event='{event}'"
    while time.monotonic() < deadline:
        if sql(f"SELECT count(*) FROM pg_stat_activity WHERE {condition};") == "1":
            return
        time.sleep(0.08)
    raise AssertionError(f"{app} never reached expected wait state {kind}/{event}")

def race(name, first, second):
    # First transaction consumes and holds its locks during PgSleep.
    # Observe actual blocked second session, rather than assume parallel timing.
    with tempfile.TemporaryFile(mode="w+") as aout, tempfile.TemporaryFile(mode="w+") as bout:
        a = b = None
        try:
            a = subprocess.Popen(BASE + ["-c", "SET statement_timeout='25s'; SET ROLE wallet_fixture_backend; BEGIN; "
                                  + first + " SELECT pg_sleep(10); COMMIT;"],
                                 stdout=aout, stderr=aout, text=True,
                                 env={**os.environ, "PGAPPNAME": name + "-first"})
            wait_event(name + "-first", "Timeout", "PgSleep")
            b = subprocess.Popen(BASE + ["-c", "SET statement_timeout='25s'; SET ROLE wallet_fixture_backend; "
                                  + second], stdout=bout, stderr=bout, text=True,
                                 env={**os.environ, "PGAPPNAME": name + "-second"})
            wait_event(name + "-second", "Lock")
            if a.wait(timeout=20) != 0:
                aout.seek(0)
                raise AssertionError("first transaction failed: " + aout.read())
            code = b.wait(timeout=20)
            bout.seek(0)
            output = bout.read()
            if code == 0 or "fixture-proof-rejected" not in output:
                raise AssertionError("second transaction did not reject: " + output)
        finally:
            for p in (a, b):
                if p is not None and p.poll() is None:
                    p.kill()
                    p.wait(timeout=5)

same = "e" * 32
digest = "e" * 64
addr = "0x" + "2" * 40
issue(same, ALICE, addr, digest)
race("fixture-same-nonce", consume(same, ALICE, digest), consume(same, ALICE, digest))
assert sql(f"SELECT count(*) FROM wallet_fixture.associations WHERE address='{addr}' AND evidence='{same}';") == "1"
assert sql(f"SELECT consumed FROM wallet_fixture.challenges WHERE id='{same}';") == "t"
print("PASS concurrent same-nonce consume: exactly one committed association")

a, b = "f" * 32, "1" * 32
ad, bd = "a" * 64, "b" * 64
addr = "0x" + "3" * 40
issue(a, ALICE, addr, ad)
issue(b, BOB, addr, bd)
race("fixture-address-conflict", consume(a, ALICE, ad), consume(b, BOB, bd))
assert sql(f"SELECT count(*) FROM wallet_fixture.associations WHERE address='{addr}' AND uid='{ALICE}' AND evidence='{a}';") == "1"
assert sql(f"SELECT consumed FROM wallet_fixture.challenges WHERE id='{b}';") == "f"
print("PASS concurrent distinct-nonce address conflict: winner retained, loser rolled back")
