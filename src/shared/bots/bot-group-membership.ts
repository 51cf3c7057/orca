import type { BotGroup } from './bot-group-schema'

type GroupMembers = Pick<BotGroup, 'id' | 'members'>

/** The teams a bot is a current member of, in the given order; former members don't count. */
export function botGroupIdsOfBot(botId: string, groups: readonly GroupMembers[]): string[] {
  return groups.flatMap((group) =>
    group.members.some((member) => member.botId === botId) ? [group.id] : []
  )
}

export function isBotInGroup(botId: string, groups: readonly GroupMembers[]): boolean {
  return groups.some((group) => group.members.some((member) => member.botId === botId))
}

/** Every bot that is a current member of at least one team. */
export function groupedBotIds(groups: readonly Pick<BotGroup, 'members'>[]): ReadonlySet<string> {
  return new Set(groups.flatMap((group) => group.members.map((member) => member.botId)))
}
