import crypto from 'crypto'

/**
 * Create crypto hash using SHA-256.
 * If object includes array fields, those fields are sorted using `.sort()`
 * @param object to hash
 * @returns hash string
 */
export const createObjectDigest = async (object: any) => {
  for (let field in object) {
    if (object[field] instanceof Array) {
      object[field] = object[field].sort()
    }
  }
  const objectAsMessage = JSON.stringify(object)
  return digestMessage(objectAsMessage)
}

async function digestMessage(message: string) {
  const msgUint8 = new TextEncoder().encode(message) // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8) // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer)) // convert buffer to byte array
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('') // convert bytes to hex string
  return hashHex
}
