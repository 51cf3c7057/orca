import type { OrchestrationDb } from '../orchestration-db'
import { workerSentMail } from './dispatch-mail-sender'
import { preparedCoordinatorMailCount } from './prepared-coordinator-mail-count'
import { exposeUtcTimestamp } from '../utc-timestamp'

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null)

/** How much mail from above (its coordinator, or Orca for it) the worker has consumed, in any order.
 *  Mail a worker of the Run sent while its Dispatch was open (this worker's own heartbeats, its helpers'
 *  reports, a sibling's broadcast) does not count, nor does mail it has not taken yet. */
export function readCoordinatorMailCount(db: OrchestrationDb, dispatchId: string): number {
  const prepared = preparedCoordinatorMailCount(db, dispatchId)
  if (prepared !== undefined) {
    return prepared
  }
  // The Dispatch that started this one is its coordinator, so its worker's mail is from above.
  const workers = db.db
    .prepare(
      `SELECT d.id, d.assignee_handle, d.assignee_pane_key, d.created_at, d.completed_at
         FROM dispatch_contexts d JOIN dispatch_contexts own ON own.id = ?
        WHERE d.run_id = own.run_id AND d.id IS NOT own.creator_dispatch_id`
    )
    .all(dispatchId)
    .flatMap((row) => {
      const id = text(row.id)
      const handle = text(row.assignee_handle)
      return id && handle
        ? [
            {
              id,
              assignee_handle: handle,
              assignee_pane_key: text(row.assignee_pane_key),
              createdAt: Date.parse(exposeUtcTimestamp(text(row.created_at)) ?? ''),
              completedAt: Date.parse(text(row.completed_at) ?? '')
            }
          ]
        : []
    })
  const read = db.db
    .prepare(
      'SELECT from_handle, sender_pane_key, created_at FROM messages WHERE to_handle = ? AND read = 1'
    )
    .all(`dispatch:${dispatchId}`)
  return read.filter((message) => !workers.some((worker) => workerSentMail(worker, message))).length
}
