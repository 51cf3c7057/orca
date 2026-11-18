import { isDispatchAssignee } from '../dispatch-context/dispatch-lookup'
import { exposeUtcTimestamp } from '../utc-timestamp'

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null)

export function workerSentMail(
  worker: {
    id: string
    assignee_handle: string
    assignee_pane_key: string | null
    createdAt: number
    completedAt: number
  },
  message: { from_handle?: unknown; sender_pane_key?: unknown; created_at?: unknown }
): boolean {
  const from = text(message.from_handle) ?? ''
  const sentAt = Date.parse(exposeUtcTimestamp(text(message.created_at)) ?? '')
  return (
    sentAt >= worker.createdAt &&
    (Number.isNaN(worker.completedAt) || sentAt <= worker.completedAt) &&
    (from === `dispatch:${worker.id}` ||
      isDispatchAssignee(worker, from, text(message.sender_pane_key)))
  )
}
