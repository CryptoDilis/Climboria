import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { deriveLockProgramAddresses, validateLockProgramIdl } from "./launchlab-lock-idl-check.mjs";
const require = createRequire("/tmp/launchlab-tools/package.json");
const { PublicKey } = require("@solana/web3.js");
const target = {
  id: "LockrWmn6K5twhz3y9w1dQERbmgSaRkfnTeTKbpofwE",
  authority: "3f7GcQFG397GAaEnv51zR6tsTVihYRydnydDD1cXekxH",
};
const lockNames = ["authority","payer","liquidityOwner","feeNftOwner","feeNftMint","feeNftAccount","poolState","lockedLiquidity","lpMint","liquidityOwnerLp","lockedLpVault","token0Vault","token1Vault","metadataAccount","rent","systemProgram","tokenProgram","associatedTokenProgram","metadataProgram"];
const collectNames = ["authority","feeNftOwner","feeNftAccount","lockedLiquidity","cpSwapProgram","cpAuthority","poolState","lpMint","recipientToken0Account","recipientToken1Account","token0Vault","token1Vault","vault0Mint","vault1Mint","lockedLpVault","tokenProgram","tokenProgram2022","memoProgram"];
const lockFlags = [[false,false],[true,true],[true,false],[false,false],[true,true],[false,true],[false,false],[false,true],[false,false],[false,true],[false,true],[false,true],[false,true],[false,true],[false,false],[false,false],[false,false],[false,false],[false,false]];
const collectFlags = [[false,false],[true,false],[false,true],[false,true],[false,false],[false,false],[false,true],[false,true],[false,true],[false,true],[false,true],[false,true],[false,false],[false,false],[false,true],[false,false],[false,false],[false,false]];
const makeAccounts = (names, flags) => names.map((name, i) => ({ name, signer: flags[i][0], writable: flags[i][1] }));
function fixture() {
  const lock = {
    name: "lockCpLiquidity",
    discriminator: [216,157,29,78,38,51,31,26],
    accounts: makeAccounts(lockNames, lockFlags).map(account => {
      if (account.name === "authority") account.pda = { seeds: [{ kind: "const", value: [...Buffer.from("lock_cp_authority_seed")] }] };
      if (account.name === "lockedLiquidity") account.pda = { seeds: [{ kind: "const", value: [...Buffer.from("locked_liquidity")] }, { kind: "account", path: "feeNftMint" }] };
      return account;
    }),
    args: [{ name: "lpAmount", type: "u64" }, { name: "withMetadata", type: "bool" }],
  };
  const collect = {
    name: "collectCpFees",
    discriminator: [8,30,51,199,209,184,247,133],
    accounts: makeAccounts(collectNames, collectFlags),
    args: [{ name: "lpFeeAmount", type: "u64" }],
  };
  return { address: target.id, metadata: { name: "raydium_liquidity_locking" }, instructions: [lock, collect] };
}
test("validates live-style CPMM LP lock and fee collection schemas against pinned SDK account order", () => {
  const result = validateLockProgramIdl(fixture(), target, PublicKey);
  assert.equal(result.lockAuthority, target.authority);
  assert.equal(result.lockCpLiquidity.accounts.length, 19);
  assert.equal(result.collectCpFees.accounts.length, 18);
  assert.match(result.lockLpVaultDerivation, /Associated Token Account PDA/);
});
test("accepts legacy Anchor isSigner/isMut account privilege fields", () => {
  const idl = fixture();
  for (const instruction of idl.instructions) {
    for (const account of instruction.accounts) {
      account.isSigner = account.signer;
      account.isMut = account.writable;
      delete account.signer;
      delete account.writable;
    }
  }
  assert.equal(validateLockProgramIdl(idl, target, PublicKey).lockCpLiquidity.accounts.length, 19);
});
test("rejects LP lock account reordering", () => {
  const idl = fixture();
  [idl.instructions[0].accounts[1], idl.instructions[0].accounts[2]] = [idl.instructions[0].accounts[2], idl.instructions[0].accounts[1]];
  assert.throws(() => validateLockProgramIdl(idl, target, PublicKey), /account order mismatch/);
});
test("rejects LP lock signer privilege escalation", () => {
  const idl = fixture();
  idl.instructions[0].accounts[3].signer = true;
  assert.throws(() => validateLockProgramIdl(idl, target, PublicKey), /signer\/writable flags mismatch/);
});
test("rejects changed lock authority PDA seed", () => {
  const idl = fixture();
  idl.instructions[0].accounts[0].pda.seeds[0].value = [...Buffer.from("wrong_seed")];
  assert.throws(() => validateLockProgramIdl(idl, target, PublicKey), /authority PDA seed differs/);
});
test("derives distinct locked LP ATAs for different CPMM LP mints", () => {
  const a = deriveLockProgramAddresses({ programId: target.id, lpMint: "So11111111111111111111111111111111111111112", PublicKey });
  const b = deriveLockProgramAddresses({ programId: target.id, lpMint: "11111111111111111111111111111112", PublicKey });
  assert.equal(a.authority, target.authority);
  assert.notEqual(a.lockedLiquidity, b.lockedLiquidity);
  assert.notEqual(a.lockLpVault, b.lockLpVault);
});
