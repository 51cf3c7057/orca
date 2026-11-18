import type { OrchestrationDb } from '../orchestration-db'
import type { DispatchContextRow } from '../orchestration-records'
import type { OrchestrationSessionParty } from '../../addressing/orchestration-party'
import { DISPATCH_CONTEXT_COLUMN_LIST } from '../row-column-lists'

/** Seek only the creator's dispatched work; settled history and other creators stay off the Stop path. */
export function readCreatorRunningDispatches(
  db: OrchestrationDb,
  party: Pick<OrchestrationSessionParty, 'orcaSessionId' | 'terminalHandle'>
): DispatchContextRow[] {
  const rows = db.db
    .prepare(`SELECT ${DISPATCH_CONTEXT_COLUMN_LIST} FROM dispatch_contexts
    WHERE creator_orca_session_id = ? AND status = 'dispatched'
    UNION ALL SELECT ${DISPATCH_CONTEXT_COLUMN_LIST} FROM dispatch_contexts
    WHERE creator_orca_session_id IS NULL AND creator_handle = ? AND status = 'dispatched'`)
    .all(party.orcaSessionId, party.terminalHandle)
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: both branches select the schema-owned complete Dispatch projection.
  return rows as DispatchContextRow[]
}
