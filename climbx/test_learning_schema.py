"""Static, dependency-free security checks for the proposed Supabase migration.

These tests inspect migration source only. They do not prove PostgreSQL behavior.
"""
import pathlib
import re
import unittest

MIGRATION = pathlib.Path(__file__).resolve().parent / "supabase" / "001_learning_memory.sql"

class LearningSchemaSafetyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sql = MIGRATION.read_text(encoding="utf-8").lower()
        cls.statements = [part.strip() for part in cls.sql.split(";") if part.strip()]

    def test_three_tables_exist(self):
        for name in ("wallet_bindings", "trade_events", "learning_snapshots"):
            with self.subTest(table=name):
                self.assertIn("create table if not exists climbx."+name, self.sql)

    def test_rls_enabled_on_all_tables(self):
        for name in ("wallet_bindings", "trade_events", "learning_snapshots"):
            with self.subTest(table=name):
                self.assertIn("alter table climbx."+name+" enable row level security", self.sql)

    def test_no_client_write_policies(self):
        policies = re.findall(r"create\s+policy\s+[^;]+;", self.sql, flags=re.S)
        self.assertEqual(len(policies), 3)
        for policy in policies:
            self.assertRegex(policy, r"for\s+select\s+to\s+authenticated")
            self.assertNotRegex(policy, r"for\s+(insert|update|delete|all)\b")

    def test_explicit_schema_revoke(self):
        self.assertIn("revoke all on schema climbx from public, anon, authenticated", self.sql)

    def test_explicit_table_revoke(self):
        self.assertIn("revoke all on all tables in schema climbx from public, anon, authenticated", self.sql)

    def test_wallet_owner_filter(self):
        self.assertRegex(self.sql, r"create policy wallet_owner_read[^;]*user_id\s*=\s*\(select auth\.uid\(\)\)", re.S)

    def test_trade_owner_filter(self):
        self.assertRegex(self.sql, r"create policy trade_owner_read[^;]*b\.user_id\s*=\s*\(select auth\.uid\(\)\)", re.S)

    def test_learning_owner_filter(self):
        self.assertRegex(self.sql, r"create policy learning_owner_read[^;]*b\.user_id\s*=\s*\(select auth\.uid\(\)\)", re.S)

    def test_five_slot_limit(self):
        self.assertEqual(self.sql.count("slot between 0 and 4"), 2)

    def test_learning_approval_requires_20_trades(self):
        self.assertIn("approval <> 'approved' or completed_trades >= 20", self.sql)

    def test_no_private_key_columns(self):
        for name in ("private_key", "seed_phrase", "mnemonic", "service_role_key"):
            self.assertNotIn(name, self.sql)

if __name__ == "__main__":
    unittest.main()
