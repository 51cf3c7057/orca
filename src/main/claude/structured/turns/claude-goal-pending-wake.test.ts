import { expect, it } from 'vitest'
import type { AgentJournalItemBody } from '../../../../shared/agent-session/journal/agent-session-journal-types'
import { ClaudeStructuredSessionAdapter } from '../claude-structured-session-adapter'
import {
  fakeClaude,
  identityFor,
  claudeFrame,
  PROVIDER_SESSION_ID
} from '../claude-structured-session-test-support'
import { claudeStartupSettled } from '../startup/claude-structured-startup-settled-test-support'

it('defers only an active goal awaiting its own wake, retaining the goal until work resumes', async () => {
  const claude = fakeClaude()
  let pending = false
  const rows: AgentJournalItemBody[] = []
  const adapter = new ClaudeStructuredSessionAdapter({
    resolveLaunch: async () => ({
      pathToClaudeCodeExecutable: 'claude',
      options: {},
      cwd: '/work/repo',
      claudeConfigDir: '/accounts/claude',
      providerSessionId: PROVIDER_SESSION_ID,
      cliFlag: async () => 'supported',
      resumeLeafUuid: null,
      resumesTranscript: false,
      continuesChain: false,
      env: {}
    }),
    openConnection: claude.openConnection,
    readProcessStartTime: async () => 1700000000000,
    hasPendingOrchestrationWake: async (sessionId) => sessionId === 'session-1' && pending
  })
  try {
    await adapter.acquire({
      identity: identityFor(),
      fence: 7,
      spawnToken: 'spawn-9',
      events: {
        appendItem: (_id, body) => rows.push(body),
        appendTombstone: () => {},
        publish: () => {}
      }
    })
    await claudeStartupSettled(adapter, 'session-1')
    const connection = claude.connections[0]!
    const signal = new AbortController().signal
    const stop = () =>
      connection.handlers.onStop!(
        {
          hook_event_name: 'Stop',
          session_id: PROVIDER_SESSION_ID,
          transcript_path: '/transcript',
          cwd: '/work/repo',
          stop_hook_active: false
        },
        undefined,
        { signal }
      )
    pending = true
    expect(await stop()).toEqual({})
    const answer = (uuid: string, text: string, model = 'claude-sonnet') =>
      claudeFrame(connection, {
        type: 'assistant',
        uuid,
        parent_tool_use_id: null,
        message: { role: 'assistant', model, content: [{ type: 'text', text }] }
      })
    answer('goal', 'Goal set: Finish the delegated task', '<synthetic>')
    pending = false
    expect(await stop()).toEqual({})
    pending = true
    answer('waiting', 'Waiting for the worker report.')
    expect(await stop()).toEqual({ continue: false })
    // SDK control callbacks may outrun the message iterator under journal backpressure.
    answer('late-waiting', 'The worker is still running.')
    claudeFrame(connection, {
      type: 'result',
      uuid: 'deferred',
      subtype: 'success',
      terminal_reason: 'completed',
      num_turns: 1
    })
    expect(rows.findLast((row) => row.kind === 'status' && row.threadGoal)).toMatchObject({
      threadGoal: { state: 'set', goal: { status: 'active' } }
    })
    pending = false
    answer('finished', 'The worker reported; the task is done.')
    expect(await stop()).toEqual({})
    claudeFrame(connection, {
      type: 'result',
      uuid: 'complete',
      subtype: 'success',
      terminal_reason: 'completed',
      num_turns: 1
    })
    expect(rows.findLast((row) => row.kind === 'status' && row.threadGoal)).toMatchObject({
      threadGoal: { state: 'set', goal: { status: 'complete' } }
    })
  } finally {
    await adapter.closeAll()
    claude.dispose()
  }
})
