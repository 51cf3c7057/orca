import { beforeEach, expect, it, vi } from 'vitest'
import { renameBotChat } from './bot-chat-rename'

const mocks = vi.hoisted(() => ({
  call: vi.fn(async () => ({ name: 'Renamed', applied: true })),
  supports: vi.fn(async () => true),
  toastError: vi.fn()
}))
vi.mock('@/lib/bot-hosts', () => ({
  botTarget: () => ({ kind: 'local' }),
  callBotRpc: mocks.call
}))
vi.mock('@/runtime/native-chat/host-capabilities/structured-agent-session-host-support', () => ({
  supportsStructuredAgentSessionRename: mocks.supports
}))
vi.mock('sonner', () => ({ toast: { error: mocks.toastError } }))

const bot = { hostId: 'local' } as const

beforeEach(() => {
  vi.clearAllMocks()
})

it('renames the session a /clear moved the chat to, else the chat itself', async () => {
  await renameBotChat(bot, { chatId: 'chat-root', sessionId: 'chat-after-clear' }, '  Plans  ')
  await renameBotChat(bot, { chatId: 'chat-root' }, 'Plans')

  expect(mocks.call.mock.calls).toEqual([
    [bot, 'agentSession.rename', { sessionId: 'chat-after-clear', name: 'Plans' }],
    [bot, 'agentSession.rename', { sessionId: 'chat-root', name: 'Plans' }]
  ])
  expect(mocks.toastError).not.toHaveBeenCalled()
})
