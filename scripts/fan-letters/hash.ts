import { createHash } from 'node:crypto'

export function shortHash(data: Buffer | string): string {
  return createHash('sha256')
    .update(data)
    .digest('hex')
    .slice(0, 8)
}
