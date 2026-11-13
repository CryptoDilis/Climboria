"""Real PostgreSQL integration checks for CLIMBX schema migrations.
Run only against an isolated throwaway DB; never production.
Requires CLIMBX_TEST_DATABASE_URL and psycopg (pip install 'psycopg[binary]').
"""
import os
import pathlib
import uuid
import unittest

try:
    import psycopg
except ImportError:
    psycopg = None

ROOT=pathlib.Path(__file__).parent
URL=os.environ.get("CLIMBX_TEST_DATABASE_URL")

@unittest.skipUnless(URL and psycopg, "requires isolated PostgreSQL test DB")
class PostgresMigrationIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db=psycopg.connect(URL,autocommit=True)
        # Supabase normally supplies these roles; isolated PostgreSQL does not.
        # Non-login roles exist only inside the throwaway CI database.
        for role in ("anon", "authenticated"):
            if not cls.db.execute("SELECT 1 FROM pg_roles WHERE rolname=%s", (role,)).fetchone():
                cls.db.execute("CREATE ROLE " + role + " NOLOGIN")
        cls.db.execute("CREATE SCHEMA IF NOT EXISTS auth")
        cls.db.execute("CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY)")
        cls.db.execute("CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT null::uuid $$")
        for migration in ("001_learning_memory.sql","003_wallet_challenges.sql","004_unique_wallet_owner.sql","005_wallet_api_rate_limits.sql"):
            cls.db.execute((ROOT/"supabase"/migration).read_text())
    @classmethod
    def tearDownClass(cls):
        cls.db.close()
    def setUp(self):
        self.user1,self.user2=uuid.uuid4(),uuid.uuid4()
        self.db.execute("INSERT INTO auth.users(id) VALUES (%s),(%s)",(self.user1,self.user2))
        self.wallet="Wallet"+uuid.uuid4().hex+"A"
    def tearDown(self):
        self.db.execute("DELETE FROM auth.users WHERE id IN (%s,%s)",(self.user1,self.user2))
    def test_one_wallet_one_owner(self):
        self.db.execute("INSERT INTO climbx.wallet_bindings(user_id,wallet_address,verified_at) VALUES(%s,%s,now())",(self.user1,self.wallet))
        with self.assertRaises(psycopg.errors.UniqueViolation):
            self.db.execute("INSERT INTO climbx.wallet_bindings(user_id,wallet_address,verified_at) VALUES(%s,%s,now())",(self.user2,self.wallet))
    def test_challenge_atomic_single_consume(self):
        nonce=uuid.uuid4().hex
        self.db.execute("""INSERT INTO climbx.wallet_challenges
          (nonce,user_id,wallet_address,domain,chain,canonical_message,issued_at,expires_at)
          VALUES (%s,%s,%s,'climboria.fun','solana:devnet','test-message',now(),now()+interval '4 minutes')""",
          (nonce,self.user1,self.wallet))
        sql="""UPDATE climbx.wallet_challenges SET consumed_at=now()
          WHERE nonce=%s AND user_id=%s AND wallet_address=%s AND consumed_at IS NULL
          AND issued_at<=now() AND expires_at>now() RETURNING nonce"""
        assert self.db.execute(sql,(nonce,self.user1,self.wallet)).fetchone()
        self.assertIsNone(self.db.execute(sql,(nonce,self.user1,self.wallet)).fetchone())
    def test_wrong_user_cannot_consume(self):
        nonce=uuid.uuid4().hex
        self.db.execute("""INSERT INTO climbx.wallet_challenges
          (nonce,user_id,wallet_address,domain,chain,canonical_message,issued_at,expires_at)
          VALUES (%s,%s,%s,'climboria.fun','solana:devnet','test-message',now(),now()+interval '4 minutes')""",
          (nonce,self.user1,self.wallet))
        result=self.db.execute("""UPDATE climbx.wallet_challenges SET consumed_at=now()
          WHERE nonce=%s AND user_id=%s AND consumed_at IS NULL RETURNING nonce""",(nonce,self.user2))
        self.assertIsNone(result.fetchone())
    def test_expired_challenge_not_consumable(self):
        nonce=uuid.uuid4().hex
        self.db.execute("""INSERT INTO climbx.wallet_challenges
          (nonce,user_id,wallet_address,domain,chain,canonical_message,issued_at,expires_at)
          VALUES (%s,%s,%s,'climboria.fun','solana:devnet','test-message',
          now()-interval '6 minutes',now()-interval '2 minutes')""",
          (nonce,self.user1,self.wallet))
        self.assertIsNone(self.db.execute("""UPDATE climbx.wallet_challenges SET consumed_at=now()
          WHERE nonce=%s AND consumed_at IS NULL AND expires_at>now() RETURNING nonce""",(nonce,)).fetchone())

    def test_atomic_rollback_keeps_nonce_unconsumed(self):
        """If binding fails, nonce consumption must roll back too."""
        nonce=uuid.uuid4().hex
        self.db.execute("""INSERT INTO climbx.wallet_challenges
          (nonce,user_id,wallet_address,domain,chain,canonical_message,issued_at,expires_at)
          VALUES (%s,%s,%s,'climboria.fun','solana:devnet','test-message',now(),now()+interval '4 minutes')""",
          (nonce,self.user1,self.wallet))
        self.db.execute("INSERT INTO climbx.wallet_bindings(user_id,wallet_address,verified_at) VALUES(%s,%s,now())",(self.user2,self.wallet))
        with psycopg.connect(URL) as conn:
            with self.assertRaises(psycopg.errors.UniqueViolation):
                with conn.transaction():
                    conn.execute("UPDATE climbx.wallet_challenges SET consumed_at=now() WHERE nonce=%s",(nonce,))
                    conn.execute("INSERT INTO climbx.wallet_bindings(user_id,wallet_address,verified_at) VALUES(%s,%s,now())",(self.user1,self.wallet))
        self.assertIsNone(self.db.execute("SELECT consumed_at FROM climbx.wallet_challenges WHERE nonce=%s",(nonce,)).fetchone()[0])
    def test_private_challenge_table_has_rls(self):
        enabled=self.db.execute("""SELECT relrowsecurity FROM pg_class
          WHERE oid='climbx.wallet_challenges'::regclass""").fetchone()[0]
        self.assertTrue(enabled)
    def test_anon_cannot_read_challenges(self):
        grant=self.db.execute("""SELECT has_table_privilege('anon','climbx.wallet_challenges','SELECT')""").fetchone()[0]
        self.assertFalse(grant)


    def test_rate_limit_table_private_rls(self):
        enabled=self.db.execute("""SELECT relrowsecurity FROM pg_class
          WHERE oid='climbx.wallet_api_rate_limits'::regclass""").fetchone()[0]
        self.assertTrue(enabled)
        self.assertFalse(self.db.execute("""SELECT has_table_privilege(
          'anon','climbx.wallet_api_rate_limits','SELECT')""").fetchone()[0])
        self.assertFalse(self.db.execute("""SELECT has_table_privilege(
          'authenticated','climbx.wallet_api_rate_limits','INSERT')""").fetchone()[0])

    def test_rate_limit_atomic_upsert_threshold(self):
        import hashlib
        key=hashlib.sha256(uuid.uuid4().bytes).hexdigest()
        sql="""INSERT INTO climbx.wallet_api_rate_limits(key_hash,window_start,request_count)
          VALUES (%s,date_trunc('minute',now()),1)
          ON CONFLICT (key_hash) DO UPDATE SET
          request_count=CASE WHEN climbx.wallet_api_rate_limits.window_start=
            date_trunc('minute',now()) THEN climbx.wallet_api_rate_limits.request_count+1 ELSE 1 END,
          window_start=date_trunc('minute',now()),updated_at=now()
          RETURNING request_count"""
        self.assertEqual([self.db.execute(sql,(key,)).fetchone()[0] for _ in range(4)],[1,2,3,4])

    def test_rate_limit_window_reset(self):
        import hashlib
        key=hashlib.sha256(uuid.uuid4().bytes).hexdigest()
        self.db.execute("""INSERT INTO climbx.wallet_api_rate_limits
          (key_hash,window_start,request_count) VALUES (%s,now()-interval '2 minutes',9)""",(key,))
        count=self.db.execute("""INSERT INTO climbx.wallet_api_rate_limits
          (key_hash,window_start,request_count) VALUES (%s,date_trunc('minute',now()),1)
          ON CONFLICT (key_hash) DO UPDATE SET
          request_count=CASE WHEN climbx.wallet_api_rate_limits.window_start=
            date_trunc('minute',now()) THEN climbx.wallet_api_rate_limits.request_count+1 ELSE 1 END,
          window_start=date_trunc('minute',now()),updated_at=now()
          RETURNING request_count""",(key,)).fetchone()[0]
        self.assertEqual(count,1)

    def test_rate_limit_rejects_invalid_hash(self):
        with self.assertRaises(psycopg.errors.CheckViolation):
            self.db.execute("""INSERT INTO climbx.wallet_api_rate_limits
              (key_hash,window_start,request_count) VALUES ('bad',now(),1)""")

if __name__=="__main__":unittest.main()
