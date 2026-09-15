import type { Order, ReviewStatus } from '../types'

// Status is always computed live, never stored. checked_at wins outright ("clears the line
// regardless of how it got there"), then attention_required is immediate, then age.
export function computeReviewStatus(order: Order, now: Date = new Date()): ReviewStatus {
  if (order.checkedAt) return 'green'
  if (order.attentionRequired) return 'red'
  const hoursSinceLogged = (now.getTime() - new Date(order.loggedAt).getTime()) / (1000 * 60 * 60)
  return hoursSinceLogged >= 24 ? 'yellow' : 'none'
}
