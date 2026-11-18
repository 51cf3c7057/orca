import type { OrcaRuntimeService } from '../../../orca-runtime'
import type { OrchestrationDb } from '../../db/orchestration-db'
import type { DispatchContextRow } from '../../db/orchestration-records'
import { structuredMailboxCustody } from '../../mailbox/routing/structured-session-mail-target'
import { getStructuredAgentSessionHost } from '../../../../native-chat/agent-session-wire/host/structured-agent-session-registry'

export function localDispatchExecuting(
  runtime: Pick<OrcaRuntimeService, 'isOrchestrationWorkerWorking'>,
  db: OrchestrationDb,
  dispatch: DispatchContextRow
): boolean {
  const custody = structuredMailboxCustody(`dispatch:${dispatch.id}`, db)
  if (typeof custody === 'object') {
    return (
      getStructuredAgentSessionHost()?.readStatusSummary(custody.sessionId)?.status === 'working'
    )
  }
  const resource = db.getWorkerTerminalResourceByOwner(dispatch.id)
  const pane = resource?.pane_key ?? dispatch.assignee_pane_key
  const incarnation = resource?.process_incarnation ?? dispatch.process_incarnation
  return !!pane && !!incarnation && runtime.isOrchestrationWorkerWorking(pane, incarnation)
}
