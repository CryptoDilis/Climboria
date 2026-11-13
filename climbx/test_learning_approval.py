import unittest
from dataclasses import replace
from learning_approval import LearningSnapshot, VerifiedContext, decide

class LearningApprovalTests(unittest.TestCase):
    def setUp(self):
        self.snapshot=LearningSnapshot("binding-a",2,3,20,proposal={"take_profit_bps":300})
        self.context=VerifiedContext("user-a","binding-a","user-a")
    def check(self, decision="YES", snapshot=None, context=None, version=3, trades=20):
        return decide(snapshot if snapshot is not None else self.snapshot,
                      context if context is not None else self.context,decision,
                      current_version=version,stored_completed_trades=trades)[0]
    def test_yes(self):self.assertEqual(self.check(),"OK")
    def test_no(self):self.assertEqual(self.check("NO"),"OK")
    def test_19_trades(self):self.assertEqual(self.check(snapshot=replace(self.snapshot,completed_trades=19),trades=19),"NOT_ENOUGH_TRADES")
    def test_wrong_user(self):self.assertEqual(self.check(context=replace(self.context,authenticated_user_id="attacker")),"FORBIDDEN")
    def test_wrong_binding(self):self.assertEqual(self.check(context=replace(self.context,wallet_binding_id="other")),"FORBIDDEN")
    def test_empty_identity(self):self.assertEqual(self.check(context=replace(self.context,authenticated_user_id="")),"UNAUTHENTICATED")
    def test_stale_version(self):self.assertEqual(self.check(version=4),"STALE_VERSION")
    def test_stale_count(self):self.assertEqual(self.check(trades=21),"STALE_TRADE_COUNT")
    def test_replay_approval(self):self.assertEqual(self.check(snapshot=replace(self.snapshot,status="APPROVED")),"ALREADY_DECIDED")
    def test_replay_rejection(self):self.assertEqual(self.check(snapshot=replace(self.snapshot,status="REJECTED")),"ALREADY_DECIDED")
    def test_no_proposal(self):self.assertEqual(self.check(snapshot=replace(self.snapshot,proposal=None)),"NO_PROPOSAL")
    def test_invalid_decision(self):self.assertEqual(self.check("MAYBE"),"INVALID_DECISION")
    def test_invalid_slot(self):self.assertEqual(self.check(snapshot=replace(self.snapshot,slot=5)),"INVALID")
    def test_bool_trade_count(self):self.assertEqual(self.check(trades=True),"INVALID")
    def test_no_under_20(self):self.assertEqual(self.check("NO",snapshot=replace(self.snapshot,completed_trades=3),trades=3),"OK")
    def test_status_value(self):
        self.assertEqual(decide(self.snapshot,self.context,"YES",current_version=3,stored_completed_trades=20),("OK","APPROVED"))

if __name__=="__main__":unittest.main()
