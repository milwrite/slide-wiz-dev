const CUNY_EMAIL_REGEX = /^.+@.+\.cuny\.edu$/i

export function isValidCunyEmail(email: string): boolean {
  return CUNY_EMAIL_REGEX.test(email)
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
