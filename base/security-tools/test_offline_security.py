import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

frozen = load("frozen", "verify-frozen-compiler-evidence.py")
release = load("release", "verify-release-bundle.py")

class FrozenEvidenceTests(unittest.TestCase):
    def test_tampered_zip_rejected_before_parse(self):
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp) / "fake.zip"
            p.write_bytes(b"not trusted")
            with patch.object(frozen.zipfile, "ZipFile") as parser:
                for pin in [frozen.PORTABLE, *(x[0] for x in frozen.PROJECTS.values())]:
                    with self.subTest(pin=pin), self.assertRaisesRegex(ValueError, "unapproved ZIP"):
                        frozen.verified_zip(p, pin)
                parser.assert_not_called()

    def test_invalid_archive_members(self):
        def archive(members):
            result = io.BytesIO()
            with tarfile.open(fileobj=result, mode="w") as t:
                for name, kind in members:
                    m = tarfile.TarInfo(name)
                    m.type = kind
                    if kind == tarfile.REGTYPE:
                        m.size = 1
                        t.addfile(m, io.BytesIO(b"x"))
                    else:
                        m.linkname = "outside"
                        t.addfile(m)
            return result.getvalue()
        for names in [[("../escape", tarfile.REGTYPE)], [("/escape", tarfile.REGTYPE)],
                      [("link", tarfile.SYMTYPE)], [("link", tarfile.LNKTYPE)],
                      [("same", tarfile.REGTYPE), ("same", tarfile.REGTYPE)]]:
            with self.subTest(names=names), self.assertRaises(ValueError):
                frozen.tar_members(archive(names))
        self.assertEqual(frozen.tar_members(archive([("contracts/X.sol", tarfile.REGTYPE)])),
                         {"contracts/X.sol": b"x"})

    def test_wrong_zip_role_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp) / "other.zip"
            p.write_bytes(b"reference A")
            with self.assertRaisesRegex(ValueError, "unapproved ZIP"):
                frozen.verified_zip(p, frozen.digest(b"reference B"))

class ReleaseBundleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.obj = {"schema": 1, "status": release.ALLOWED_STATUS, "chain_id": 84532,
                    "source_commit": "a"*40, "artifacts": {}}
        for role in release.ARTIFACTS:
            name = role + ".txt"
            data = ("SYNTHETIC TEST ONLY " + role).encode()
            (self.root / name).write_bytes(data)
            self.obj["artifacts"][role] = {"file": name, "sha256": release.digest(data)}
        self.pin = self.write()

    def write(self):
        raw = json.dumps(self.obj, sort_keys=True).encode()
        (self.root / "manifest.json").write_bytes(raw)
        return release.digest(raw)

    def reject(self, pin=None):
        with self.assertRaises(ValueError):
            release.verify(self.root, self.pin if pin is None else pin)

    def test_valid_bytes_never_approve(self):
        report = release.verify(self.root, self.pin)
        self.assertEqual(report["artifact_count"], 10)
        self.assertEqual(report["testnet"], "NO_GO")
        self.assertEqual(report["mainnet"], "NO_GO")

    def test_tampered_manifest(self):
        self.obj["source_commit"] = "b"*40
        self.write()
        self.reject()

    def test_tampered_artifact(self):
        (self.root / "compiler.txt").write_bytes(b"tampered")
        self.reject()

    def test_rehashed_attacker_bundle_does_not_match_original_pin(self):
        data = b"tampered"
        (self.root / "compiler.txt").write_bytes(data)
        self.obj["artifacts"]["compiler"]["sha256"] = release.digest(data)
        self.write()
        self.reject()

    def test_missing_artifact(self):
        (self.root / "external_review.txt").unlink()
        self.reject()

    def test_symlink_artifact(self):
        p = self.root / "compiler.txt"
        p.unlink()
        p.symlink_to(self.root / "source_archive.txt")
        self.reject()

    def test_extra_file(self):
        (self.root / "unexpected").touch()
        self.reject()

    def test_wrong_chain_even_with_matching_pin(self):
        self.obj["chain_id"] = 8453
        self.reject(self.write())

    def test_approval_even_with_matching_pin(self):
        self.obj["status"] = "GO"
        self.reject(self.write())

    def test_missing_role_even_with_matching_pin(self):
        del self.obj["artifacts"]["external_review"]
        self.reject(self.write())

    def test_path_escape_even_with_matching_pin(self):
        self.obj["artifacts"]["compiler"]["file"] = "../outside"
        self.reject(self.write())

    def test_duplicate_file_even_with_matching_pin(self):
        self.obj["artifacts"]["compiler"] = self.obj["artifacts"]["source_archive"]
        self.reject(self.write())

    def test_zero_digest(self):
        self.obj["artifacts"]["compiler"]["sha256"] = "0"*64
        self.reject(self.write())

    def test_duplicate_json_key(self):
        raw = b'{"schema":1,"schema":1}'
        (self.root / "manifest.json").write_bytes(raw)
        self.reject(release.digest(raw))

    def test_invalid_schema_type(self):
        self.obj["schema"] = True
        self.reject(self.write())

    def test_nonfinite_json(self):
        raw = b'{"schema":NaN}'
        (self.root / "manifest.json").write_bytes(raw)
        self.reject(release.digest(raw))

if __name__ == "__main__":
    unittest.main()
