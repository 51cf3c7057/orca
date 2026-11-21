// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { cleanup, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { render } from './messages/actions/native-chat-tooltip-test-harness'
import { useAppStore } from '@/store'
import {
  initialStore,
  resetSenderStore
} from './messages/agent-senders/native-chat-agent-sender.test-fixture'
import { MessageRow } from './messages/rows/NativeChatMessageRow'
import { readAgentMessageSource } from '../../../../shared/agent-session/journal/agent-session-message-source'
import type { Bot } from '../../../../shared/bot-types'

const bots = vi.hoisted(() => [
  {
    id: 'architect-4',
    name: 'Architect#4',
    hostId: 'local',
    avatar: 'mascot:A1',
    folderWorkspaceId: 'folder:architect-4-home'
  }
])

vi.mock('@/lib/bot-catalog', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  readBots: () => bots as unknown as Bot[],
  readBotsEnabled: () => true,
  useBots: () => bots as unknown as Bot[],
  useBotsEnabled: () => true
}))

vi.mock('@/components/agent/icons/agent-type-icon', () => ({
  AgentTypeIcon: ({ agentType }: { agentType: string | null | undefined }) => (
    <span data-testid="agent-icon">{agentType ?? '?'}</span>
  )
}))

beforeEach(() => resetSenderStore())

afterEach(() => {
  cleanup()
  useAppStore.setState(initialStore, true)
})

it("shows a local bot's picture when the chat it wrote from is not open", () => {
  // As this Orca records its own bot's mail: the bot's name and bot true, with no host or avatar.
  const from = readAgentMessageSource({
    kind: 'agent',
    senders: [
      {
        party: {
          address: 'orca_session_id:6f2b1c2e-8d4a-4f7e-9b1a-3c5d7e9f1a2b',
          terminalHandle: null,
          orcaSessionId: '6f2b1c2e-8d4a-4f7e-9b1a-3c5d7e9f1a2b'
        },
        name: 'Architect#4',
        bot: true,
        agent: 'claude'
      }
    ],
    orchestration: { message: 'mail-notice', mailbox: 'term_9', dispatchId: null, messages: [] }
  })!
  render(
    <MessageRow
      message={{
        id: 'bot-mail',
        role: 'user',
        blocks: [{ type: 'text', text: 'The plan is ready.' }],
        timestamp: 1,
        source: 'transcript',
        from
      }}
      expandSignal={false}
      onScrollMessageToTop={() => {}}
      runtimeContext={{ worktreeId: 'workspace', worktreePath: null, target: { kind: 'local' } }}
    />
  )

  expect(screen.getByText('Architect#4')).toBeInTheDocument()
  expect(screen.queryByTestId('agent-icon')).not.toBeInTheDocument()
  expect(document.querySelector('img[src*="A1"]')).not.toBeNull()
})
