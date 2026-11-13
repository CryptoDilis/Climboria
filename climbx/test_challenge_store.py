import os
import tempfile
import unittest
from challenge_store import ChallengeStore

class ChallengeTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.path=os.path.join(self.tmp.name,"challenge.db")
        self.store=ChallengeStore(self.path)
        self.nonce=self.store.issue(user_id="alice",wallet="wallet1",domain="climboria.fun",chain="solana:devnet",now=100)
    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()
    def consume(self,**kw):
        data=dict(nonce=self.nonce,user_id="alice",wallet="wallet1",domain="climboria.fun",chain="solana:devnet",now=110,signature_verified=True)
        data.update(kw)
        return self.store.consume_after_verified_signature(**data)
    def test_challenge_contains_domain(self):self.assertIn("Domain: climboria.fun",self.store.message(self.nonce))
    def test_challenge_contains_nonce(self):self.assertIn(self.nonce,self.store.message(self.nonce))
    def test_unique_nonce(self):
        other=self.store.issue(user_id="alice",wallet="wallet1",domain="climboria.fun",chain="solana:devnet",now=100)
        self.assertNotEqual(other,self.nonce)
    def test_verified_consumption(self):self.assertEqual(self.consume(),"CONSUMED")
    def test_replay(self):
        self.consume()
        self.assertEqual(self.consume(),"REPLAY")
    def test_unverified_denied(self):self.assertEqual(self.consume(signature_verified=False),"DENIED")
    def test_missing_signature_denied(self):self.assertEqual(self.consume(signature_verified=None),"DENIED")
    def test_wrong_wallet(self):self.assertEqual(self.consume(wallet="attacker"),"MISMATCH")
    def test_wrong_user(self):self.assertEqual(self.consume(user_id="bob"),"MISMATCH")
    def test_wrong_domain(self):self.assertEqual(self.consume(domain="evil.example"),"MISMATCH")
    def test_wrong_chain(self):self.assertEqual(self.consume(chain="solana:mainnet"),"MISMATCH")
    def test_expiry(self):self.assertEqual(self.consume(now=400),"EXPIRED")
    def test_before_issue(self):self.assertEqual(self.consume(now=99),"EXPIRED")
    def test_unknown(self):self.assertEqual(self.consume(nonce="unknown"),"UNKNOWN")
    def test_persistence(self):
        self.store.close()
        self.store=ChallengeStore(self.path)
        self.assertEqual(self.consume(),"CONSUMED")
    def test_cross_connection_replay(self):
        other=ChallengeStore(self.path)
        try:
            self.assertEqual(self.consume(),"CONSUMED")
            self.assertEqual(other.consume_after_verified_signature(nonce=self.nonce,user_id="alice",wallet="wallet1",domain="climboria.fun",chain="solana:devnet",now=110,signature_verified=True),"REPLAY")
        finally:other.close()

if __name__=="__main__":unittest.main()
