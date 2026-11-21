import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import type * as Registry from '../native-chat/agent-session-wire/host/structured-agent-session-registry'
import { fixture } from './bot-group-native-runtime.test-fixture'

// The member's live turn is one a reminder started: its journal holds no group submission.
vi.mock(
  '../native-chat/agent-session-wire/host/structured-agent-session-registry',
  async (importOriginal) => ({
    ...(await importOriginal<typeof Registry>()),
    getStructuredAgentSessionHost: () => ({
      currentWork: async () => ({ activeTurn: () => ({ item: { itemId: 'reminder-turn' } }) }),
      journalReads: async () => ({
        operationWindow: async () => ({ snapshot: { items: [], submissions: [] } })
      })
    })
  })
)

describe('group worker capture', () => {
  it("binds a worker started outside a group turn to the member's latest live request", async () => {
    const { groups, mails, dispatches } = fixture()
    const group = await groups.create({ name: 'Review', botIds: ['bot-0', 'bot-1'] })
    const [lead] = group.members
    const post = await groups.send({
      groupId: group.id,
      revision: group.revision,
      messageId: randomUUID(),
      text: '@Scout plan it'
    })
    const operation = groups.captureWorkerOperation(lead.sessionId)
    await expect(operation).resolves.toBe(post.turns[0].operationId)
    await groups.recordWorker(operation, 'ctx_B')
    dispatches.set('ctx_B', {
      id: 'ctx_B',
      task_id: 'task_B',
      status: 'completed',
      assignee_handle: 'structworker_Y',
      assignee_pane_key: null
    })
    const report = {
      id: 'report',
      thread_id: null,
      from_handle: 'structworker_Y',
      type: 'worker_done',
      payload: JSON.stringify({ dispatchId: 'ctx_B', taskId: 'task_B', outcome: 'succeeded' })
    }
    mails.set('report', report)
    expect(groups.narrowMailBatch(lead.sessionId, [report])).toEqual({
      messages: [report],
      ended: []
    })
  })
})
