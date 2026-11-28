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
CREATE TABLE wallet_fixture.revocations (
 chain integer NOT NULL CHECK(chain=8453),
 address text NOT NULL,
 evidence text NOT NULL UNIQUE REFERENCES wallet_fixture.challenges(id),
 revoked timestamptz NOT NULL,
 PRIMARY KEY(chain,address),
 FOREIGN KEY(chain,address) REFERENCES wallet_fixture.associations(chain,address)
);
ALTER TABLE wallet_fixture.revocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_fixture.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_fixture.associations ENABLE ROW LEVEL SECURITY;
-- No client policies. Functions execute only as the fixture schema owner.
REVOKE ALL ON ALL TABLES IN SCHEMA wallet_fixture FROM PUBLIC, wallet_fixture_anon, wallet_fixture_authenticated, wallet_fixture_backend;
CREATE FUNCTION wallet_fixture.issue(p_id text,p_uid uuid,p_address text,p_hash text,p_issued timestamptz,p_expires timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF p_address IS NULL OR p_address !~ '^0x[0-9a-f]{40}$' OR p_address='0x0000000000000000000000000000000000000000' THEN
  RAISE EXCEPTION 'fixture-proof-rejected';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('wallet_fixture:8453:'||p_address,0));
 IF EXISTS(SELECT 1 FROM wallet_fixture.revocations WHERE chain=8453 AND address=p_address) THEN
  RAISE EXCEPTION 'fixture-proof-rejected';
 END IF;
 INSERT INTO wallet_fixture.challenges(id,uid,address,message_hash,issued,expires)
 VALUES(p_id,p_uid,p_address,p_hash,p_issued,p_expires);
END;
$$;
-- The backend MUST verify the exact message and authenticated identity first.
-- A direct caller cannot use this as a proof or sign/settle a reward.
CREATE FUNCTION wallet_fixture.consume_verified_fixture(p_id text,p_uid uuid,p_hash text,p_now timestamptz)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE c wallet_fixture.challenges%ROWTYPE; a wallet_fixture.associations%ROWTYPE; target text;
BEGIN
 SELECT address INTO target FROM wallet_fixture.challenges WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'fixture-proof-rejected'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('wallet_fixture:8453:'||target,0));
 IF EXISTS(SELECT 1 FROM wallet_fixture.revocations WHERE chain=8453 AND address=target) THEN
  RAISE EXCEPTION 'fixture-proof-rejected';
 END IF;
 SELECT * INTO c FROM wallet_fixture.challenges WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR c.address<>target OR p_uid IS NULL OR p_hash IS NULL OR p_now IS NULL OR c.uid<>p_uid
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
-- Offline irreversible freeze; no automatic transfer/relink or production recovery.
CREATE FUNCTION wallet_fixture.revoke_verified_fixture(p_address text,p_uid uuid,p_now timestamptz)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE a wallet_fixture.associations%ROWTYPE; r wallet_fixture.revocations%ROWTYPE;
BEGIN
 IF p_address IS NULL OR p_address !~ '^0x[0-9a-f]{40}$' OR p_uid IS NULL OR p_now IS NULL THEN
  RAISE EXCEPTION 'fixture-proof-rejected';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('wallet_fixture:8453:'||p_address,0));
 SELECT * INTO a FROM wallet_fixture.associations WHERE chain=8453 AND address=p_address FOR UPDATE;
 IF NOT FOUND OR a.uid<>p_uid OR p_now<a.verified THEN RAISE EXCEPTION 'fixture-proof-rejected'; END IF;
 SELECT * INTO r FROM wallet_fixture.revocations WHERE chain=8453 AND address=p_address;
 IF FOUND THEN
  IF r.evidence<>a.evidence OR p_now<r.revoked THEN RAISE EXCEPTION 'fixture-proof-rejected'; END IF;
 ELSE
  INSERT INTO wallet_fixture.revocations(chain,address,evidence,revoked) VALUES(8453,p_address,a.evidence,p_now);
 END IF;
 UPDATE wallet_fixture.challenges SET consumed=true WHERE address=p_address AND NOT consumed;
 RETURN a.evidence;
END;
$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA wallet_fixture FROM PUBLIC, wallet_fixture_anon, wallet_fixture_authenticated;
GRANT EXECUTE ON FUNCTION wallet_fixture.issue(text,uuid,text,text,timestamptz,timestamptz) TO wallet_fixture_backend;
GRANT EXECUTE ON FUNCTION wallet_fixture.consume_verified_fixture(text,uuid,text,timestamptz) TO wallet_fixture_backend;
GRANT EXECUTE ON FUNCTION wallet_fixture.revoke_verified_fixture(text,uuid,timestamptz) TO wallet_fixture_backend;
COMMIT;
