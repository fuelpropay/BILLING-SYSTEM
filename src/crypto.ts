const enc = new TextEncoder()
export async function sha256Hex(text: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text)))
  return [...d].map(b => b.toString(16).padStart(2, '0')).join('')
}
