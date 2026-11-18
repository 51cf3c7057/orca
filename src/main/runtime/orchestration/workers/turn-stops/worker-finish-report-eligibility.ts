import type { OrchestrationDb } from '../../db/orchestration-db'
import { rejectedReportInTurn } from '../../db/messages/rejected-worker-report'
import type { WorkerTurnStopDispatch, WorkerTurnStopReportDeps } from './worker-turn-stop-report'

export function workerFinishReportMuted(
  db: OrchestrationDb,
  target: WorkerTurnStopDispatch,
  turnStartedAt: number | undefined
): boolean {
  const id = target.kind === 'local' ? target.dispatch.id : target.attachment.dispatch_id
  return (
    db.awaitsAnswerToLatestQuestion(id) ||
    rejectedReportInTurn(db, id, turnStartedAt) ||
    (target.kind === 'local' && db.hasOpenHelperDispatch(id))
  )
}

/** A prior report can dedupe the next finish; without its turn boundary, it cannot promise a wake. */
export function canPromiseWorkerFinishReport(
  db: OrchestrationDb,
  target: WorkerTurnStopDispatch,
  deps: Pick<WorkerTurnStopReportDeps, 'isWaitingForMail'>
): boolean {
  const id = target.kind === 'local' ? target.dispatch.id : target.attachment.dispatch_id
  if (deps.isWaitingForMail(`dispatch:${id}`) || workerFinishReportMuted(db, target, undefined)) {
    return false
  }
  if (target.kind === 'remote') {
    return (
      db.db
        .prepare(`SELECT 1 FROM federation_relay_items
      WHERE dispatch_id = ? AND direction = 'to_home' AND kind IN ('escalation', 'worker_done') LIMIT 1`)
        .get(id) === undefined
    )
  }
  return (
    db.db
      .prepare(`SELECT 1 FROM messages
    WHERE json_valid(payload) AND json_extract(payload, '$.dispatchId') = ?
      AND (id GLOB 'msg_stop_*' OR
        (type = 'worker_done' AND json_type(payload, '$._orcaLifecycleRejection.code') IS 'text'))
    LIMIT 1`)
      .get(id) === undefined
  )
}
