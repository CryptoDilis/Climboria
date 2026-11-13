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
  global.ClimboriaSwapAmount = Object.freeze({ toRaw });
})(window);
