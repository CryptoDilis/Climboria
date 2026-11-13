import os
import tempfile
import unittest
from paper_journal import PaperJournal

class JournalTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.path=os.path.join(self.tmp.name,"paper.db")
        self.j=PaperJournal(self.path,initial_lamports=500,reserve_lamports=20)
    def tearDown(self):
        self.j.close()
        self.tmp.cleanup()
    def test_reserve(self):
        self.assertEqual(self.j.reserve("a",0,"M",100,1),"RESERVED")
        self.assertEqual(self.j.available(),380)
    def test_idempotent_reservation(self):
        self.j.reserve("a",0,"M",100,1)
        self.assertEqual(self.j.reserve("a",0,"M",100,1),"RESERVED")
        self.assertEqual(self.j.available(),380)
    def test_slot_exclusion(self):
        self.j.reserve("a",0,"M",100,1)
        self.assertEqual(self.j.reserve("b",0,"N",100,1),"SLOT_OR_MINT_BUSY")
    def test_mint_exclusion(self):
        self.j.reserve("a",0,"M",100,1)
        self.assertEqual(self.j.reserve("b",1,"M",100,1),"SLOT_OR_MINT_BUSY")
    def test_insufficient_funds(self):
        self.assertEqual(self.j.reserve("a",0,"M",481,1),"INSUFFICIENT_FUNDS")
    def test_expiry(self):
        self.j.reserve("a",0,"M",100,1)
        self.assertEqual(self.j.expire_unsubmitted(7),["a"])
        self.assertEqual(self.j.available(),480)
    def test_unknown_stays_locked(self):
        self.j.reserve("a",0,"M",100,1)
        self.j.submit("a","sig",2)
        self.assertEqual(self.j.mark_unknown("a"),"UNKNOWN")
        self.assertEqual(self.j.available(),380)
    def test_confirm_once(self):
        self.j.reserve("a",0,"M",100,1)
        self.j.submit("a","sig",2)
        self.assertEqual(self.j.reconcile("a","CONFIRMED"),"CONFIRMED")
        self.assertEqual(self.j.reconcile("a","CONFIRMED"),"CONFIRMED")
        self.assertEqual(self.j.available(),380)
    def test_failed_releases(self):
        self.j.reserve("a",0,"M",100,1)
        self.j.submit("a","sig",2)
        self.assertEqual(self.j.reconcile("a","FAILED"),"FAILED")
        self.assertEqual(self.j.available(),480)
    def test_restart_unknown(self):
        self.j.reserve("a",0,"M",100,1)
        self.j.submit("a","sig",2)
        self.j.mark_unknown("a")
        self.j.close()
        self.j=PaperJournal(self.path)
        self.assertEqual(self.j.state("a"),"UNKNOWN")
        self.assertEqual(self.j.available(),380)
    def test_concurrent_reservations(self):
        other=PaperJournal(self.path)
        try:
            self.j.reserve("a",0,"M",300,1)
            self.assertEqual(other.reserve("b",1,"N",200,1),"INSUFFICIENT_FUNDS")
        finally:other.close()
    def test_cannot_confirm_unsubmitted(self):
        self.j.reserve("a",0,"M",100,1)
        self.assertEqual(self.j.reconcile("a","CONFIRMED"),"NOT_SUBMITTED")

if __name__=="__main__":
    unittest.main()
