-- Disposable PostgreSQL fixture only. DO NOT apply to production Supabase.
-- Run as the local test database owner; dedicated backend role is trusted.
-- This is database authorization, not cryptographic signature verification.
BEGIN;
CREATE ROLE wallet_fixture_anon NOLOGIN;
CREATE ROLE wallet_fixture_authenticated NOLOGIN;
CREATE ROLE wallet_fixture_backend NOLOGIN;
CREATE SCHEMA wallet_fixture;
REVOKE ALL ON SCHEMA wallet_fixture FROM PUBLIC;
GRANT USAGE ON SCHEMA wallet_fixture TO wallet_fixture_backend;
CREATE TABLE wallet_fixture.challenges (
 id text PRIMARY KEY CHECK (id ~ '^[0-9a-f]{32}$'),
 uid uuid NOT NULL,
 address text NOT NULL CHECK (address ~ '^0x[0-9a-f]{40}$' AND address <> '0x0000000000000000000000000000000000000000'),
 message_hash text NOT NULL CHECK (message_hash ~ '^[0-9a-f]{64}$'),
 issued timestamptz NOT NULL,
 expires timestamptz NOT NULL CHECK (expires > issued AND expires <= issued + interval '5 minutes'),
 consumed boolean NOT NULL DEFAULT false
);
CREATE TABLE wallet_fixture.associations (
 chain integer NOT NULL CHECK (chain=8453),
 address text NOT NULL,
 uid uuid NOT NULL,
 evidence text NOT NULL UNIQUE REFERENCES wallet_fixture.challenges(id),
 verified timestamptz NOT NULL,
 PRIMARY KEY(chain,address)
);
ALTER TABLE wallet_fixture.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_fixture.associations ENABLE ROW LEVEL SECURITY;
-- No client policies. Functions execute only as the fixture schema owner.
REVOKE ALL ON ALL TABLES IN SCHEMA wallet_fixture FROM PUBLIC, wallet_fixture_anon, wallet_fixture_authenticated, wallet_fixture_backend;
CREATE FUNCTION wallet_fixture.issue(p_id text,p_uid uuid,p_address text,p_hash text,p_issued timestamptz,p_expires timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 INSERT INTO wallet_fixture.challenges(id,uid,address,message_hash,issued,expires)
 VALUES(p_id,p_uid,p_address,p_hash,p_issued,p_expires);
END;
$$;
-- The backend MUST verify the exact message and authenticated identity first.
-- A direct caller cannot use this as a proof or sign/settle a reward.
CREATE FUNCTION wallet_fixture.consume_verified_fixture(p_id text,p_uid uuid,p_hash text,p_now timestamptz)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE c wallet_fixture.challenges%ROWTYPE; a wallet_fixture.associations%ROWTYPE;
BEGIN
 SELECT * INTO c FROM wallet_fixture.challenges WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR p_uid IS NULL OR p_hash IS NULL OR p_now IS NULL OR c.uid<>p_uid
  OR c.message_hash<>p_hash OR c.consumed OR p_now<c.issued OR p_now>=c.expires THEN
  RAISE EXCEPTION 'fixture-proof-rejected';
 END IF;
 INSERT INTO wallet_fixture.associations(chain,address,uid,evidence,verified)
 VALUES(8453,c.address,c.uid,c.id,p_now) ON CONFLICT(chain,address) DO NOTHING;
 SELECT * INTO a FROM wallet_fixture.associations WHERE chain=8453 AND address=c.address FOR UPDATE;
 IF NOT FOUND OR a.uid<>c.uid THEN RAISE EXCEPTION 'fixture-proof-rejected'; END IF;
 UPDATE wallet_fixture.challenges SET consumed=true WHERE id=c.id;
 RETURN a.evidence;
END;
$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA wallet_fixture FROM PUBLIC, wallet_fixture_anon, wallet_fixture_authenticated;
GRANT EXECUTE ON FUNCTION wallet_fixture.issue(text,uuid,text,text,timestamptz,timestamptz) TO wallet_fixture_backend;
GRANT EXECUTE ON FUNCTION wallet_fixture.consume_verified_fixture(text,uuid,text,timestamptz) TO wallet_fixture_backend;
COMMIT;
