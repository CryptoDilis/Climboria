import copy
import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("runtime", Path(__file__).with_name("verify-runtime-identity.py"))
runtime = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runtime)
digest = runtime.bundle.digest
encode = lambda value: json.dumps(value, sort_keys=True).encode()
word = lambda n: n.to_bytes(32, "big").hex()

class RuntimeIdentityTests(unittest.TestCase):
    def setUp(self):
        self.template = b"\x60"+bytes(32)+b"\x61"+bytes(32)+b"\x62"+bytes(32)+b"\x63"+bytes(32)+b"\x64"
        self.deployed = {"object":self.template.hex(), "linkReferences":{},
                         "immutableReferences":{"1":[{"start":1,"length":32},{"start":67,"length":32}],
                                                "2":[{"start":34,"length":32}],
                                                "3":[{"start":100,"length":32}]}}
        declarations = [{"nodeType":"VariableDeclaration","mutability":"immutable","id":i,
                         "name":name,"typeDescriptions":{"typeString":typ}}
                        for i,name,typ in [(1,"wallet","address"),(2,"singleton","contract Safe"),(3,"codeHash","bytes32")]]
        self.output = {"contracts":{"src/Guard.sol":{"Guard":{"evm":{"deployedBytecode":self.deployed}}}},
                       "sources":{"src/Guard.sol":{"ast":{"nodeType":"ContractDefinition","name":"Guard","nodes":declarations}}}}
        self.plan = {"schema":1,"status":"REVIEW_ONLY_NO_GO","chain_id":84532,"source_commit":"a"*40,
                     "source_unit":"src/Guard.sol","contract":"Guard","runtime_template_sha256":digest(self.template),
                     "immutables":{str(i):{"owner":"Guard","name":name,"type":typ,"word":word(n)}
                                   for i,name,typ,n in [(1,"wallet","address",11),(2,"singleton","contract Safe",22),
                                                         (3,"codeHash","bytes32",33)]}}
        self.code = b"\x60"+bytes.fromhex(word(11))+b"\x61"+bytes.fromhex(word(22))+b"\x62"+bytes.fromhex(word(11))+b"\x63"+bytes.fromhex(word(33))+b"\x64"
    def args(self):
        output = encode(self.output)
        self.plan["compiler_output_sha256"] = digest(output)
        plan = encode(self.plan)
        return plan,output,self.code,digest(plan)
    def reject(self):
        with self.assertRaises(ValueError):
            runtime.verify(*self.args())
    def test_exact_roles_match_no_go(self):
        r=runtime.verify(*self.args())
        self.assertEqual(r["immutable_groups"],3)
        self.assertEqual(r["testnet"],"NO_GO")
        self.assertEqual(r["mainnet"],"NO_GO")
    def test_swapped_addresses_even_with_same_set(self):
        self.code=b"\x60"+bytes.fromhex(word(22))+b"\x61"+bytes.fromhex(word(11))+b"\x62"+bytes.fromhex(word(22))+b"\x63"+bytes.fromhex(word(33))+b"\x64"
        self.reject()
    def test_repeated_group_mismatch(self):
        self.code=self.code[:67]+bytes.fromhex(word(22))+self.code[99:]
        self.reject()
    def test_wrong_hash_word(self):
        self.code=self.code[:100]+bytes.fromhex(word(34))+self.code[132:]
        self.reject()
    def test_changed_opcode(self):
        self.code=self.code[:-1]+b"\x65"
        self.reject()
    def test_truncated_runtime(self):
        self.code=self.code[:-1]
        self.reject()
    def test_swapped_role_label(self):
        self.plan["immutables"]["1"]["name"]="singleton"
        self.reject()
    def test_missing_group(self):
        del self.plan["immutables"]["3"]
        self.reject()
    def test_overlapping_ranges(self):
        self.deployed["immutableReferences"]["2"][0]["start"]=1
        self.reject()
    def test_nonzero_template_slot(self):
        t=bytearray(self.template);t[1]=1
        self.deployed["object"]=t.hex()
        self.plan["runtime_template_sha256"]=digest(t)
        self.reject()
    def test_unresolved_links(self):
        self.deployed["linkReferences"]={"src/Lib.sol":{"Lib":[{"start":1,"length":20}]}}
        self.reject()
    def test_wrong_contract(self):
        self.plan["contract"]="Other"
        self.reject()
    def test_unresolved_ast(self):
        self.output["sources"]={}
        self.reject()
    def test_bad_address_padding(self):
        self.plan["immutables"]["1"]["word"]="01"+"00"*31
        self.reject()
    def test_wrong_chain(self):
        self.plan["chain_id"]=8453
        self.reject()
    def test_tampered_compiler_output(self):
        p,o,c,h=self.args()
        with self.assertRaises(ValueError):
            runtime.verify(p,o+b" ",c,h)
    def test_tampered_plan_pin(self):
        p,o,c,h=self.args()
        with self.assertRaises(ValueError):
            runtime.verify(p+b" ",o,c,h)
    def test_rehashed_plan_does_not_match_original_pin(self):
        p,o,c,h=self.args()
        self.plan["immutables"]["1"]["word"]=word(99)
        p2,o2,c2,h2=self.args()
        with self.assertRaises(ValueError):
            runtime.verify(p2,o2,c2,h)
    def test_approval_not_supported(self):
        self.plan["status"]="GO"
        self.reject()

if __name__=="__main__":
    unittest.main()
