import { expect, it, vi } from 'vitest'
import { readRemoteWorkingDispatches } from './structured-session-remote-wake'
import { getOrchestrationPeerCapabilityCache } from '../../federation/orchestration-peer-capability-cache'
import { ORCHESTRATION_WORKER_WAKE_OBSERVATION_RUNTIME_CAPABILITY } from '../../../../../shared/orchestration/orchestration-runtime-capabilities'
import type { FederatedDispatchRow } from '../../db/orchestration-records'
import {
  runtime,
  db
} from '../../terminal-authority/structured-sessions/structured-chat-coordinator-mail-rig.test-fixture'

function remoteWorkers(count: number) {
  const rows: FederatedDispatchRow[] = Array.from({ length: count }, (_, i) => ({
    dispatch_id: `remote-${i}`,
    environment_id: 'host',
    environment_name: 'Host',
    peer_fingerprint: 'peer',
    remote_runtime_epoch: 'epoch',
    protocol_version: 1,
    remote_worktree_id: null,
    remote_terminal_handle: null,
    to_home_imported_sequence: 0,
    to_home_acknowledged_sequence: 0,
    home_auto_release_at: null,
    home_auto_release_state: null,
    created_at: '2026-11-17',
    updated_at: '2026-11-17'
  }))
  vi.spyOn(db, 'listFederatedDispatchesByIds').mockImplementation((ids) =>
    rows.filter((row) => ids.includes(row.dispatch_id))
  )
  vi.spyOn(runtime, 'resolveOrchestrationWorkerServer').mockResolvedValue({
    environmentId: 'host',
    name: 'Host',
    peerFingerprint: 'peer',
    pairingRevision: 1
  })
  getOrchestrationPeerCapabilityCache(runtime).remember(
    'peer',
    'epoch',
    ORCHESTRATION_WORKER_WAKE_OBSERVATION_RUNTIME_CAPABILITY,
    true
  )
  return rows.map((row) => row.dispatch_id)
}

it.each([
  [20, 1],
  [200, 2]
])('batches %i remote workers into %i observations', async (count, calls) => {
  const ids = remoteWorkers(count)
  const call = vi
    .spyOn(runtime, 'callOrchestrationWorkerServer')
    .mockImplementation(async (_server, method, params) => {
      expect(method).toBe('orchestration.federationFleetSnapshot')
      expect(params).toMatchObject({ workingOnly: true })
      return {
        items: [{ dispatchId: 'remote-0', observation: { exactWorker: true, working: true } }]
      }
    })
  expect(await readRemoteWorkingDispatches(runtime, db, ids, () => true)).toEqual(
    new Set(['remote-0'])
  )
  expect(call).toHaveBeenCalledTimes(calls)
})

it('admits no more host work after cancellation and lets a successor progress', async () => {
  const ids = remoteWorkers(1_000)
  let current = true
  const releases: (() => void)[] = []
  const call = vi.spyOn(runtime, 'callOrchestrationWorkerServer').mockImplementation(async () => {
    await new Promise<void>((resolve) => releases.push(resolve))
    return { items: [] }
  })
  const pending = readRemoteWorkingDispatches(runtime, db, ids, () => current)
  await vi.waitFor(() => expect(releases).toHaveLength(4))
  current = false
  for (const release of releases) {
    release()
  }
  expect(await pending).toEqual(new Set())
  expect(call).toHaveBeenCalledTimes(4)
  call.mockResolvedValue({
    items: [{ dispatchId: 'remote-0', observation: { exactWorker: true, working: true } }]
  })
  expect(await readRemoteWorkingDispatches(runtime, db, ids.slice(0, 1), () => true)).toEqual(
    new Set(['remote-0'])
  )
})

it('ends the observation at its total deadline without admitting the remaining pages', async () => {
  vi.useFakeTimers()
  try {
    const ids = remoteWorkers(1_000)
    const releases: (() => void)[] = []
    const call = vi.spyOn(runtime, 'callOrchestrationWorkerServer').mockImplementation(async () => {
      await new Promise<void>((resolve) => releases.push(resolve))
      return { items: [] }
    })
    const pending = readRemoteWorkingDispatches(runtime, db, ids, () => true)
    await vi.advanceTimersByTimeAsync(5_000)
    expect(await pending).toEqual(new Set())
    expect(call).toHaveBeenCalledTimes(4)
    for (const release of releases) {
      release()
    }
    await vi.advanceTimersByTimeAsync(0)
    expect(call).toHaveBeenCalledTimes(4)
  } finally {
    vi.useRealTimers()
  }
})
