"""Runnable SQLite learning approval prototype. NOT a Supabase API or production auth."""
import sqlite3

class LearningStore:
    def __init__(self, path):
        self.db=sqlite3.connect(path, isolation_level=None, timeout=5)
        self.db.execute("PRAGMA busy_timeout=5000")
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS bindings(id TEXT PRIMARY KEY,owner TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS snapshots(
            id TEXT PRIMARY KEY,binding TEXT NOT NULL REFERENCES bindings(id),
            slot INTEGER NOT NULL CHECK(slot BETWEEN 0 AND 4),
            version INTEGER NOT NULL CHECK(version>0),
            trades INTEGER NOT NULL CHECK(trades>=0),
            proposal TEXT, status TEXT NOT NULL DEFAULT 'PENDING'
            CHECK(status IN ('PENDING','APPROVED','REJECTED')),
            UNIQUE(binding,slot,version));
        """)
    def add_binding(self,binding,owner):
        if not binding or not owner:raise ValueError("invalid binding")
        self.db.execute("INSERT INTO bindings(id,owner) VALUES(?,?)",(binding,owner))
    def add_snapshot(self,sid,binding,slot,version,trades,proposal):
        if not sid or type(slot) is not int or type(version) is not int or type(trades) is not int:raise ValueError("invalid snapshot")
        self.db.execute("INSERT INTO snapshots(id,binding,slot,version,trades,proposal) VALUES(?,?,?,?,?,?)",
                        (sid,binding,slot,version,trades,proposal))
    def approve(self,authenticated_user,binding,sid,decision):
        if not all(isinstance(x,str) and x for x in (authenticated_user,binding,sid)) or decision not in ("YES","NO"):
            return "INVALID"
        self.db.execute("BEGIN IMMEDIATE")
        try:
            owner=self.db.execute("SELECT owner FROM bindings WHERE id=?",(binding,)).fetchone()
            if owner is None or owner[0]!=authenticated_user:
                result="FORBIDDEN"
            else:
                row=self.db.execute("SELECT slot,version,trades,proposal,status FROM snapshots WHERE id=? AND binding=?",
                                    (sid,binding)).fetchone()
                if row is None:result="NOT_FOUND"
                elif row[4]!="PENDING":result="ALREADY_DECIDED"
                elif row[1]!=self.db.execute("SELECT MAX(version) FROM snapshots WHERE binding=? AND slot=?",
                                            (binding,row[0])).fetchone()[0]:result="STALE_VERSION"
                elif decision=="YES" and row[2]<20:result="NOT_ENOUGH_TRADES"
                elif decision=="YES" and (not row[3] or row[3].strip() in ("","{}","null")):result="NO_PROPOSAL"
                else:
                    status="APPROVED" if decision=="YES" else "REJECTED"
                    cur=self.db.execute("UPDATE snapshots SET status=? WHERE id=? AND binding=? AND status='PENDING'",
                                        (status,sid,binding))
                    result=status if cur.rowcount==1 else "CONFLICT"
            self.db.execute("COMMIT")
            return result
        except BaseException:
            self.db.execute("ROLLBACK")
            raise
    def status(self,sid):
        row=self.db.execute("SELECT status FROM snapshots WHERE id=?",(sid,)).fetchone()
        return row[0] if row else None
    def close(self):self.db.close()
