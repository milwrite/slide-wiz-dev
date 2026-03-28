import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import type { Session, User } from 'lucia'
import { db } from '../db/index.js'
import { decks, deckAccess, deckLocks, users } from '../db/schema.js'
import { authMiddleware } from '../middleware/auth.js'

type AuthEnv = {
  Variables: {
    user: User
    session: Session
  }
}

const LOCK_TTL_MS = 5 * 60 * 1000 // 5 minutes

const sharing = new Hono<AuthEnv>()

sharing.use('*', authMiddleware)

// ── Sharing ──

// POST /:id/share — Share deck with another user
sharing.post('/:id/share', async (c) => {
  const user = c.get('user')
  const deckId = c.req.param('id')

  // Only owner can share
  const access = await db
    .select()
    .from(deckAccess)
    .where(and(eq(deckAccess.deckId, deckId), eq(deckAccess.userId, user.id)))
    .get()

  if (!access || access.role !== 'owner') {
    return c.json({ error: 'Only the owner can share this deck' }, 403)
  }

  const body = await c.req.json()
  const { email, role } = body

  if (!email || !role || !['editor', 'viewer'].includes(role)) {
    return c.json({ error: 'Valid email and role (editor|viewer) required' }, 400)
  }

  // Find target user by email — must exist and be approved
  const targetUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get()

  if (!targetUser || targetUser.status !== 'approved') {
    return c.json({ error: 'User not found or not approved' }, 404)
  }

  if (targetUser.id === user.id) {
    return c.json({ error: 'Cannot share with yourself' }, 400)
  }

  // Check if already has access
  const existing = await db
    .select()
    .from(deckAccess)
    .where(and(eq(deckAccess.deckId, deckId), eq(deckAccess.userId, targetUser.id)))
    .get()

  if (existing) {
    // Update role
    await db
      .update(deckAccess)
      .set({ role })
      .where(and(eq(deckAccess.deckId, deckId), eq(deckAccess.userId, targetUser.id)))
  } else {
    await db.insert(deckAccess).values({
      deckId,
      userId: targetUser.id,
      role,
    })
  }

  return c.json({ message: 'Deck shared', userId: targetUser.id, name: targetUser.name, email: targetUser.email, role })
})

// DELETE /:id/share/:userId — Remove sharing
sharing.delete('/:id/share/:userId', async (c) => {
  const user = c.get('user')
  const deckId = c.req.param('id')
  const targetUserId = c.req.param('userId')

  // Only owner can remove sharing
  const access = await db
    .select()
    .from(deckAccess)
    .where(and(eq(deckAccess.deckId, deckId), eq(deckAccess.userId, user.id)))
    .get()

  if (!access || access.role !== 'owner') {
    return c.json({ error: 'Only the owner can remove sharing' }, 403)
  }

  // Prevent removing owner access
  const targetAccess = await db
    .select()
    .from(deckAccess)
    .where(and(eq(deckAccess.deckId, deckId), eq(deckAccess.userId, targetUserId)))
    .get()

  if (!targetAccess) {
    return c.json({ error: 'User does not have access to this deck' }, 404)
  }

  if (targetAccess.role === 'owner') {
    return c.json({ error: 'Cannot remove owner access' }, 400)
  }

  await db
    .delete(deckAccess)
    .where(and(eq(deckAccess.deckId, deckId), eq(deckAccess.userId, targetUserId)))

  return c.json({ message: 'Access removed' })
})

// GET /:id/collaborators — List collaborators
sharing.get('/:id/collaborators', async (c) => {
  const user = c.get('user')
  const deckId = c.req.param('id')

  // Must have access to see collaborators
  const access = await db
    .select()
    .from(deckAccess)
    .where(and(eq(deckAccess.deckId, deckId), eq(deckAccess.userId, user.id)))
    .get()

  if (!access) {
    return c.json({ error: 'Not found or no access' }, 404)
  }

  const collaborators = await db
    .select({
      userId: deckAccess.userId,
      role: deckAccess.role,
      name: users.name,
      email: users.email,
    })
    .from(deckAccess)
    .innerJoin(users, eq(deckAccess.userId, users.id))
    .where(eq(deckAccess.deckId, deckId))

  return c.json({ collaborators })
})

// ── Locking ──

// POST /:id/lock — Acquire edit lock
sharing.post('/:id/lock', async (c) => {
  const user = c.get('user')
  const deckId = c.req.param('id')

  // Must have access
  const access = await db
    .select()
    .from(deckAccess)
    .where(and(eq(deckAccess.deckId, deckId), eq(deckAccess.userId, user.id)))
    .get()

  if (!access) {
    return c.json({ error: 'Not found or no access' }, 404)
  }

  const now = new Date()
  const existingLock = await db
    .select()
    .from(deckLocks)
    .where(eq(deckLocks.deckId, deckId))
    .get()

  if (existingLock && existingLock.expiresAt > now) {
    if (existingLock.userId === user.id) {
      // Refresh own lock
      const newExpiry = new Date(now.getTime() + LOCK_TTL_MS)
      await db
        .update(deckLocks)
        .set({ lockedAt: now, expiresAt: newExpiry })
        .where(eq(deckLocks.deckId, deckId))
      return c.json({ locked: true, by: 'you' })
    }
    // Locked by someone else
    return c.json({
      locked: false,
      lockedBy: { name: existingLock.userName, since: existingLock.lockedAt },
    }, 409)
  }

  // No lock or expired — acquire
  const expiresAt = new Date(now.getTime() + LOCK_TTL_MS)

  if (existingLock) {
    // Replace expired lock
    await db
      .update(deckLocks)
      .set({ userId: user.id, userName: user.name, lockedAt: now, expiresAt })
      .where(eq(deckLocks.deckId, deckId))
  } else {
    await db.insert(deckLocks).values({
      deckId,
      userId: user.id,
      userName: user.name,
      lockedAt: now,
      expiresAt,
    })
  }

  return c.json({ locked: true, by: 'you' })
})

// DELETE /:id/lock — Release lock
sharing.delete('/:id/lock', async (c) => {
  const user = c.get('user')
  const deckId = c.req.param('id')

  const lock = await db
    .select()
    .from(deckLocks)
    .where(eq(deckLocks.deckId, deckId))
    .get()

  if (!lock || lock.userId !== user.id) {
    return c.json({ error: 'You do not hold this lock' }, 403)
  }

  await db.delete(deckLocks).where(eq(deckLocks.deckId, deckId))
  return c.json({ message: 'Lock released' })
})

// POST /:id/lock/heartbeat — Refresh lock TTL
sharing.post('/:id/lock/heartbeat', async (c) => {
  const user = c.get('user')
  const deckId = c.req.param('id')

  const lock = await db
    .select()
    .from(deckLocks)
    .where(eq(deckLocks.deckId, deckId))
    .get()

  if (!lock || lock.userId !== user.id) {
    return c.json({ error: 'You do not hold this lock' }, 403)
  }

  const now = new Date()
  const newExpiry = new Date(now.getTime() + LOCK_TTL_MS)

  await db
    .update(deckLocks)
    .set({ expiresAt: newExpiry })
    .where(eq(deckLocks.deckId, deckId))

  return c.json({ locked: true, expiresAt: newExpiry })
})

export default sharing
