"""SQLite paper reservation journal. Offline only: no wallet, RPC or real execution."""
import sqlite3
from contextlib import contextmanager

class PaperJournal:
    def __init__(self, path, initial_lamports=None, reserve_lamports=0):
        self.db = sqlite3.connect(path, isolation_level=None, timeout=5)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA busy_timeout=5000")
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA synchronous=FULL")
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS wallet(id INTEGER PRIMARY KEY CHECK(id=1),balance INTEGER NOT NULL CHECK(balance>=0),reserve INTEGER NOT NULL CHECK(reserve>=0));
        CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,slot INTEGER NOT NULL CHECK(slot BETWEEN 0 AND 4),mint TEXT NOT NULL,amount INTEGER NOT NULL CHECK(amount>0),state TEXT NOT NULL CHECK(state IN ('RESERVED','SUBMITTED','UNKNOWN','CONFIRMED','FAILED','EXPIRED')),expires_at INTEGER NOT NULL,signature TEXT UNIQUE);
        CREATE UNIQUE INDEX IF NOT EXISTS active_slot ON orders(slot) WHERE state IN ('RESERVED','SUBMITTED','UNKNOWN');
        CREATE UNIQUE INDEX IF NOT EXISTS active_mint ON orders(mint) WHERE state IN ('RESERVED','SUBMITTED','UNKNOWN');
        """)
        if initial_lamports is not None:
            if type(initial_lamports) is not int or type(reserve_lamports) is not int or min(initial_lamports,reserve_lamports)<0: raise ValueError("invalid wallet")
            with self.tx():
                self.db.execute("INSERT OR IGNORE INTO wallet VALUES(1,?,?)",(initial_lamports,reserve_lamports))
        if self.db.execute("SELECT 1 FROM wallet WHERE id=1").fetchone() is None: raise ValueError("wallet not initialized")

    @contextmanager
    def tx(self):
        self.db.execute("BEGIN IMMEDIATE")
        try:
            yield
            self.db.execute("COMMIT")
        except BaseException:
            self.db.execute("ROLLBACK")
            raise

    def available(self):
        row=self.db.execute("SELECT balance,reserve FROM wallet WHERE id=1").fetchone()
        locked=self.db.execute("SELECT COALESCE(SUM(amount),0) FROM orders WHERE state IN ('RESERVED','SUBMITTED','UNKNOWN')").fetchone()[0]
        return max(0,row["balance"]-row["reserve"]-locked)

    def reserve(self, oid, slot, mint, amount, now, ttl=5):
        if type(oid) is not str or not oid.strip() or type(mint) is not str or not mint.strip() or type(slot) is not int or type(amount) is not int or type(now) is not int or type(ttl) is not int or not 0<=slot<5 or amount<=0 or now<0 or ttl<=0:return "INVALID"
        with self.tx():
            prior=self.db.execute("SELECT state,slot,mint,amount FROM orders WHERE id=?",(oid,)).fetchone()
            if prior:
                if (prior["slot"],prior["mint"],prior["amount"])!=(slot,mint,amount):return "ORDER_CONFLICT"
                return prior["state"]
            if self.available()<amount:return "INSUFFICIENT_FUNDS"
            try:self.db.execute("INSERT INTO orders VALUES(?,?,?,?,?,?,NULL)",(oid,slot,mint,amount,"RESERVED",now+ttl))
            except sqlite3.IntegrityError:return "SLOT_OR_MINT_BUSY"
            return "RESERVED"

    def submit(self, oid, signature, now):
        if type(signature) is not str or not signature.strip() or type(now) is not int or now<0:return "INVALID"
        with self.tx():
            row=self.db.execute("SELECT state,expires_at,signature FROM orders WHERE id=?",(oid,)).fetchone()
            if not row:return "NOT_FOUND"
            if row["signature"] is not None and row["signature"]!=signature:return "SIGNATURE_CONFLICT"
            if row["state"]!="RESERVED":return row["state"]
            if now>row["expires_at"]:
                self.db.execute("UPDATE orders SET state='EXPIRED' WHERE id=?",(oid,))
                return "EXPIRED"
            try:self.db.execute("UPDATE orders SET state='SUBMITTED',signature=? WHERE id=?",(signature,oid))
            except sqlite3.IntegrityError:return "SIGNATURE_CONFLICT"
            return "SUBMITTED"

    def mark_unknown(self, oid):
        with self.tx():
            row=self.db.execute("SELECT state FROM orders WHERE id=?",(oid,)).fetchone()
            if not row:return "NOT_FOUND"
            if row["state"]=="SUBMITTED":
                self.db.execute("UPDATE orders SET state='UNKNOWN' WHERE id=?",(oid,))
                return "UNKNOWN"
            return row["state"]

    def reconcile(self, oid, outcome):
        if outcome not in ("CONFIRMED","FAILED"):return "INVALID"
        with self.tx():
            row=self.db.execute("SELECT state,amount FROM orders WHERE id=?",(oid,)).fetchone()
            if not row:return "NOT_FOUND"
            if row["state"] in ("CONFIRMED","FAILED"):
                return row["state"] if row["state"]==outcome else "OUTCOME_CONFLICT"
            if row["state"]=="EXPIRED":return "EXPIRED"
            if row["state"] not in ("SUBMITTED","UNKNOWN"):return "NOT_SUBMITTED"
            if outcome=="CONFIRMED":
                balance=self.db.execute("SELECT balance FROM wallet WHERE id=1").fetchone()[0]
                if balance<row["amount"]:return "BALANCE_CONFLICT"
                self.db.execute("UPDATE wallet SET balance=balance-? WHERE id=1",(row["amount"],))
            self.db.execute("UPDATE orders SET state=? WHERE id=?",(outcome,oid))
            return outcome

    def expire_unsubmitted(self, now):
        with self.tx():
            rows=self.db.execute("SELECT id FROM orders WHERE state='RESERVED' AND expires_at<?",(now,)).fetchall()
            self.db.execute("UPDATE orders SET state='EXPIRED' WHERE state='RESERVED' AND expires_at<?",(now,))
            return [row["id"] for row in rows]

    def state(self, oid):
        row=self.db.execute("SELECT state FROM orders WHERE id=?",(oid,)).fetchone()
        return row["state"] if row else None

    def close(self):self.db.close()
