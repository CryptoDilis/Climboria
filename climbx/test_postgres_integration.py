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
            cls.db.execute("DO $ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '" + role + "') THEN CREATE ROLE " + role + " NOLOGIN; END IF; END $")
        cls.db.execute("CREATE SCHEMA IF NOT EXISTS auth")
        cls.db.execute("CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY)")
        cls.db.execute("CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT null::uuid $$")
        for migration in ("001_learning_memory.sql","003_wallet_challenges.sql","004_unique_wallet_owner.sql"):
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

if __name__=="__main__":unittest.main()
