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


    def test_conflicting_reuse_of_order_id_is_rejected_without_reallocation(self):
        self.assertEqual(self.j.reserve("same",0,"M",100,1),"RESERVED")
        for slot,mint,amount in [(0,"M",101),(0,"N",100),(1,"M",100)]:
            self.assertEqual(self.j.reserve("same",slot,mint,amount,2),"ORDER_CONFLICT")
        self.assertEqual(self.j.reserve("same",0,"M",100,2),"RESERVED")
        self.assertEqual(self.j.available(),380)

    def test_conflicting_replay_after_confirm_and_restart(self):
        self.assertEqual(self.j.reserve("once",0,"M",100,1),"RESERVED")
        self.assertEqual(self.j.submit("once","sig",2),"SUBMITTED")
        self.assertEqual(self.j.reconcile("once","CONFIRMED"),"CONFIRMED")
        self.j.close()
        self.j=PaperJournal(self.path)
        self.assertEqual(self.j.reserve("once",0,"M",500,9),"ORDER_CONFLICT")
        self.assertEqual(self.j.reserve("once",0,"M",100,9),"CONFIRMED")
        self.assertEqual(self.j.available(),380)

    def test_conflicting_signature_after_submit_and_unknown(self):
        self.j.reserve("once",0,"M",100,1)
        self.assertEqual(self.j.submit("once","sig-A",2),"SUBMITTED")
        self.assertEqual(self.j.submit("once","sig-A",3),"SUBMITTED")
        self.assertEqual(self.j.submit("once","sig-B",3),"SIGNATURE_CONFLICT")
        self.assertEqual(self.j.mark_unknown("once"),"UNKNOWN")
        self.assertEqual(self.j.submit("once","sig-B",3),"SIGNATURE_CONFLICT")
        self.assertEqual(self.j.submit("once","sig-A",3),"UNKNOWN")
        self.assertEqual(self.j.available(),380)

    def test_identical_signature_cannot_be_assigned_to_two_orders(self):
        self.assertEqual(self.j.reserve("a",0,"M",100,1),"RESERVED")
        self.assertEqual(self.j.reserve("b",1,"N",100,1),"RESERVED")
        self.assertEqual(self.j.submit("a","same-signature",2),"SUBMITTED")
        self.assertEqual(self.j.submit("b","same-signature",2),"SIGNATURE_CONFLICT")
        self.assertEqual(self.j.state("b"),"RESERVED")
        self.assertEqual(self.j.available(),280)

    def test_terminal_reconciliation_rejects_conflicting_outcomes(self):
        self.j.reserve("confirmed",0,"M",100,1)
        self.j.submit("confirmed","sig-confirmed",2)
        self.assertEqual(self.j.reconcile("confirmed","CONFIRMED"),"CONFIRMED")
        self.assertEqual(self.j.reconcile("confirmed","FAILED"),"OUTCOME_CONFLICT")
        self.assertEqual(self.j.reconcile("confirmed","CONFIRMED"),"CONFIRMED")
        self.assertEqual(self.j.available(),380)
        self.j.reserve("failed",1,"N",50,1)
        self.j.submit("failed","sig-failed",2)
        self.assertEqual(self.j.reconcile("failed","FAILED"),"FAILED")
        self.assertEqual(self.j.reconcile("failed","CONFIRMED"),"OUTCOME_CONFLICT")
        self.assertEqual(self.j.available(),380)

    def test_invalid_ids_mints_and_past_timestamps_fail_closed(self):
        self.assertEqual(self.j.reserve(" ",0,"M",100,1),"INVALID")
        self.assertEqual(self.j.reserve(42,0,"M",100,1),"INVALID")
        self.assertEqual(self.j.reserve("a",0," ",100,1),"INVALID")
        self.assertEqual(self.j.reserve("a",0,123,100,1),"INVALID")
        self.assertEqual(self.j.reserve("a",0,"M",100,-1),"INVALID")
        self.assertEqual(self.j.available(),480)
        self.assertEqual(self.j.submit("missing","sig",-1),"INVALID")
        self.j.reserve("a",0,"M",100,1)
        self.assertEqual(self.j.submit("a",5,2),"INVALID")
        self.assertEqual(self.j.submit("a"," ",2),"INVALID")
        self.assertEqual(self.j.submit("a","sig",-1),"INVALID")
        self.assertEqual(self.j.state("a"),"RESERVED")

    def test_two_connection_order_id_conflict_cannot_alias_reserved_funds(self):
        other=PaperJournal(self.path)
        try:
            self.assertEqual(self.j.reserve("order",0,"M",100,1),"RESERVED")
            self.assertEqual(other.reserve("order",1,"N",200,2),"ORDER_CONFLICT")
            self.assertEqual(other.reserve("order",0,"M",100,2),"RESERVED")
            self.assertEqual(other.available(),380)
        finally:other.close()

if __name__=="__main__":
    unittest.main()
