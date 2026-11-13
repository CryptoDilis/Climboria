import unittest
from authorization_gate_v16 import Authorization, evaluate

class AuthorizationPolicyTests(unittest.TestCase):
    def setUp(self):
        self.auth = Authorization(wallet="wallet-a", issued_at=1000, expires_at=10000,
            revoked=False, spend_cap=1000, fee_cap=100, allowed_mints=frozenset({"mint-a"}))

    def check(self, **kwargs):
        args = dict(wallet="wallet-a", action="BUY", mint="mint-a", amount=100, fee=2, now=2000)
        args.update(kwargs)
        return evaluate(self.auth, **args)

    def test_paper_allow(self): self.assertEqual(self.check(), "ALLOW_PAPER_ONLY")
    def test_wrong_wallet(self): self.assertEqual(self.check(wallet="wallet-b"), "WRONG_WALLET")
    def test_wrong_mint(self): self.assertEqual(self.check(mint="mint-b"), "MINT_DENIED")
    def test_entry_cutoff(self): self.assertEqual(self.check(now=8200), "ENTRY_CUTOFF")
    def test_cutoff_before(self): self.assertEqual(self.check(now=8199), "ALLOW_PAPER_ONLY")
    def test_expired(self): self.assertEqual(self.check(now=10000), "OUTSIDE_WINDOW")
    def test_revoked(self):
        from dataclasses import replace
        self.assertEqual(evaluate(replace(self.auth, revoked=True), wallet="wallet-a", action="BUY", mint="mint-a", amount=100, fee=2, now=2000), "REVOKED")
    def test_spend_cap(self): self.assertEqual(self.check(amount=1001), "SPEND_CAP")
    def test_pending_spend(self): self.assertEqual(self.check(pending_spend=901), "SPEND_CAP")
    def test_fee_cap(self): self.assertEqual(self.check(fee=101), "FEE_CAP")
    def test_pending_fees(self): self.assertEqual(self.check(pending_fees=99), "FEE_CAP")
    def test_invalid_amount(self): self.assertEqual(self.check(amount=-1), "INVALID_LIMIT")
    def test_invalid_bool(self): self.assertEqual(self.check(amount=True), "INVALID_NUMERIC")
    def test_unauthorized_action(self): self.assertEqual(self.check(action="TRANSFER"), "ACTION_DENIED")
    def test_sell_during_cutoff(self): self.assertEqual(self.check(action="SELL", now=8200), "ALLOW_PAPER_ONLY")
    def test_before_issue(self): self.assertEqual(self.check(now=999), "OUTSIDE_WINDOW")

if __name__ == "__main__":
    unittest.main()
