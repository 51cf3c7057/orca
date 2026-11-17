import { expect, it } from 'vitest'
import type { AgentJournalItemBody } from '../../../../shared/agent-session/journal/agent-session-journal-types'
import { createClaudeJournalTranslator } from './claude-structured-journal-translation'

it.each([false, true])(
  'keeps a rejected goal active until another model reply can satisfy it (continued: %s)',
  (continued) => {
    const rows: AgentJournalItemBody[] = []
    const translator = createClaudeJournalTranslator({
      goalBackgroundWork: () => 'exited',
      sink: {
        appendItem: (_identity, body) => rows.push(body),
        appendTombstone: () => {},
        publish: () => {}
      }
    })
    let sequence = 0
    const frame = (message: Record<string, unknown>) =>
      translator.handle({
        type: 'message',
        sessionId: 'orca-session',
        observedAt: 1_000,
        message: {
          session_id: 'claude-session',
          parent_tool_use_id: null,
          uuid: `frame-${++sequence}`,
          ...message
        }
      })
    const answer = (text: string, model = 'claude-sonnet') =>
      frame({
        type: 'assistant',
        message: { role: 'assistant', model, content: [{ type: 'text', text }] }
      })
    try {
      answer('Goal set: Finish the worker task', '<synthetic>')
      answer('Still waiting for the worker report.')
      frame({
        type: 'user',
        isSynthetic: true,
        message: {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Stop hook feedback:\n[Finish the worker task]: The worker has not reported.'
            }
          ]
        }
      })
      if (continued) {
        answer('The worker reported and the task is finished.')
      }
      frame({ type: 'result', subtype: 'success', terminal_reason: 'completed', num_turns: 2 })

      expect(
        rows.findLast((row) => row.kind === 'status' && row.threadGoal !== undefined)
      ).toMatchObject({
        kind: 'status',
        threadGoal: {
          state: 'set',
          goal: { objective: 'Finish the worker task', status: continued ? 'complete' : 'active' }
        }
      })
    } finally {
      translator.dispose()
    }
  }
)
