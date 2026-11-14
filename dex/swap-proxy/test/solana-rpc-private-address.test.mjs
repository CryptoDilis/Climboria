import test from "node:test";
import assert from "node:assert/strict";
import { validateRpcUrl } from "../src/solana-rpc.mjs";

test("operator RPC rejects non-public literal IPv4 endpoints", () => {
  for (const address of [
    "10.0.0.1", "127.0.0.1", "0.1.2.3", "100.64.0.1",
    "100.127.255.254", "169.254.169.254", "172.16.1.1",
    "192.168.1.2", "192.0.0.1", "192.0.2.1", "198.18.0.1",
    "198.19.255.254", "198.51.100.1", "203.0.113.10",
    "224.0.0.1", "255.255.255.255", "0x7f000001"
  ]) {
    assert.throws(() => validateRpcUrl("https://" + address + "/rpc"), /public HTTPS endpoint/, address);
  }
});

test("operator RPC rejects IPv4-mapped and link-local IPv6 literals", () => {
  for (const address of [
    "[::ffff:127.0.0.1]", "[::ffff:8.8.8.8]",
    "[fe80::1]", "[fe90::1]", "[fea0::1]", "[feb0::1]",
    "[fc00::1]", "[fd00::1]", "[::1]"
  ]) {
    assert.throws(() => validateRpcUrl("https://" + address + "/rpc"), /public HTTPS endpoint/, address);
  }
});

test("public HTTPS RPC URLs still retain authorized query parameters and strip fragments", () => {
  const url = validateRpcUrl("https://rpc.example.org/rpc?api-key=operator-secret#fragment");
  assert.equal(url.toString(), "https://rpc.example.org/rpc?api-key=operator-secret");
  for (const address of ["8.8.8.8", "100.63.255.254", "100.128.0.1", "[2606:4700:4700::1111]"]) {
    assert.doesNotThrow(() => validateRpcUrl("https://" + address + "/rpc"), address);
  }
});

test("HTTPS, local hostname and inline user credentials remain fail closed", () => {
  for (const url of ["http://rpc.example.org", "https://localhost", "https://service.local",
    "https://user:pass@rpc.example.org", "https://rpc.example.org:8443"]) {
    assert.throws(() => validateRpcUrl(url), /public HTTPS endpoint/);
  }
});
