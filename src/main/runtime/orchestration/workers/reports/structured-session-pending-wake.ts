import { isOrcaSessionId } from '../../../../../shared/agent-session/identity/orca-session-address'
import { ORCHESTRATION_WORKER_TURN_STOP_REPORTS_RUNTIME_CAPABILITY } from '../../../../../shared/orchestration/orchestration-runtime-capabilities'
import type { RuntimeStatus } from '../../../../../shared/remote-runtime/session-graph/runtime-session-contracts'
import type { OrcaRuntimeService } from '../../../orca-runtime'
import { inspectWorkerTerminal } from '../../../rpc/methods/orchestration/worker/observation/worker-observation'
import { getStructuredAgentSessionHost } from '../../../../native-chat/agent-session-wire/host/structured-agent-session-registry'
import { readCreatorRunningDispatches } from '../../db/dispatch-context/dispatch-creator-work'
import { addressableSessionParty } from '../../mailbox/routing/structured-session-mail-address'
import { structuredMailboxCustody } from '../../mailbox/routing/structured-session-mail-target'
import { dispatchReportMailbox } from './dispatch-report-mailbox'
import { getOrchestrationPeerCapabilityCache } from '../../federation/orchestration-peer-capability-cache'
import { resolvePinnedFederatedServer } from '../../legacy-remote-home/pinned-federated-server'

/** Only this session's running work whose report still routes back to it can defer a goal check. */
export async function structuredSessionHasPendingWake(
  runtime: OrcaRuntimeService,
  sessionId: string
): Promise<boolean> {
  const db = runtime.getExistingOrchestrationDb()
  if (!db || !isOrcaSessionId(sessionId)) {
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
  for (const dispatch of [
    ...candidates.filter((row) => !remote.has(row.id)),
    ...candidates.filter((row) => remote.has(row.id))
  ]) {
    if (!reportsHere(dispatch.id)) {
      continue
    }
    const supervised = db.getWorkerDispatch(dispatch.id)
    if (supervised && supervised.state !== 'ready') {
      continue
    }
    try {
      const federated = remote.get(dispatch.id)
      let working = false
      if (federated) {
        const server = await resolvePinnedFederatedServer(runtime, federated)
        const support = await getOrchestrationPeerCapabilityCache(runtime).resolve({
          peerFingerprint: federated.peer_fingerprint,
          expectedRuntimeEpoch: federated.remote_runtime_epoch,
          capability: ORCHESTRATION_WORKER_TURN_STOP_REPORTS_RUNTIME_CAPABILITY,
          probe: async () => {
            const status = await runtime.callOrchestrationWorkerServer(
              server.environmentId,
              'status.get',
              undefined,
              3_000,
              undefined,
              { expectedEnvironmentPairingRevision: server.pairingRevision }
            )
            // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: status.get returns the paired host's RuntimeStatus protocol.
            return status as RuntimeStatus
          }
        })
        if (!support.supported) {
          continue
        }
        const observed = await runtime.callOrchestrationWorkerServer(
          server.environmentId,
          'orchestration.federationShow',
          { dispatchId: dispatch.id },
          3_000,
          undefined,
          { expectedEnvironmentPairingRevision: server.pairingRevision }
        )
        // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the paired host owns the federationShow observation; older hosts omit working.
        const result = observed as {
          observation?: { status?: string; exactWorker?: boolean; working?: boolean }
        }
        working =
          result.observation?.status === 'live' &&
          result.observation.exactWorker === true &&
          result.observation.working === true
      } else {
        const custody = structuredMailboxCustody(`dispatch:${dispatch.id}`, db)
        if (typeof custody === 'object') {
          working =
            getStructuredAgentSessionHost()?.readStatusSummary(custody.sessionId)?.status ===
            'working'
        } else if (dispatch.assignee_handle) {
          const observation = await inspectWorkerTerminal(runtime, db, dispatch.id)
          if (observation.exact && observation.status === 'live' && observation.terminalHandle) {
            const activity = await runtime.getTerminalAgentStatus(observation.terminalHandle)
            working = activity.isRunningAgent && activity.status === 'working'
          }
        }
      }
      // A report or coordinator handoff can arrive during a host observation.
      if (
        working &&
        reportsHere(dispatch.id) &&
        (!supervised || db.getWorkerDispatch(dispatch.id)?.state === 'ready')
      ) {
        return true
      }
    } catch {
      // One unavailable worker cannot hide another worker's promised report.
      continue
    }
  }
  return false
}
