// Server-side Solana Ed25519 message verification. Node.js built-ins only.
// Caller must fetch canonical challenge bytes from trusted DB; never accept a
// client-provided 'signature_verified' flag or arbitrary challenge message.
const { createPublicKey, verify } = require('node:crypto');

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function decodeBase58(input) {
  if (typeof input !== 'string' || !input.length || input.length > 128) throw new Error('invalid base58');
  let n = 0n;
  for (const char of input) {
    const digit = ALPHABET.indexOf(char);
    if (digit < 0) throw new Error('invalid base58');
    n = n * 58n + BigInt(digit);
  }
  const bytes = [];
  while (n > 0n) { bytes.unshift(Number(n & 255n)); n >>= 8n; }
  const zeros = input.match(/^1*/)[0].length;
  return Buffer.from([...Array(zeros).fill(0), ...bytes]);
}
function verifySolanaMessage({ wallet, message, signature }) {
  try {
    if (typeof message !== 'string' || !message.startsWith('CLIMBX wallet ownership verification\n')) return false;
    const pubkey = decodeBase58(wallet);
    const sig = decodeBase58(signature);
    if (pubkey.length !== 32 || sig.length !== 64) return false;
    // RFC8410 Ed25519 SubjectPublicKeyInfo prefix.
    const spki = Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),pubkey]);
    const key = createPublicKey({key:spki,format:'der',type:'spki'});
    return verify(null,Buffer.from(message,'utf8'),key,sig);
  } catch { return false; }
}
module.exports = { decodeBase58, verifySolanaMessage };
