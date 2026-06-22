/** SHA-256 hex digest of a UTF-8 string (for house seed commitments). */
export async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** CosmWasm Binary JSON: base64 of raw 32-byte hash. */
export async function houseSeedCommitment(text) {
  const hex = await sha256Hex(text);
  const bytes = hex.match(/.{2}/g).map((h) => parseInt(h, 16));
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64;
}
