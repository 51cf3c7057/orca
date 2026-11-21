import { describe, expect, it } from 'vitest'
import { botGroupIdsOfBot, groupedBotIds, isBotInGroup } from './bot-group-membership'

const member = (botId: string) => ({ botId, sessionId: `s-${botId}` })

// Team B is listed first, so the order of results follows the list, not the ids.
const groups = [
  { id: 'team-b', members: [member('bot-2'), member('bot-3')] },
  { id: 'team-a', members: [member('bot-1'), member('bot-2')], formerSessionIds: ['s-bot-4'] }
]

describe('bot group membership', () => {
  it('finds no team for a bot in none', () => {
    expect(botGroupIdsOfBot('bot-9', groups)).toEqual([])
    expect(isBotInGroup('bot-9', groups)).toBe(false)
  })

  it('finds the one team of a bot in one', () => {
    expect(botGroupIdsOfBot('bot-1', groups)).toEqual(['team-a'])
    expect(isBotInGroup('bot-1', groups)).toBe(true)
  })

  it('finds both teams of a bot in two, in the given order', () => {
    expect(botGroupIdsOfBot('bot-2', groups)).toEqual(['team-b', 'team-a'])
  })

  it('does not count a former member', () => {
    expect(isBotInGroup('bot-4', groups)).toBe(false)
    expect(groupedBotIds(groups)).toEqual(new Set(['bot-1', 'bot-2', 'bot-3']))
  })
})
