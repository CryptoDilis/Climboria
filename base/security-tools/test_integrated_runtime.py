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
        singleton = addr(42)
        roles = {
            "guard": [(1,"SafeEpochGuardFixture","wallet","contract Safe",intent["safe"]),
                      (2,"SafeReserveGuardFixture","successor","contract V3AtomicSuccessorFixture",intent["successor"]),
                      (5,"SafeEpochGuardFixture","singleton","address",singleton),
                      (6,"SafeEpochGuardFixture","proxyHash","bytes32",None),
                      (7,"SafeEpochGuardFixture","singletonHash","bytes32",None),
                      (8,"SafeReserveGuardFixture","successorHash","bytes32",None)],
            "successor": [(3,"V3QuorumSuccessorFixture","guardFactory","address",addr(40)),
                          (4,"V3AtomicSuccessorFixture","creator","address",addr(41))],
            "safe": [],
            "singleton": [],
        }
        addresses = {"guard":intent["fields"]["guard"], "successor":intent["successor"],
                     "safe":intent["safe"],"singleton":singleton}
        self.output = {"contracts":{},"sources":{}}
        self.templates = {}
        for role, declarations in roles.items():
            source, contract = review.CONTRACTS[role]
            refs = {}
            nodes = self.output["sources"].setdefault(source,{"ast":{"nodes":[]}})["ast"]["nodes"]
            template = bytes([0x60])+b"".join(bytes(32)+bytes([0x61+i]) for i in range(len(declarations)))+bytes([0x70+list(roles).index(role)])
            self.templates[role] = template
            for index,(ident,owner,name,typ,value) in enumerate(declarations):
                refs[str(ident)] = [{"start":1+33*index,"length":32}]
                nodes.append({"nodeType":"ContractDefinition","name":owner,"nodes":[{
                    "nodeType":"VariableDeclaration","mutability":"immutable","id":ident,
                    "name":name,"typeDescriptions":{"typeString":typ}}]})
            self.output["contracts"].setdefault(source,{})[contract] = {
                "evm":{"deployedBytecode":{"object":template.hex(),
                                           "linkReferences":{},"immutableReferences":refs}}}
        compiler = encode(self.output)
        self.f.raw["compiler_output"] = compiler
        header = {"schema":1,"status":"REVIEW_ONLY_NO_GO","chain_id":84532,"source_commit":intent["source_commit"]}
        self.plans = dict(header,contracts={})
        self.observed = dict(header,block_number=self.f.obs["block_number"],block_hash=self.f.obs["block_hash"],
                             safe_slot0=int(singleton,16).to_bytes(32,"big").hex(),contracts={})
        for role, declarations in roles.items():
            source, contract = review.CONTRACTS[role]
            words = {str(i):{"owner":o,"name":n,"type":t,"word":int(a,16).to_bytes(32,"big").hex() if a else "00"*32}
                     for i,o,n,t,a in declarations}
            plan = dict(header,compiler_output_sha256=digest(compiler),source_unit=source,
                        contract=contract,runtime_template_sha256=digest(self.templates[role]),immutables=words)
            self.plans["contracts"][role] = {"address":addresses[role],"plan":plan}
        for role in ("safe","singleton","successor"):
            self.observed["contracts"][role] = {"address":addresses[role],"runtime_hex":self.code(role)}
        for ident, role in (("6","safe"),("7","singleton"),("8","successor")):
            self.plans["contracts"]["guard"]["plan"]["immutables"][ident]["word"] = review.evm_keccak(bytes.fromhex(self.code(role)))
        self.observed["contracts"]["guard"] = {"address":addresses["guard"],"runtime_hex":self.code("guard")}
        self.pins = self.write()
    def code(self,role):
        words=self.plans["contracts"][role]["plan"]["immutables"]
        source, contract = review.CONTRACTS[role]
        refs = self.output["contracts"][source][contract]["evm"]["deployedBytecode"]["immutableReferences"]
        code = bytearray(self.templates[role])
        for ident, ranges in refs.items():
            for ref in ranges:
                offset=ref["start"]
                code[offset:offset+32]=bytes.fromhex(words[ident]["word"])
        return code.hex()
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
        self.assertEqual(set(r["runtime_contracts"]),{"guard","successor","safe","singleton"})
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
        self.plans["contracts"]["guard"]["plan"]["contract"]=review.CONTRACTS["successor"][1]
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
    def test_keccak_known_vectors(self):
        self.assertEqual(review.evm_keccak(b""),"c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470")
        self.assertEqual(review.evm_keccak(b"abc"),"4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45")
    def test_wrong_safe_mastercopy_slot(self):
        self.observed["safe_slot0"]=int(addr(99),16).to_bytes(32,"big").hex()
        self.reject()
    def test_noncanonical_safe_mastercopy_slot(self):
        self.observed["safe_slot0"]="01"+self.observed["safe_slot0"][2:]
        self.reject()
    def test_rehashed_wrong_codehash_even_with_matching_guard_bytes(self):
        for ident in ("6","7","8"):
            with self.subTest(ident=ident):
                word=self.plans["contracts"]["guard"]["plan"]["immutables"][ident]
                old=word["word"]
                word["word"]="ab"*32
                self.observed["contracts"]["guard"]["runtime_hex"]=self.code("guard")
                self.reject()
                word["word"]=old
                self.observed["contracts"]["guard"]["runtime_hex"]=self.code("guard")
    def test_missing_singleton_runtime(self):
        del self.observed["contracts"]["singleton"]
        self.reject()
    def test_wrong_singleton_address(self):
        self.observed["contracts"]["singleton"]["address"]=addr(99)
        self.reject()
    def test_wrong_safe_proxy_bytes(self):
        self.observed["contracts"]["safe"]["runtime_hex"]+="00"
        self.reject()
    def test_stale_shared_observation(self):
        self.f.obs["timestamp"]=self.f.now-301
        self.reject()

if __name__=="__main__":
    unittest.main()
