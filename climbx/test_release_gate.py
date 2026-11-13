import unittest
from release_gate import REQUIRED, evaluate

class ReleaseGateTests(unittest.TestCase):
    def test_empty_fails_closed(self):
        self.assertEqual(evaluate({})["decision"], "NO_GO")

    def test_non_mapping_fails_closed(self):
        self.assertEqual(evaluate([])["decision"], "NO_GO")

    def test_partial_evidence_fails_closed(self):
        self.assertEqual(evaluate({"requirements": {
            REQUIRED[0]: {"status": "verified", "evidence_url": "https://example.org/proof", "reviewer": "person"}
        }})["decision"], "NO_GO")

    def test_missing_reviewer_fails_closed(self):
        evidence = {k: {"status": "verified", "evidence_url": "https://example.org/proof", "reviewer": "person"} for k in REQUIRED}
        evidence[REQUIRED[0]]["reviewer"] = ""
        self.assertEqual(evaluate({"requirements": evidence})["decision"], "NO_GO")

    def test_complete_self_report_only_manual_review(self):
        evidence = {k: {"status": "verified", "evidence_url": "https://example.org/proof", "reviewer": "person"} for k in REQUIRED}
        self.assertEqual(evaluate({"requirements": evidence})["decision"], "READY_FOR_MANUAL_REVIEW")

if __name__ == "__main__":
    unittest.main()
