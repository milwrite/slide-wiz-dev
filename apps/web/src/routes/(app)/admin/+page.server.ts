import { redirect } from '@sveltejs/kit'
import { base } from '$app/paths'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ fetch }) => {
  const res = await fetch('/api/auth/me', { credentials: 'include' })
  if (!res.ok) {
    throw redirect(303, `${base}/login`)
  }
  const data = await res.json()
  if (data.user?.role !== 'admin') {
    throw redirect(303, `${base}/`)
  }
  return { user: data.user }
}
