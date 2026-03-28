const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? `Request failed: ${res.status}`)
  }

  return res.json()
}

export const api = {
  // Auth
  register: (data: { email: string; password: string; name: string }) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<{ user: any }>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request<{ user: any }>('/api/auth/me'),
  verify: (token: string) => request<{ message: string }>(`/api/auth/verify?token=${token}`),

  // Decks
  listDecks: () => request<{ decks: any[] }>('/api/decks'),
  createDeck: (data: { name: string; themeId?: string }) =>
    request<{ deck: any }>('/api/decks', { method: 'POST', body: JSON.stringify(data) }),
  getDeck: (id: string) => request<{ deck: any; access: string }>(`/api/decks/${id}`),
  deleteDeck: (id: string) => request(`/api/decks/${id}`, { method: 'DELETE' }),

  // Admin
  listUsers: (status?: string) =>
    request<{ users: any[] }>(`/api/admin/users${status ? `?status=${status}` : ''}`),
  approveUser: (id: string) => request(`/api/admin/users/${id}/approve`, { method: 'POST' }),
  rejectUser: (id: string) => request(`/api/admin/users/${id}/reject`, { method: 'POST' }),
}
