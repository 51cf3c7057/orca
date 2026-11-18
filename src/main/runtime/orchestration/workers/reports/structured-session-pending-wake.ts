import { isOrcaSessionId } from '../../../../../shared/agent-session/identity/orca-session-address'
import type { OrcaRuntimeService } from '../../../orca-runtime'
import { getStructuredAgentSessionHost } from '../../../../native-chat/agent-session-wire/host/structured-agent-session-registry'
import { readCreatorRunningDispatches } from '../../db/dispatch-context/dispatch-creator-work'
import { addressableSessionParty } from '../../mailbox/routing/structured-session-mail-address'
import { structuredMailboxCustody } from '../../mailbox/routing/structured-session-mail-target'
import { dispatchReportMailbox } from './dispatch-report-mailbox'
import { readRemoteWorkingDispatches } from './structured-session-remote-wake'

/** Only this session's running work whose report still routes back to it can defer a goal check. */
export async function structuredSessionHasPendingWake(
  runtime: OrcaRuntimeService,
  sessionId: string,
  isCurrent: () => boolean = () => true
): Promise<boolean> {
  const db = runtime.getExistingOrchestrationDb()
  if (!isCurrent() || !db || !isOrcaSessionId(sessionId)) {
    return false
  }
  const party = addressableSessionParty(sessionId, db)
  if (!party) {
    return false
  }
  const reportsHere = (dispatchId: string): boolean => {
    const dispatch = db.getDispatchContextById(dispatchId)
    if (
      !dispatch ||
      dispatch.status !== 'dispatched' ||
      db.awaitsAnswerToLatestQuestion(dispatchId) ||
      dispatch.assignee_orca_session_id === party.orcaSessionId ||
      dispatch.assignee_handle === party.address ||
      (dispatch.creator_orca_session_id !== party.orcaSessionId &&
        !(
          dispatch.creator_orca_session_id === null &&
          party.terminalHandle !== null &&
          dispatch.creator_handle === party.terminalHandle
        ))
    ) {
      return false
    }
    const custody = structuredMailboxCustody(dispatchReportMailbox(db, dispatch), db)
    return typeof custody === 'object' && custody.sessionId === sessionId
  }
  const candidates = readCreatorRunningDispatches(db, party)
  // Local work can prove a wake without waiting for an unrelated execution host.
  const remote = new Map(
    db
      .listFederatedDispatchesByIds(candidates.map((row) => row.id))
      .map((row) => [row.dispatch_id, row])
  )
  const eligible = (dispatchId: string) => {
    const state = db.getWorkerDispatch(dispatchId)?.state
    return isCurrent() && reportsHere(dispatchId) && (!state || state === 'ready')
  }
  const remoteIds: string[] = []
  for (const dispatch of candidates) {
    if (!isCurrent()) {
      return false
    }
    if (!eligible(dispatch.id)) {
      continue
    }
    if (remote.has(dispatch.id)) {
      remoteIds.push(dispatch.id)
      continue
    }
    const custody = structuredMailboxCustody(`dispatch:${dispatch.id}`, db)
    if (typeof custody === 'object') {
      if (
        getStructuredAgentSessionHost()?.readStatusSummary(custody.sessionId)?.status ===
          'working' &&
        eligible(dispatch.id)
      ) {
        return true
      }
    } else {
      const resource = db.getWorkerTerminalResourceByOwner(dispatch.id)
      const pane = resource?.pane_key ?? dispatch.assignee_pane_key
      const incarnation = resource?.process_incarnation ?? dispatch.process_incarnation
      if (
        pane &&
        incarnation &&
        runtime.isOrchestrationWorkerWorking(pane, incarnation) &&
        eligible(dispatch.id)
      ) {
        return true
      }
    }
  }
  if (!isCurrent() || remoteIds.length === 0) {
    return false
  }
  const working = await readRemoteWorkingDispatches(runtime, db, remoteIds, isCurrent)
  return [...working].some(eligible)
}
