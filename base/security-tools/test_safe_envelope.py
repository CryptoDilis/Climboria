import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("envelope", Path(__file__).with_name("verify-safe-envelope.py"))
envelope = importlib.util.module_from_spec(spec)
spec.loader.exec_module(envelope)
issuance = envelope.issuance

def addr(i):
    return "0x"+format(i,"040x")

class SafeEnvelopeTests(unittest.TestCase):
    def setUp(self):
        self.now = 1000000
        self.nonce = 7
        fields = dict(zip(issuance.FIELDS, [1,self.now-5,self.now+10,addr(20),addr(21),addr(22),
                       self.now+100,1000,addr(23),addr(24),addr(25),1000]))
        self.payload = issuance.SELECTOR + b"".join(
            int(fields[k],16).to_bytes(32,"big") if k in issuance.ADDRESS_FIELDS
            else fields[k].to_bytes(32,"big") for k in issuance.FIELDS)
        self.plan = {"schema":1,"status":"REVIEW_ONLY_NO_GO","chain_id":84532,"source_commit":"a"*40,
                     "safe":addr(26),"successor":addr(27),"owners":[addr(i) for i in range(10,15)],
                     "threshold":3,"expected_epoch":1,"fields":fields,
                     "payload_sha256":envelope.bundle.digest(self.payload)}
        self.plan_raw = json.dumps(self.plan,sort_keys=True).encode()
        self.plan_pin = envelope.bundle.digest(self.plan_raw)
        self.tx = {"schema":1,"status":"REVIEW_ONLY_NO_GO","chain_id":84532,"source_commit":"a"*40,
                   "plan_sha256":self.plan_pin,"safe":addr(26),"to":addr(22),"nonce":self.nonce,
                   "value":0,"operation":0,"safe_tx_gas":0,"base_gas":0,"gas_price":0,
                   "gas_token":envelope.ZERO,"refund_receiver":envelope.ZERO,"data":"0x"+self.payload.hex()}

    def inputs(self):
        raw = json.dumps(self.tx,sort_keys=True).encode()
        return raw,self.plan_raw,self.payload,envelope.bundle.digest(raw),self.plan_pin,self.nonce,self.now

    def reject(self):
        with self.assertRaises(ValueError):
            envelope.verify(*self.inputs())

    def test_valid_unsigned_review_never_approves(self):
        r = envelope.verify(*self.inputs())
        self.assertEqual(r["observed_nonce"],7)
        self.assertEqual(r["testnet"],"NO_GO")
        self.assertEqual(r["mainnet"],"NO_GO")

    def test_wrong_chain(self):
        self.tx["chain_id"] = 8453
        self.reject()

    def test_wrong_safe(self):
        self.tx["safe"] = addr(40)
        self.reject()

    def test_wrong_target(self):
        self.tx["to"] = addr(40)
        self.reject()

    def test_wrong_nonce(self):
        for n in (6,8,True,-1,2**256):
            with self.subTest(n=n):
                self.tx["nonce"] = n
                self.reject()

    def test_forbidden_transaction_fields(self):
        for field in ("value","operation","safe_tx_gas","base_gas","gas_price"):
            with self.subTest(field=field):
                self.tx[field] = 1
                self.reject()
                self.tx[field] = 0

    def test_forbidden_refund(self):
        for field in ("gas_token","refund_receiver"):
            with self.subTest(field=field):
                self.tx[field] = addr(40)
                self.reject()
                self.tx[field] = envelope.ZERO

    def test_changed_inner_call(self):
        self.tx["data"] += "00"
        self.reject()

    def test_wrong_plan_binding(self):
        self.tx["plan_sha256"] = "b"*64
        self.reject()

    def test_wrong_source(self):
        self.tx["source_commit"] = "b"*40
        self.reject()

    def test_extra_signature_field(self):
        self.tx["signatures"] = "0x"
        self.reject()

    def test_go_status(self):
        self.tx["status"] = "GO"
        self.reject()

    def test_expired_observation(self):
        self.now += 10
        self.reject()

    def test_tampered_envelope_pin(self):
        raw,*rest = self.inputs()
        with self.assertRaises(ValueError):
            envelope.verify(raw+b" ",*rest)

    def test_tampered_plan_pin(self):
        raw,plan,payload,pin,plan_pin,nonce,now = self.inputs()
        with self.assertRaises(ValueError):
            envelope.verify(raw,plan+b" ",payload,pin,plan_pin,nonce,now)

if __name__ == "__main__":
    unittest.main()
