-- Migration 0002: unified Climboria accounts and social/email identity support.
-- Safe to apply after 0001 wallet challenge/session tables.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  disabled INTEGER NOT NULL DEFAULT 0 CHECK (disabled IN (0, 1))
);

CREATE TABLE IF NOT EXISTS auth_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('wallet', 'google', 'x', 'email')),
  provider_subject TEXT NOT NULL,
  email TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, provider_subject),
  UNIQUE(user_id, provider, provider_subject)
);
CREATE INDEX IF NOT EXISTS idx_auth_identities_user ON auth_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_identities_email ON auth_identities(email);

CREATE TABLE IF NOT EXISTS oauth_states (
  state_hash TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'x')),
  code_verifier TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed INTEGER NOT NULL DEFAULT 0 CHECK (consumed IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expiry ON oauth_states(expires_at);

CREATE TABLE IF NOT EXISTS email_login_challenges (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed INTEGER NOT NULL DEFAULT 0 CHECK (consumed IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_email_challenges_expiry ON email_login_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_challenges_email ON email_login_challenges(email);

-- Rebuild sessions so social/email users can also have sessions without a wallet.
CREATE TABLE IF NOT EXISTS auth_sessions_v2 (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  wallet TEXT,
  chain TEXT,
  auth_method TEXT NOT NULL DEFAULT 'wallet' CHECK (auth_method IN ('wallet', 'google', 'x', 'email')),
  expires_at TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0 CHECK (revoked IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK ((wallet IS NULL AND chain IS NULL) OR (wallet IS NOT NULL AND chain IS NOT NULL))
);
INSERT OR IGNORE INTO auth_sessions_v2
  (id, token_hash, user_id, wallet, chain, auth_method, expires_at, revoked, created_at)
SELECT id, token_hash, NULL, wallet, chain, 'wallet', expires_at, revoked, created_at
FROM auth_sessions;
DROP TABLE auth_sessions;
ALTER TABLE auth_sessions_v2 RENAME TO auth_sessions;
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expiry ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
