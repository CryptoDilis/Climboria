"""Static checks of one-owner-per-wallet migration; not a database execution test."""
import pathlib
import unittest
SQL=(pathlib.Path(__file__).parent/"supabase"/"004_unique_wallet_owner.sql").read_text().lower()
class WalletOwnerMigrationTests(unittest.TestCase):
    def test_unique_index(self):self.assertIn("create unique index if not exists",SQL)
    def test_wallet_key(self):self.assertIn("on climbx.wallet_bindings(wallet_address)",SQL)
    def test_duplicate_detection(self):self.assertIn("having count(*) > 1",SQL)
    def test_fail_closed_exception(self):self.assertIn("raise exception",SQL)
    def test_no_delete(self):self.assertNotIn("delete from climbx.wallet_bindings",SQL)
    def test_no_upsert_stealing(self):self.assertNotIn("on conflict do update",SQL)
    def test_proof_requirement(self):self.assertIn("signed challenge verification",SQL)
    def test_canonical_validation(self):self.assertIn("32 decoded bytes",SQL)
if __name__=="__main__":unittest.main()
