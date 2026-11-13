import os
import tempfile
import unittest
from learning_store import LearningStore

class LearningStoreTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.path=os.path.join(self.tmp.name,"learning.db")
        self.store=LearningStore(self.path)
        self.store.add_binding("b1","alice")
        self.store.add_binding("b2","bob")
        self.store.add_snapshot("s1","b1",0,1,20,'{"stop_loss_bps":100}')
    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()
    def test_approve(self):
        self.assertEqual(self.store.approve("alice","b1","s1","YES"),"APPROVED")
    def test_reject(self):
        self.assertEqual(self.store.approve("alice","b1","s1","NO"),"REJECTED")
    def test_other_user_denied(self):
        self.assertEqual(self.store.approve("bob","b1","s1","YES"),"FORBIDDEN")
    def test_other_binding_denied(self):
        self.assertEqual(self.store.approve("alice","b2","s1","YES"),"FORBIDDEN")
    def test_replay_denied(self):
        self.store.approve("alice","b1","s1","YES")
        self.assertEqual(self.store.approve("alice","b1","s1","YES"),"ALREADY_DECIDED")
    def test_19_trades_denied(self):
        self.store.add_snapshot("s2","b1",1,1,19,"{}")
        self.assertEqual(self.store.approve("alice","b1","s2","YES"),"NOT_ENOUGH_TRADES")
    def test_no_under_20_allowed(self):
        self.store.add_snapshot("s2","b1",1,1,0,None)
        self.assertEqual(self.store.approve("alice","b1","s2","NO"),"REJECTED")
    def test_stale_version(self):
        self.store.add_snapshot("s2","b1",0,2,20,"{}")
        self.assertEqual(self.store.approve("alice","b1","s1","YES"),"STALE_VERSION")
    def test_missing_proposal(self):
        self.store.add_snapshot("s2","b1",1,1,20,None)
        self.assertEqual(self.store.approve("alice","b1","s2","YES"),"NO_PROPOSAL")
    def test_unknown_snapshot(self):
        self.assertEqual(self.store.approve("alice","b1","missing","YES"),"NOT_FOUND")
    def test_invalid_decision(self):
        self.assertEqual(self.store.approve("alice","b1","s1","MAYBE"),"INVALID")
    def test_persistence(self):
        self.store.approve("alice","b1","s1","YES")
        self.store.close()
        self.store=LearningStore(self.path)
        self.assertEqual(self.store.status("s1"),"APPROVED")
    def test_cross_connection_replay(self):
        other=LearningStore(self.path)
        try:
            self.assertEqual(self.store.approve("alice","b1","s1","YES"),"APPROVED")
            self.assertEqual(other.approve("alice","b1","s1","NO"),"ALREADY_DECIDED")
        finally:other.close()
    def test_slot_range(self):
        with self.assertRaises(Exception):
            self.store.add_snapshot("bad","b1",5,1,20,"{}")
    def test_duplicate_version(self):
        with self.assertRaises(Exception):
            self.store.add_snapshot("bad","b1",0,1,20,"{}")

if __name__=="__main__":unittest.main()
