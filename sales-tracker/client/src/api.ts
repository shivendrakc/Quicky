import type {
  Category,
  CategoryType,
  LeaderboardResponse,
  Order,
  OrderInput,
  StatusFlags,
} from './types'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  getCategories: () => request<Category[]>('/categories'),
  createCategory: (name: string, type: CategoryType) =>
    request<Category>('/categories', { method: 'POST', body: JSON.stringify({ name, type }) }),
  updateCategory: (id: number, updates: Partial<Pick<Category, 'name' | 'position' | 'active'>>) =>
    request<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  createOption: (categoryId: number, value: string) =>
    request(`/categories/${categoryId}/options`, { method: 'POST', body: JSON.stringify({ value }) }),
  updateOption: (categoryId: number, optionId: number, updates: { value?: string; active?: boolean }) =>
    request(`/categories/${categoryId}/options/${optionId}`, { method: 'PUT', body: JSON.stringify(updates) }),

  getOrders: () => request<Order[]>('/orders'),
  getOrder: (id: number) => request<Order>(`/orders/${id}`),
  createOrder: (input: OrderInput) => request<Order>('/orders', { method: 'POST', body: JSON.stringify(input) }),
  updateOrder: (id: number, input: OrderInput) =>
    request<Order>(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteOrder: (id: number) => request<void>(`/orders/${id}`, { method: 'DELETE' }),

  getLeaderboard: (period: string) => request<LeaderboardResponse>(`/leaderboard?period=${period}`),
  getStatusFlags: () => request<StatusFlags>('/status-flags'),
}
