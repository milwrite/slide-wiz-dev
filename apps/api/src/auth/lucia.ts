import { Lucia } from 'lucia'
import { DrizzleSQLiteAdapter } from '@lucia-auth/adapter-drizzle'
import { db } from '../db/index.js'
import { sessions, users } from '../db/schema.js'

const adapter = new DrizzleSQLiteAdapter(db, sessions, users)

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      // httpOnly is hardcoded to true by Lucia internally (core.js)
      // Explicitly asserting here as a defense-in-depth measure
      ...({ httpOnly: true } as Record<string, unknown>),
    },
  },
  getUserAttributes: (attributes) => ({
    email: attributes.email,
    name: attributes.name,
    role: attributes.role,
    status: attributes.status,
    emailVerified: attributes.emailVerified,
  }),
})

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia
    DatabaseUserAttributes: {
      email: string
      name: string
      role: 'admin' | 'editor' | 'viewer'
      status: 'pending' | 'approved' | 'rejected'
      emailVerified: boolean
    }
  }
}
