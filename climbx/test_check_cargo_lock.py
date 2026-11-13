import pathlib
import tempfile
import unittest

from check_cargo_lock import inspect

HEADER = 'version = 4\n\n'
PKG = '[[package]]\nname = "demo"\nversion = "1.0.0"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "' + ('a' * 64) + '"\n'

class LockIntegrityTests(unittest.TestCase):
    def check(self, content):
        with tempfile.TemporaryDirectory() as d:
            path = pathlib.Path(d) / 'Cargo.lock'
            path.write_text(content, encoding='utf-8')
            return inspect(path)

    def test_valid_registry_package(self):
        self.assertTrue(self.check(HEADER + PKG)['ok'])

    def test_missing_lockfile_fails_closed(self):
        self.assertFalse(inspect(pathlib.Path('/nonexistent/climbx/Cargo.lock'))['ok'])

    def test_missing_checksum_rejected(self):
        self.assertFalse(self.check(HEADER + PKG.replace('a' * 64, ''))['ok'])

    def test_git_source_rejected(self):
        self.assertFalse(self.check(HEADER + PKG.replace('registry+https://github.com/rust-lang/crates.io-index', 'git+https://example.org/repo'))['ok'])

    def test_duplicate_package_rejected(self):
        self.assertFalse(self.check(HEADER + PKG + '\n' + PKG)['ok'])

    def test_invalid_lockfile_version_rejected(self):
        self.assertFalse(self.check('version = 3\n\n' + PKG)['ok'])

if __name__ == '__main__':
    unittest.main()
