import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("issuance", Path(__file__).with_name("verify-issuance-plan.py"))
issuance = importlib.util.module_from_spec(spec)
spec.loader.exec_module(issuance)

def addr(i):
    return "0x" + format(i, "040x")

def encode(fields):
    return issuance.SELECTOR + b"".join(int(fields[k], 16).to_bytes(32, "big")
        if k in issuance.ADDRESS_FIELDS else fields[k].to_bytes(32, "big") for k in issuance.FIELDS)

class IssuancePlanTests(unittest.TestCase):
    def setUp(self):
        self.now = 1000000
        self.fields = dict(zip(issuance.FIELDS, [1, self.now-5, self.now+10, addr(20),
            addr(21), addr(22), self.now+100, 1000, addr(23), addr(24), addr(25), 1000]))
        self.plan = {"schema":1, "status":"REVIEW_ONLY_NO_GO", "chain_id":84532,
            "source_commit":"a"*40, "safe":addr(26), "successor":addr(27),
            "owners":[addr(i) for i in range(10,15)], "threshold":3,
            "expected_epoch":1, "fields":self.fields, "payload_sha256":""}

    def inputs(self, payload=None):
        if payload is None:
            payload = encode(self.fields)
        self.plan["payload_sha256"] = issuance.bundle.digest(payload)
        raw = json.dumps(self.plan, sort_keys=True).encode()
        return raw, payload, issuance.bundle.digest(raw), self.now

    def reject(self, payload=None):
        with self.assertRaises(ValueError):
            issuance.verify(*self.inputs(payload))

    def test_valid_fixture_never_approves(self):
        r = issuance.verify(*self.inputs())
        self.assertEqual(r["testnet"], "NO_GO")
        self.assertEqual(r["mainnet"], "NO_GO")
        self.assertEqual(len(encode(self.fields)), 388)

    def test_wrong_selector(self):
        self.reject(bytes(4) + encode(self.fields)[4:])

    def test_truncated_or_trailing_payload(self):
        p = encode(self.fields)
        for bad in (p[:-1], p + bytes(32)):
            with self.subTest(length=len(bad)):
                self.reject(bad)

    def test_address_padding(self):
        p = bytearray(encode(self.fields))
        p[4+3*32] = 1
        self.reject(bytes(p))

    def test_semantic_mismatch_even_with_matching_payload_digest(self):
        p = encode(self.fields)
        self.fields["founder"] = addr(40)
        self.reject(p)

    def test_tampered_plan_pin(self):
        raw,payload,pin,now = self.inputs()
        with self.assertRaises(ValueError):
            issuance.verify(raw+b" ",payload,pin,now)

    def test_changed_payload_original_pin(self):
        raw,payload,pin,now = self.inputs()
        with self.assertRaises(ValueError):
            issuance.verify(raw,payload[:-1]+bytes([payload[-1]^1]),pin,now)

    def test_wrong_chain(self):
        self.plan["chain_id"] = 8453
        self.reject()

    def test_unauthorized_go(self):
        self.plan["status"] = "GO"
        self.reject()

    def test_wrong_threshold(self):
        self.plan["threshold"] = 2
        self.reject()

    def test_duplicate_owner(self):
        self.plan["owners"][1] = self.plan["owners"][0]
        self.reject()

    def test_reserved_role_overlap(self):
        self.fields["founder"] = self.plan["owners"][0]
        self.reject()

    def test_stale_epoch(self):
        self.fields["epoch"] = 2
        self.reject()

    def test_expired(self):
        self.fields["deadline"] = self.now
        self.reject()

    def test_future_window(self):
        self.fields["valid_after"] = self.now+1
        self.reject()

    def test_overlong_window(self):
        self.fields["valid_after"] = self.now-86400
        self.reject()

    def test_start_before_deadline(self):
        self.fields["start"] = self.now+1
        self.reject()

    def test_start_too_far(self):
        self.fields["start"] = self.now+365*86400+1
        self.reject()

    def test_game_cap_above_ceiling(self):
        self.fields["gaming_wallet_monthly_cap"] = 5185185180001
        self.reject()

    def test_tranche_cap_above_reserve(self):
        self.fields["tranche_cap"] = 222222222000001
        self.reject()

    def test_zero_caps(self):
        self.fields["tranche_cap"] = 0
        self.reject()

if __name__ == "__main__":
    unittest.main()
