import { isOrcaSessionId } from '../../../../../shared/agent-session/identity/orca-session-address'
import { ORCHESTRATION_WORKER_TURN_STOP_REPORTS_RUNTIME_CAPABILITY } from '../../../../../shared/orchestration/orchestration-runtime-capabilities'
import { RuntimeStatusSchema } from '../../../../../shared/remote-runtime/session-graph/runtime-session-contracts'
import type { OrcaRuntimeService } from '../../../orca-runtime'
import { projectWorkerListFleet } from '../../../rpc/methods/orchestration/worker/fleet/worker-list-projection'
import { addressableSessionParty } from '../../mailbox/routing/structured-session-mail-address'
import {
  structuredMailboxCustody,
  structuredSessionOwnedMailboxes
} from '../../mailbox/routing/structured-session-mail-target'
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
  const mailboxes = structuredSessionOwnedMailboxes(sessionId, db)
  const runIds = new Set(
    mailboxes.flatMap((mailbox) => {
      if (mailbox.startsWith('run:')) {
        return [mailbox.slice(4)]
      }
      if (!mailbox.startsWith('dispatch:')) {
        return []
      }
      const dispatch = db.getDispatchContextById(mailbox.slice(9))
      return dispatch ? [dispatch.run_id] : []
    })
  )
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
  for (const runId of runIds) {
    for (const dispatchIds of db.listWorkerReportWaitCandidates(runId)) {
      if (!dispatchIds.some(reportsHere)) {
        continue
      }
      const rows = db.listWorkerTerminalResources({ runId, dispatchIds })
      const fleet = await projectWorkerListFleet(runtime, rows, {
        limit: rows.length,
        completeProjection: true,
        includeRemote: true
      })
      for (const worker of fleet.workers) {
        if (
          worker.outcome !== 'in_progress' ||
          worker.nextAction.kind !== 'none' ||
          worker.liveness.verdict !== 'live' ||
          !reportsHere(worker.dispatchId)
        ) {
          continue
        }
        const supervised = db.getWorkerDispatch(worker.dispatchId)
        if (supervised && supervised.state !== 'ready') {
          continue
        }
        const remote = db.listFederatedDispatchesByIds([worker.dispatchId])[0]
        if (remote) {
          const server = await resolvePinnedFederatedServer(runtime, remote)
          const support = await getOrchestrationPeerCapabilityCache(runtime).resolve({
            peerFingerprint: remote.peer_fingerprint,
            expectedRuntimeEpoch: remote.remote_runtime_epoch,
            capability: ORCHESTRATION_WORKER_TURN_STOP_REPORTS_RUNTIME_CAPABILITY,
            probe: async () =>
              RuntimeStatusSchema.parse(
                await runtime.callOrchestrationWorkerServer(
                  server.environmentId,
                  'status.get',
                  undefined,
                  3_000,
                  undefined,
                  { expectedEnvironmentPairingRevision: server.pairingRevision }
                )
              )
          })
          if (!support.supported) {
            continue
          }
        }
        // Projection can await another host; a report or coordinator handoff may have arrived.
        if (
          reportsHere(worker.dispatchId) &&
          (!db.getWorkerDispatch(worker.dispatchId) ||
            db.getWorkerDispatch(worker.dispatchId)?.state === 'ready')
        ) {
          return true
        }
      }
    }
  }
  return false
}
