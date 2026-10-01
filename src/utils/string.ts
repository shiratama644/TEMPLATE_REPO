/**
 * String utilities — meaningful library code with branches
 */

export function slugify(input: string): string {
  if (!input) return ""
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function truncate(input: string, maxLength: number, suffix = "..."): string {
  if (typeof input !== "string") throw new TypeError("input must be string")
  if (maxLength < 0) throw new RangeError("maxLength must be >= 0")
  if (input.length <= maxLength) return input
  if (maxLength < suffix.length) return input.slice(0, maxLength)
  return input.slice(0, maxLength - suffix.length) + suffix
}

export function capitalize(input: string): string {
  if (!input) return ""
  return input.charAt(0).toUpperCase() + input.slice(1).toLowerCase()
}

export function camelToKebab(input: string): string {
  if (!input) return ""
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase()
}

export function kebabToCamel(input: string): string {
  if (!input) return ""
  return input.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
}

export function countWords(input: string): number {
  if (!input || !input.trim()) return 0
  return input.trim().split(/\s+/).length
}

export function isBlank(input: string | null | undefined): boolean {
  return !input || input.trim().length === 0
}

export function removeExtraSpaces(input: string): string {
  if (!input) return ""
  return input.replace(/\s+/g, " ").trim()
}

export function extractHashtags(input: string): string[] {
  if (!input) return []
  const matches = input.match(/#[a-zA-Z0-9_]+/g)
  return matches ? matches.map((m) => m.slice(1).toLowerCase()) : []
}

export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email
  // Use indexOf for first @ to match expected behavior for multi-@ (test expects a@b@c.com -> a***@b@c.com)
  const atIdx = email.indexOf("@")
  const local = email.slice(0, atIdx)
  const domain = email.slice(atIdx + 1)
  if (!domain) return email
  if (local.length === 0) return `***@${domain}`
  if (local.length <= 2) return `${local[0]}***@${domain}`
  return `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}@${domain}`
}
