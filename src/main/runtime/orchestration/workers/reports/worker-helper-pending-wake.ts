import type { OrcaRuntimeService } from '../../../orca-runtime'
import type { DispatchContextRow } from '../../db/orchestration-records'
import { DISPATCH_CONTEXT_COLUMN_LIST } from '../../db/row-column-lists'
import { dispatchReportMailbox } from './dispatch-report-mailbox'
import { localDispatchExecuting } from './worker-dispatch-execution'
import { readRemoteWorkingDispatches } from './structured-session-remote-wake'

/** An idle open helper is not a promise; follow only this worker's remaining wake chain. */
export async function workerHasPendingHelperWake(
  runtime: Pick<
    OrcaRuntimeService,
    | 'getExistingOrchestrationDb'
    | 'isOrchestrationWorkerWorking'
    | 'canPromiseOrchestrationHelperReport'
    | 'canPromiseOrchestrationWorkerWake'
    | 'resolveOrchestrationWorkerServer'
    | 'callOrchestrationWorkerServer'
  >,
  dispatchId: string,
  isCurrent: () => boolean
): Promise<boolean> {
  const db = runtime.getExistingOrchestrationDb()
  if (!db) {
    return false
  }
  let remoteDeadline: number | undefined
  const seen = new Set<string>()
  let remaining = 256
  let finished = false
  const current = () => !finished && isCurrent()
  const visit = async (parentId: string): Promise<boolean> => {
    if (!current() || seen.has(parentId) || remaining <= 0) {
      return false
    }
    seen.add(parentId)
    const parent = db.getDispatchContextById(parentId)
    if (!parent || parent.status !== 'dispatched') {
      return false
    }
    // Unknown wake evidence leaves the ordinary stop reporter responsible for informing the parent.
    const rows = db.db
      .prepare(`SELECT ${DISPATCH_CONTEXT_COLUMN_LIST} FROM dispatch_contexts
      WHERE creator_dispatch_id = ? AND status IN ('pending', 'dispatched') LIMIT ?`)
      .all(parentId, Math.min(remaining, 100) + 1)
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the query uses the complete schema-owned Dispatch projection.
    const helpers = rows as DispatchContextRow[]
    const remote = new Map(
      db.listFederatedDispatchesByIds(helpers.map((h) => h.id)).map((h) => [h.dispatch_id, h])
    )
    const eligible = (id: string) => {
      const helper = db.getDispatchContextById(id)
      const state = db.getWorkerDispatch(id)?.state
      return (
        current() &&
        !!helper &&
        helper.status === 'dispatched' &&
        helper.run_id === parent.run_id &&
        dispatchReportMailbox(db, helper) === `dispatch:${parentId}` &&
        (!state || state === 'ready')
      )
    }
    const remoteIds: string[] = []
    for (const helper of helpers.slice(0, 100)) {
      remaining -= 1
      if (remaining < 0) {
        return false
      }
      if (!current()) {
        return false
      }
      if (!eligible(helper.id)) {
        continue
      }
      if (remote.has(helper.id)) {
        if (runtime.canPromiseOrchestrationWorkerWake({ kind: 'local', dispatch: helper })) {
          remoteIds.push(helper.id)
        }
        continue
      }
      if (localDispatchExecuting(runtime, db, helper) || (await visit(helper.id))) {
        if (
          eligible(helper.id) &&
          (await runtime.canPromiseOrchestrationHelperReport(helper, current)) &&
          eligible(helper.id)
        ) {
          return true
        }
      }
    }
    if (!current() || remoteIds.length === 0) {
      return false
    }
    remoteDeadline ??= Date.now() + 5_000
    const deadline = remoteDeadline
    const remoteCurrent = () => current() && Date.now() < deadline
    const working = await readRemoteWorkingDispatches(
      runtime,
      remoteIds.flatMap((id) => remote.get(id) ?? []),
      remoteCurrent,
      eligible
    )
    return [...working].some(eligible)
  }
  try {
    return await visit(dispatchId)
  } finally {
    finished = true
  }
}
