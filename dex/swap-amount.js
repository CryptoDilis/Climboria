/* Exact human-readable Solana token amounts -> raw base-unit integer strings.
 * Keep this browser-only utility separate from wallet signing and transaction logic.
 * Never multiply user-entered decimal values through IEEE-754 Number. */
(function (global) {
  'use strict';
  const MAX_U64 = 18446744073709551615n;
  function toRaw(value, decimals) {
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18)
      throw new Error('Token decimals are not supported.');
    const input = String(value ?? '').trim();
    const match = /^(0|[1-9][0-9]*)(?:\.([0-9]+))?$/.exec(input);
    if (!match) throw new Error('Enter a positive amount using ordinary decimal digits.');
    const whole = match[1];
    const fraction = match[2] || '';
    if (fraction.length > decimals && /[1-9]/.test(fraction.slice(decimals)))
      throw new Error('Amount has more than ' + decimals + ' token decimal places.');
    const units = BigInt(whole) * (10n ** BigInt(decimals))
      + BigInt(fraction.slice(0, decimals).padEnd(decimals, '0') || '0');
    if (units === 0n) throw new Error('Amount is too small for this token.');
    if (units > MAX_U64) throw new Error('Amount exceeds the Solana token limit.');
    return units.toString();
  }
  // Never render a raw on-chain amount through Number: a Solana u64 can
  // exceed JavaScript's safe integer range and silently change the amount a
  // trader sees. This formatter is intentionally exact and returns a plain
  // decimal string rather than a locale-rounded display value.
  function formatRaw(value, decimals) {
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18)
      throw new Error('Token decimals are not supported.');
    const raw = String(value ?? '');
    if (!/^(?:0|[1-9][0-9]{0,19})$/.test(raw))
      throw new Error('Raw token amount must be an unsigned integer string.');
    const units = BigInt(raw);
    if (units > MAX_U64) throw new Error('Amount exceeds the Solana token limit.');
    if (decimals === 0) return units.toString();
    const digits = units.toString().padStart(decimals + 1, '0');
    const whole = digits.slice(0, -decimals);
    const fraction = digits.slice(-decimals).replace(/0+$/, '');
    return fraction ? whole + '.' + fraction : whole;
  }
  global.ClimboriaSwapAmount = Object.freeze({ toRaw, formatRaw });
})(window);
