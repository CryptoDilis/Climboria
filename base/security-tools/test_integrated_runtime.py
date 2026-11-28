import importlib.util
import json
from pathlib import Path
import unittest
import test_integrated_review as fixtures

spec = importlib.util.spec_from_file_location("runtime_review", Path(__file__).with_name("verify-integrated-runtime.py"))
review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)
digest = review.bundle.digest
encode = review.canonical
addr = fixtures.fixture.addr

class IntegratedRuntimeTests(unittest.TestCase):
    def setUp(self):
        self.f = fixtures.IntegratedReviewTests()
        self.f.setUp()
        self.addCleanup(self.f.temp.cleanup)
        self.f.manifest["schema"] = 3
        intent = self.f.fixture.plan
        self.template = bytes.fromhex("60"+"00"*32+"61"+"00"*32+"62")
        roles = {
            "guard": [(1,"SafeEpochGuardFixture","wallet","contract Safe",intent["safe"]),
                      (2,"SafeReserveGuardFixture","successor","contract V3AtomicSuccessorFixture",intent["successor"])],
            "successor": [(3,"V3QuorumSuccessorFixture","guardFactory","address",addr(40)),
                          (4,"V3AtomicSuccessorFixture","creator","address",addr(41))],
        }
        addresses = {"guard":intent["fields"]["guard"], "successor":intent["successor"]}
        self.output = {"contracts":{review.SOURCE:{}},"sources":{review.SOURCE:{"ast":{"nodes":[]}}}}
        for role, declarations in roles.items():
            refs = {}
            for index,(ident,owner,name,typ,value) in enumerate(declarations):
                refs[str(ident)] = [{"start":1+33*index,"length":32}]
                self.output["sources"][review.SOURCE]["ast"]["nodes"].append({
                    "nodeType":"ContractDefinition","name":owner,"nodes":[{
                    "nodeType":"VariableDeclaration","mutability":"immutable","id":ident,
                    "name":name,"typeDescriptions":{"typeString":typ}}]})
            self.output["contracts"][review.SOURCE][review.CONTRACTS[role]] = {
                "evm":{"deployedBytecode":{"object":self.template.hex(),
                                           "linkReferences":{},"immutableReferences":refs}}}
        compiler = encode(self.output)
        self.f.raw["compiler_output"] = compiler
        header = {"schema":1,"status":"REVIEW_ONLY_NO_GO","chain_id":84532,"source_commit":intent["source_commit"]}
        self.plans = dict(header,contracts={})
        self.observed = dict(header,block_number=self.f.obs["block_number"],block_hash=self.f.obs["block_hash"],contracts={})
        for role, declarations in roles.items():
            words = {str(i):{"owner":o,"name":n,"type":t,"word":int(a,16).to_bytes(32,"big").hex()}
                     for i,o,n,t,a in declarations}
            plan = dict(header,compiler_output_sha256=digest(compiler),source_unit=review.SOURCE,
                        contract=review.CONTRACTS[role],runtime_template_sha256=digest(self.template),immutables=words)
            self.plans["contracts"][role] = {"address":addresses[role],"plan":plan}
            self.observed["contracts"][role] = {"address":addresses[role],"runtime_hex":self.code(role)}
        self.pins = self.write()
    def code(self,role):
        words=self.plans["contracts"][role]["plan"]["immutables"]
        return "60"+list(words.values())[0]["word"]+"61"+list(words.values())[1]["word"]+"62"
    def write(self):
        self.f.raw["runtime_plans"] = encode(self.plans)
        self.f.raw["runtime_observations"] = encode(self.observed)
        return (*self.f.write(),digest(self.f.raw["runtime_plans"]),digest(self.f.raw["runtime_observations"]))
    def verify(self,pins=None):
        return review.verify(self.f.root,*(pins or self.pins),self.f.now)
    def reject(self):
        with self.assertRaises(ValueError):
            self.verify(self.write())
    def test_schema_three_no_go(self):
        r=self.verify()
        self.assertEqual(r["status"],"INTEGRATED_RUNTIME_REVIEW_MATCHES_NO_GO")
        self.assertEqual(r["artifact_count"],14)
        self.assertEqual(set(r["runtime_contracts"]),{"guard","successor"})
        self.assertEqual(r["testnet"],"NO_GO")
        self.assertEqual(r["mainnet"],"NO_GO")
    def test_independent_runtime_plan_pin(self):
        self.plans["contracts"]["guard"]["plan"]["immutables"]["1"]["word"]="00"*12+"12"*20
        pins=self.write()
        with self.assertRaises(ValueError):
            self.verify((pins[0],pins[1],self.pins[2],pins[3]))
    def test_independent_code_observation_pin(self):
        self.observed["contracts"]["guard"]["runtime_hex"]+="00"
        pins=self.write()
        with self.assertRaises(ValueError):
            self.verify((pins[0],pins[1],pins[2],self.pins[3]))
    def test_rehashed_wrong_wallet_even_with_matching_bytes(self):
        self.plans["contracts"]["guard"]["plan"]["immutables"]["1"]["word"]=int(addr(99),16).to_bytes(32,"big").hex()
        self.observed["contracts"]["guard"]["runtime_hex"]=self.code("guard")
        self.reject()
    def test_rehashed_wrong_successor_even_with_matching_bytes(self):
        self.plans["contracts"]["guard"]["plan"]["immutables"]["2"]["word"]=int(addr(99),16).to_bytes(32,"big").hex()
        self.observed["contracts"]["guard"]["runtime_hex"]=self.code("guard")
        self.reject()
    def test_wrong_code_bytes(self):
        self.observed["contracts"]["guard"]["runtime_hex"]=self.code("guard")[:-2]+"63"
        self.reject()
    def test_wrong_code_address(self):
        self.observed["contracts"]["guard"]["address"]=addr(99)
        self.reject()
    def test_wrong_plan_address(self):
        self.plans["contracts"]["successor"]["address"]=addr(99)
        self.reject()
    def test_wrong_block_number(self):
        self.observed["block_number"]+=1
        self.reject()
    def test_wrong_block_hash(self):
        self.observed["block_hash"]="0x"+"c"*64
        self.reject()
    def test_wrong_compiler_output(self):
        self.f.raw["compiler_output"]+=b" "
        self.reject()
    def test_wrong_contract(self):
        self.plans["contracts"]["guard"]["plan"]["contract"]=review.CONTRACTS["successor"]
        self.reject()
    def test_wrong_source(self):
        self.plans["contracts"]["guard"]["plan"]["source_commit"]="c"*40
        self.reject()
    def test_wrong_chain(self):
        self.observed["chain_id"]=8453
        self.reject()
    def test_missing_contract(self):
        del self.observed["contracts"]["successor"]
        self.reject()
    def test_missing_runtime_artifact(self):
        del self.f.raw["runtime_plans"]
        del self.f.manifest["artifacts"]["runtime_plans"]
        (self.f.root/"runtime_plans.bin").unlink()
        with self.assertRaises(ValueError):
            review.verify(self.f.root,*self.f.write(),self.pins[2],self.pins[3],self.f.now)
    def test_schema_downgrade(self):
        self.f.manifest["schema"]=2
        self.reject()
    def test_stale_shared_observation(self):
        self.f.obs["timestamp"]=self.f.now-301
        self.reject()

if __name__=="__main__":
    unittest.main()
