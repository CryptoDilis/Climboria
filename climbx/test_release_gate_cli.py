"""CLI integration tests: prove the non-deploying release gate fails closed."""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from release_gate import REQUIRED

SCRIPT = Path(__file__).with_name("release_gate.py")

class ReleaseGateCLITests(unittest.TestCase):
    def run_gate(self, content=None):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "evidence.json"
            if content is not None:
                path.write_text(content, encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--evidence", str(path)],
                capture_output=True, text=True, check=False,
            )
            return result, json.loads(result.stdout)

    def test_missing_file_no_go(self):
        proc, data = self.run_gate()
        self.assertEqual(proc.returncode, 1)
        self.assertEqual(data["decision"], "NO_GO")
        self.assertEqual(len(data["missing"]), len(REQUIRED))

    def test_malformed_json_no_go(self):
        proc, data = self.run_gate("{not json")
        self.assertEqual(proc.returncode, 1)
        self.assertEqual(data["decision"], "NO_GO")

    def test_null_json_no_go(self):
        proc, data = self.run_gate("null")
        self.assertEqual(proc.returncode, 1)
        self.assertEqual(data["decision"], "NO_GO")

    def test_empty_requirements_no_go(self):
        proc, data = self.run_gate('{"requirements": {}}')
        self.assertEqual(proc.returncode, 1)
        self.assertEqual(data["decision"], "NO_GO")

    def test_complete_self_report_manual_review_only(self):
        evidence = {"requirements": {
            key: {"status": "verified", "evidence_url": "https://example.org/proof",
                  "reviewer": "reviewer"} for key in REQUIRED
        }}
        proc, data = self.run_gate(json.dumps(evidence))
        self.assertEqual(proc.returncode, 0)
        self.assertEqual(data["decision"], "READY_FOR_MANUAL_REVIEW")
        self.assertNotIn("DEPLOY", data["decision"])

if __name__ == "__main__":
    unittest.main()
