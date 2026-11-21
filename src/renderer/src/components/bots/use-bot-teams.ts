// Which bots are in a team, read from the same group list as the sidebar's member filter.
import { useMemo } from 'react'
import { useBots } from '@/lib/bot-catalog'
import { useBotGroups } from '@/lib/bot-group-list'
import type { Bot } from '../../../../shared/bot-types'
import type { BotGroup } from '../../../../shared/bots/bot-group'
import { botGroupIdsOfBot, groupedBotIds } from '../../../../shared/bots/bot-group-membership'

const NO_TEAMS: readonly BotGroup[] = []

/** The loaded teams the bot is a current member of. */
export function useBotTeams(botId: string | null): readonly BotGroup[] {
  const groups = useBotGroups()
  return useMemo(() => {
    if (botId === null) {
      return NO_TEAMS
    }
    const ids = new Set(botGroupIdsOfBot(botId, groups))
    return ids.size === 0 ? NO_TEAMS : groups.filter((group) => ids.has(group.id))
  }, [botId, groups])
}

/** The loaded bots that are in at least one team. */
export function useTeamMemberBots(): readonly Bot[] {
  const bots = useBots()
  const groups = useBotGroups()
  return useMemo(() => {
    const grouped = groupedBotIds(groups)
    return bots.filter((bot) => grouped.has(bot.id))
  }, [bots, groups])
}
