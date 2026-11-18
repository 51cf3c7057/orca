import { expect, it } from 'vitest'
import { formatOrcaSessionAddress } from '../../../../../shared/agent-session/identity/orca-session-address'
import { testOrcaSessionId } from '../../../../../shared/agent-session/identity/orca-session-address-test-fixture'
import { structuredSessionHasPendingWake } from './structured-session-pending-wake'
import {
  COORDINATOR,
  PEER_CHAT,
  coordinatorRunAndTask,
  openChat,
  runtime,
  db
} from '../../terminal-authority/structured-sessions/structured-chat-coordinator-mail-rig.test-fixture'

it('defers for the parent’s running work until it settles, never for another session', async () => {
  await openChat(COORDINATOR)
  await openChat(PEER_CHAT)
  const { taskId } = await coordinatorRunAndTask()
  expect(await structuredSessionHasPendingWake(runtime, COORDINATOR)).toBe(false)
  const started = db.createStartingWorkerDispatch({
    creator: { kind: 'session', orcaSessionId: testOrcaSessionId(COORDINATOR) },
    maxDepth: 10,
    taskId,
    startOptions: {}
  })
  db.prepareStartingWorkerAuthority({
    dispatchId: started.dispatch.id,
    handle: formatOrcaSessionAddress(testOrcaSessionId(PEER_CHAT)),
    paneKey: null,
    processIncarnation: 'chat:peer',
    worktreeId: 'workspace-1',
    effects: [],
    setupState: 'not_applicable'
  })
  db.markWorkerDispatchReady(started.dispatch.id)
  expect(await structuredSessionHasPendingWake(runtime, COORDINATOR)).toBe(true)
  expect(await structuredSessionHasPendingWake(runtime, PEER_CHAT)).toBe(false)
  db.completeDispatch(started.dispatch.id)
  expect(await structuredSessionHasPendingWake(runtime, COORDINATOR)).toBe(false)
})
