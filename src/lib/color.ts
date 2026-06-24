const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** Чи рядок — валідний 6-значний hex-колір (напр. #6366f1). */
export function isValidHex(value: string): boolean {
  return HEX_RE.test(value);
}
