import test from "node:test";
import assert from "node:assert/strict";
import { encodeBase58 } from "../tools/legacy-anchor-idl-account.mjs";
import {
  decodeLaunchpadPoolState,
  decodeTokenAccountBaseLayout,
  deriveProgramAddress,
} from "../tools/raydium-launchlab-account-audit.mjs";

const programId = "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj";
const baseMint = "AydYhVjdXnyLEvdBroRbCoSkVykozfkE5mLo67Bcz7EY";
const quoteMint = "NKEda5nHhNGgjrE9nDdMvaEmkmJ96qqxzBVZEcKmjSg";
const platformConfig = "6BwHHDg3u1854jC8PDLXvR4spTcLNaoBxLJNGC4nTESt";

function decodeBase58(value) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let n = 0n;
  for (const char of value) n = n * 58n + BigInt(alphabet.indexOf(char));
  const hex = n.toString(16).padStart(Math.ceil(n.toString(16).length / 2) * 2, "0");
  const body = n === 0n ? Buffer.alloc(0) : Buffer.from(hex, "hex");
  const zeroes = value.match(/^1*/)[0].length;
  return Buffer.concat([Buffer.alloc(zeroes), body]);
}

function poolStateIdl() {
  const u64 = "u64";
  const fields = [
    ["epoch", u64], ["auth_bump", "u8"], ["status", "u8"],
    ["base_decimals", "u8"], ["quote_decimals", "u8"], ["migrate_type", "u8"],
    ["supply", u64], ["total_base_sell", u64], ["virtual_base", u64], ["virtual_quote", u64],
    ["real_base", u64], ["real_quote", u64], ["total_quote_fund_raising", u64],
    ["quote_protocol_fee", u64], ["platform_fee", u64], ["migrate_fee", u64],
    ["vesting_schedule", { defined: { name: "VestingSchedule" } }],
    ["global_config", "pubkey"], ["platform_config", "pubkey"], ["base_mint", "pubkey"],
    ["quote_mint", "pubkey"], ["base_vault", "pubkey"], ["quote_vault", "pubkey"],
    ["creator", "pubkey"], ["token_program_flag", "u8"],
    ["amm_creator_fee_on", { defined: { name: "AmmCreatorFeeOn" } }],
    ["platform_vesting_share", u64], ["padding", { array: ["u8", 54] }],
  ].map(([name, type]) => ({ name, type }));
  return {
    accounts: [{ name: "PoolState", discriminator: [1, 2, 3, 4, 5, 6, 7, 8] }],
    types: [
      { name: "PoolState", type: { kind: "struct", fields } },
      { name: "VestingSchedule", type: { kind: "struct", fields: [
        { name: "total_locked_amount", type: u64 }, { name: "cliff_period", type: u64 },
        { name: "unlock_period", type: u64 }, { name: "start_time", type: u64 },
        { name: "allocated_share_amount", type: u64 },
      ] } },
      { name: "AmmCreatorFeeOn", type: { kind: "enum", variants: [{ name: "QuoteToken" }, { name: "BothToken" }] } },
    ],
  };
}

test("recognizes the canonical 32-byte Native Loader program owner", () => {
  assert.equal(decodeBase58("NativeLoader1111111111111111111111111111111").length, 32);
});

test("derives candidate LaunchLab pool, authority, event authority and platform fee vault PDAs", () => {
  assert.deepEqual(
    deriveProgramAddress([Buffer.from("pool"), decodeBase58(baseMint), decodeBase58(quoteMint)], programId),
    { address: "9zAS77Nf22XQ9QrFQH7n1hAu2uCZuDuMzEzmwXKFxm7A", bump: 255 },
  );
  assert.deepEqual(
    deriveProgramAddress([Buffer.from("vault_auth_seed")], programId),
    { address: "WLHv2UAZm6z4KyaaELi5pjdbJh6RESMva1Rnn8pJVVh", bump: 250 },
  );
  assert.deepEqual(
    deriveProgramAddress([Buffer.from("__event_authority")], programId),
    { address: "2DPAtwB8L12vrMRExbLuyGnC7n2J5LNoZQSejeQGpwkr", bump: 255 },
  );
  assert.deepEqual(
    deriveProgramAddress([decodeBase58(platformConfig), decodeBase58(quoteMint)], programId),
    { address: "8hBWSL5QYTm2duzdSutVEGBrF6QjX44aXi8WRSrErY3y", bump: 255 },
  );
});

test("decodes LaunchLab PoolState pubkeys from the IDL-defined Borsh layout", () => {
  const idl = poolStateIdl();
  const bytes = Buffer.alloc(429);
  Buffer.from(idl.accounts[0].discriminator).copy(bytes, 0);
  const expected = {
    global_config: Buffer.alloc(32, 0x11),
    platform_config: Buffer.alloc(32, 0x22),
    base_mint: Buffer.alloc(32, 0x33),
    quote_mint: Buffer.alloc(32, 0x44),
    creator: Buffer.alloc(32, 0x55),
  };
  const offsets = { global_config: 141, platform_config: 173, base_mint: 205, quote_mint: 237, creator: 333 };
  for (const [name, value] of Object.entries(expected)) value.copy(bytes, offsets[name]);
  const decoded = decodeLaunchpadPoolState(bytes, idl);
  assert.equal(decoded.fieldOffsets.creator, 333);
  assert.equal(decoded.globalConfig, encodeBase58(expected.global_config));
  assert.equal(decoded.platformConfig, encodeBase58(expected.platform_config));
  assert.equal(decoded.baseMint, encodeBase58(expected.base_mint));
  assert.equal(decoded.quoteMint, encodeBase58(expected.quote_mint));
  assert.equal(decoded.creator, encodeBase58(expected.creator));
});

test("rejects a PoolState discriminator mismatch rather than decoding an untrusted layout", () => {
  const bytes = Buffer.alloc(429);
  assert.throws(() => decodeLaunchpadPoolState(bytes, poolStateIdl()), /discriminator does not match/);
});

test("decodes the SPL Token base account layout when Token-2022 TLV bytes follow it", () => {
  const bytes = Buffer.alloc(181);
  Buffer.alloc(32, 0x61).copy(bytes, 0);
  Buffer.alloc(32, 0x62).copy(bytes, 32);
  bytes.writeBigUInt64LE(123n, 64);
  bytes[108] = 1;
  const decoded = decodeTokenAccountBaseLayout(bytes);
  assert.equal(decoded.dataLength, 181);
  assert.equal(decoded.mint, encodeBase58(Buffer.alloc(32, 0x61)));
  assert.equal(decoded.tokenAuthority, encodeBase58(Buffer.alloc(32, 0x62)));
  assert.equal(decoded.amount, "123");
  assert.equal(decoded.state, "initialized");
  assert.equal(decoded.delegate, null);
  assert.equal(decoded.closeAuthority, null);
});

test("rejects invalid token-account option tags and state values", () => {
  const badOption = Buffer.alloc(165);
  badOption.writeUInt32LE(2, 72);
  assert.throws(() => decodeTokenAccountBaseLayout(badOption), /delegate COption tag/);
  const badState = Buffer.alloc(165);
  badState[108] = 3;
  assert.throws(() => decodeTokenAccountBaseLayout(badState), /state/);
});
