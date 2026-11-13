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


    def test_missing_requirements_container_fails_closed(self):
        self.assertEqual(evaluate({"requirements": None})["decision"], "NO_GO")

    def test_wrong_status_fails_closed(self):
        evidence = {k: {"status": "verified", "evidence_url": "https://example.org/proof", "reviewer": "person"} for k in REQUIRED}
        evidence[REQUIRED[-1]]["status"] = "pending"
        self.assertIn(REQUIRED[-1], evaluate({"requirements": evidence})["missing"])

    def test_missing_evidence_url_fails_closed(self):
        evidence = {k: {"status": "verified", "evidence_url": "https://example.org/proof", "reviewer": "person"} for k in REQUIRED}
        evidence[REQUIRED[1]]["evidence_url"] = " "
        self.assertEqual(evaluate({"requirements": evidence})["decision"], "NO_GO")

    def test_non_string_reviewer_fails_closed(self):
        evidence = {k: {"status": "verified", "evidence_url": "https://example.org/proof", "reviewer": "person"} for k in REQUIRED}
        evidence[REQUIRED[1]]["reviewer"] = 123
        self.assertEqual(evaluate({"requirements": evidence})["decision"], "NO_GO")

    def test_missing_one_requirement_fails_closed(self):
        evidence = {k: {"status": "verified", "evidence_url": "https://example.org/proof", "reviewer": "person"} for k in REQUIRED[:-1]}
        self.assertEqual(evaluate({"requirements": evidence})["missing"], [REQUIRED[-1]])

if __name__ == "__main__":
    unittest.main()
