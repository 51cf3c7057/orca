import '../../../dispatch/testing/unused-default-rpc-methods.test-fixture'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createOrchestrationRpcHarness } from '../rpc-test-harness'
import type * as RecipientRouting from './recipient-routing'
import {
  journals,
  message,
  sessionsOf,
  setupBotMail,
  startBotSession
} from './bot-recipient.test-fixture'

vi.mock(
  '../../../../../bots/bot-session-tabs',
  async () => (await import('./bot-recipient.test-fixture')).botSessionTabsMock
)
vi.mock(
  '../../../../../bots/bot-chat-session',
  async () => (await import('./bot-recipient.test-fixture')).botChatSessionMock
)
vi.mock(
  '../../../../../bots/bot-chat-mail-hold',
  async () => (await import('./bot-recipient.test-fixture')).botChatMailHoldMock
)
vi.mock(
  '../../../../../bots/bot-chat-status-line',
  async () => (await import('./bot-recipient.test-fixture')).botChatStatusLineMock
)
vi.mock('./recipient-routing', async (importOriginal) =>
  (await import('./bot-recipient.test-fixture')).recipientRoutingMock(
    await importOriginal<typeof RecipientRouting>()
  )
)

/** Ranger's session in a group room. */
const MEMBER = 'bot-group-member-ranger'

describe("a group member's own new chat", () => {
  const h = createOrchestrationRpcHarness()
  let mail: ReturnType<typeof setupBotMail>

  beforeEach(() => {
    mail = setupBotMail(h)
    sessionsOf.ranger.push(MEMBER)
  })
  afterEach(() => {
    sessionsOf.ranger.splice(sessionsOf.ranger.indexOf(MEMBER), 1)
    h.cleanup()
  })

  it('opens an ordinary new chat of its own bot for a handoff with --chat new', async () => {
    const ownNew = '66666666-6666-4666-8666-666666666666'
    startBotSession.mockResolvedValueOnce(ownNew)
    journals[MEMBER] = [message('hand it over')]
    const receipt = await mail.sent(MEMBER, { to: 'bot:Ranger', type: 'handoff', chat: 'new' })
    expect(receipt.message.to_handle).toBe(`orca_session_id:${ownNew}`)
    const record = JSON.parse(mail.db.getBotRequest(receipt.message.id)?.record ?? '{}')
    expect(record).not.toHaveProperty('group')
    expect(record.request).toBe('hand it over')
  })
})
