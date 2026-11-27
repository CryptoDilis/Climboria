-- psql ON_ERROR_STOP must be enabled. All identifiers and data are synthetic.
DO $$
DECLARE r text; f text;
BEGIN
 FOREACH r IN ARRAY ARRAY['wallet_fixture_anon','wallet_fixture_authenticated'] LOOP
  IF has_schema_privilege(r,'wallet_fixture','USAGE') OR
   has_table_privilege(r,'wallet_fixture.challenges','INSERT,UPDATE,DELETE,SELECT') OR
   has_table_privilege(r,'wallet_fixture.associations','INSERT,UPDATE,DELETE,SELECT') THEN
   RAISE EXCEPTION 'client access unexpectedly granted';
  END IF;
  FOREACH f IN ARRAY ARRAY['wallet_fixture.issue(text,uuid,text,text,timestamptz,timestamptz)','wallet_fixture.consume_verified_fixture(text,uuid,text,timestamptz)'] LOOP
   IF has_function_privilege(r,f,'EXECUTE') THEN RAISE EXCEPTION 'client function privilege'; END IF;
  END LOOP;
 END LOOP;
 IF has_table_privilege('wallet_fixture_backend','wallet_fixture.associations','INSERT,UPDATE,DELETE,SELECT') THEN RAISE EXCEPTION 'backend direct table privilege'; END IF;
END $$;
SET ROLE wallet_fixture_authenticated;
DO $$ BEGIN
 BEGIN
  PERFORM wallet_fixture.consume_verified_fixture(repeat('a',32),'11111111-1111-4111-8111-111111111111',repeat('c',64),now());
  RAISE EXCEPTION 'unexpected client success';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET ROLE wallet_fixture_backend;
SELECT wallet_fixture.issue(repeat('a',32),'11111111-1111-4111-8111-111111111111','0x'||repeat('1',40),repeat('c',64),'2026-11-27 00:00:00+00','2026-11-27 00:05:00+00');
SELECT wallet_fixture.issue(repeat('b',32),'22222222-2222-4222-8222-222222222222','0x'||repeat('1',40),repeat('d',64),'2026-11-27 00:00:00+00','2026-11-27 00:05:00+00');
DO $$ BEGIN
 IF wallet_fixture.consume_verified_fixture(repeat('a',32),'11111111-1111-4111-8111-111111111111',repeat('c',64),'2026-11-27 00:00:01+00')<>repeat('a',32) THEN RAISE EXCEPTION 'wrong evidence'; END IF;
 BEGIN
  PERFORM wallet_fixture.consume_verified_fixture(repeat('a',32),'11111111-1111-4111-8111-111111111111',repeat('c',64),'2026-11-27 00:00:02+00');
  RAISE EXCEPTION 'unexpected replay success';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'fixture-proof-rejected' THEN RAISE; END IF; END;
 BEGIN
  PERFORM wallet_fixture.consume_verified_fixture(repeat('b',32),'22222222-2222-4222-8222-222222222222',repeat('d',64),'2026-11-27 00:00:02+00');
  RAISE EXCEPTION 'unexpected conflicting ownership success';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'fixture-proof-rejected' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT count(*) FROM wallet_fixture.associations)<>1 OR (SELECT consumed FROM wallet_fixture.challenges WHERE id=repeat('b',32)) THEN RAISE EXCEPTION 'conflict did not roll back'; END IF;
 IF NOT (SELECT consumed FROM wallet_fixture.challenges WHERE id=repeat('a',32)) THEN RAISE EXCEPTION 'nonce not consumed'; END IF;
END $$;
SELECT 'PASS PostgreSQL fixture role isolation, consume, replay and conflict rollback' AS result;
