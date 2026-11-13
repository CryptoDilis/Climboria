"""Static checks for durable challenge migration; NOT a PostgreSQL execution test."""
import pathlib
import unittest

SQL=(pathlib.Path(__file__).parent/"supabase"/"003_wallet_challenges.sql").read_text().lower()

class ChallengeMigrationTests(unittest.TestCase):
    def test_table(self):self.assertIn("create table if not exists climbx.wallet_challenges",SQL)
    def test_nonce_primary_key(self):self.assertIn("nonce text primary key",SQL)
    def test_owner(self):self.assertIn("references auth.users",SQL)
    def test_canonical_message(self):self.assertIn("canonical_message text not null",SQL)
    def test_expiry(self):self.assertIn("expires_at timestamptz not null",SQL)
    def test_consumption(self):self.assertIn("consumed_at timestamptz",SQL)
    def test_ttl_bounded(self):self.assertIn("interval '5 minutes'",SQL)
    def test_rls(self):self.assertIn("enable row level security",SQL)
    def test_no_anon_grants(self):self.assertIn("revoke all on climbx.wallet_challenges from public, anon, authenticated",SQL)
    def test_atomic_condition(self):self.assertIn("and consumed_at is null",SQL)
    def test_time_check(self):self.assertIn("and expires_at > :now",SQL)
    def test_binding_transaction_required(self):self.assertIn("same transaction",SQL)

if __name__=="__main__":unittest.main()
