import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

import test_safe_envelope as fixture

spec = importlib.util.spec_from_file_location("integrated", Path(__file__).with_name("verify-integrated-review.py"))
integrated = importlib.util.module_from_spec(spec)
spec.loader.exec_module(integrated)
bundle = integrated.bundle

class IntegratedReviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.fixture = fixture.SafeEnvelopeTests()
        self.fixture.setUp()
        f = self.fixture
        self.now = f.now
        self.obs = {"schema":1,"status":"REVIEW_ONLY_NO_GO","chain_id":84532,
                    "safe":f.plan["safe"],"guard":f.plan["fields"]["guard"],
                    "block_number":123,"block_hash":"0x"+"b"*64,"timestamp":self.now-1,
                    "nonce":f.nonce,"epoch":1,"owners":f.plan["owners"][:],"threshold":3}
        self.manifest = {"schema":2,"status":"REVIEW_ONLY_NO_GO","chain_id":84532,
                         "source_commit":f.plan["source_commit"],"artifacts":{}}
        self.raw = {role:("SYNTHETIC TEST ONLY "+role).encode() for role in bundle.INTEGRATED_ARTIFACTS}
        self.raw.update(deployment_plan=f.plan_raw, issuance_payload=f.payload,
                        unsigned_envelope=f.inputs()[0])
        self.pin,self.observation_pin = self.write()

    def write(self):
        self.raw["state_observation"] = json.dumps(self.obs,sort_keys=True).encode()
        for role,data in self.raw.items():
            name = role+".bin"
            (self.root/name).write_bytes(data)
            self.manifest["artifacts"][role] = {"file":name,"sha256":bundle.digest(data)}
        raw = json.dumps(self.manifest,sort_keys=True).encode()
        (self.root/"manifest.json").write_bytes(raw)
        return bundle.digest(raw),bundle.digest(self.raw["state_observation"])

    def verify(self,pins=None,**kwargs):
        pin,obs_pin = pins or (self.pin,self.observation_pin)
        return integrated.verify(self.root,pin,obs_pin,self.now,**kwargs)

    def reject_rehashed(self):
        with self.assertRaises(ValueError):
            self.verify(self.write())

    def test_valid_snapshot_never_approves(self):
        r = self.verify()
        self.assertEqual(r["artifact_count"],12)
        self.assertEqual(r["testnet"],"NO_GO")
        self.assertEqual(r["mainnet"],"NO_GO")

    def test_mutated_manifest_rejected(self):
        self.manifest["source_commit"]="c"*40
        self.write()
        with self.assertRaises(ValueError):
            self.verify()

    def test_observation_independent_pin_rejected(self):
        self.obs["block_number"]+=1
        pin,_=self.write()
        with self.assertRaises(ValueError):
            self.verify((pin,self.observation_pin))

    def test_manifest_source_mismatch(self):
        self.manifest["source_commit"]="c"*40
        self.reject_rehashed()

    def test_wrong_nonce(self):
        self.obs["nonce"]+=1
        self.reject_rehashed()

    def test_wrong_epoch(self):
        self.obs["epoch"]+=1
        self.reject_rehashed()

    def test_wrong_safe_or_guard(self):
        for field in ("safe","guard"):
            with self.subTest(field=field):
                old=self.obs[field]
                self.obs[field]=fixture.addr(99)
                self.reject_rehashed()
                self.obs[field]=old

    def test_wrong_owner_set(self):
        self.obs["owners"][0]=fixture.addr(99)
        self.reject_rehashed()

    def test_duplicate_owners(self):
        self.obs["owners"][1]=self.obs["owners"][0]
        self.reject_rehashed()

    def test_wrong_threshold(self):
        self.obs["threshold"]=2
        self.reject_rehashed()

    def test_wrong_chain(self):
        self.obs["chain_id"]=8453
        self.reject_rehashed()

    def test_stale_observation(self):
        self.obs["timestamp"]=self.now-301
        self.reject_rehashed()

    def test_future_observation(self):
        self.obs["timestamp"]=self.now+1
        self.reject_rehashed()

    def test_observation_before_valid_after(self):
        self.obs["timestamp"]=self.now-6
        self.reject_rehashed()

    def test_wrong_block_hash(self):
        self.obs["block_hash"]="0x"+"0"*64
        self.reject_rehashed()

    def test_zero_block(self):
        self.obs["block_number"]=0
        self.reject_rehashed()

    def test_freshness_limit_not_relaxable(self):
        for limit in (0,301,True):
            with self.subTest(limit=limit),self.assertRaises(ValueError):
                self.verify(max_age_seconds=limit)

    def test_rehashed_payload_mismatch(self):
        self.raw["issuance_payload"]+=b"\x00"
        self.reject_rehashed()

    def test_missing_integrated_role(self):
        del self.raw["unsigned_envelope"]
        del self.manifest["artifacts"]["unsigned_envelope"]
        (self.root/"unsigned_envelope.bin").unlink()
        self.reject_rehashed()

    def test_schema_downgrade(self):
        self.manifest["schema"]=1
        self.reject_rehashed()

if __name__=="__main__":
    unittest.main()
