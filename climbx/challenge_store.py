"""Signed challenge lifecycle domain storage (offline only).

No signature verification is performed here. A real backend MUST verify a
Solana signature over the canonical challenge bytes before consuming a nonce.
"""
import secrets
import sqlite3

class ChallengeStore:
    def __init__(self,path):
        self.db=sqlite3.connect(path,isolation_level=None,timeout=5)
        self.db.execute("PRAGMA busy_timeout=5000")
        self.db.execute("""CREATE TABLE IF NOT EXISTS challenges(
            nonce TEXT PRIMARY KEY,user_id TEXT NOT NULL,wallet TEXT NOT NULL,
            domain TEXT NOT NULL,chain TEXT NOT NULL,issued_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL,consumed_at INTEGER,
            CHECK(expires_at>issued_at))""")
    def issue(self,*,user_id,wallet,domain,chain,now,ttl=300):
        if not all(isinstance(v,str) and v for v in (user_id,wallet,domain,chain)):
            raise ValueError("missing identity")
        if type(now) is not int or type(ttl) is not int or not 1<=ttl<=300:
            raise ValueError("invalid time")
        nonce=secrets.token_urlsafe(32)
        self.db.execute("INSERT INTO challenges VALUES(?,?,?,?,?,?,?,NULL)",
                        (nonce,user_id,wallet,domain,chain,now,now+ttl))
        return nonce
    def message(self,nonce):
        row=self.db.execute("SELECT user_id,wallet,domain,chain,issued_at,expires_at FROM challenges WHERE nonce=?",(nonce,)).fetchone()
        if row is None:return None
        user,wallet,domain,chain,issued,expiry=row
        return ("CLIMBX wallet ownership verification\n"
                f"Domain: {domain}\nChain: {chain}\nUser: {user}\nWallet: {wallet}\n"
                f"Nonce: {nonce}\nIssued: {issued}\nExpires: {expiry}")
    def consume_after_verified_signature(self,*,nonce,user_id,wallet,domain,chain,now,signature_verified):
        """Only trusted signature-verification code may pass signature_verified=True."""
        if signature_verified is not True or type(now) is not int:return "DENIED"
        self.db.execute("BEGIN IMMEDIATE")
        try:
            row=self.db.execute("SELECT user_id,wallet,domain,chain,issued_at,expires_at,consumed_at FROM challenges WHERE nonce=?",(nonce,)).fetchone()
            if row is None:result="UNKNOWN"
            elif row[6] is not None:result="REPLAY"
            elif (user_id,wallet,domain,chain)!=row[:4]:result="MISMATCH"
            elif not row[4]<=now<row[5]:result="EXPIRED"
            else:
                changed=self.db.execute("UPDATE challenges SET consumed_at=? WHERE nonce=? AND consumed_at IS NULL",(now,nonce)).rowcount
                result="CONSUMED" if changed==1 else "REPLAY"
            self.db.execute("COMMIT")
            return result
        except BaseException:
            self.db.execute("ROLLBACK")
            raise
    def close(self):self.db.close()
