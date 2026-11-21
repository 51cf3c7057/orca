import { useMemo } from 'react'
import { useBotsEnabled } from '@/lib/bot-catalog'
import { useBotGroups } from '@/lib/bot-group-list'
import {
  collapseBotGroupRoomRows,
  dropBotTeamMemberRows,
  placeBotGroupRoomRows
} from '@/lib/bot-group-room-history'
import { useTeamMemberBots } from '@/components/bots/use-bot-teams'
import { useAppStore } from '@/store'
import { selectFolderWorkspaces } from '@/store/workspaces/catalog/workspace-record-fields'
import type { AiVaultRoomRows } from '../session-list/ai-vault-session-filters'

/** A group room's member rows in Session History: placed in the group's home before filters
 *  run, then folded into the one row that reopens the room. */
export function useAiVaultGroupRoomRows(): AiVaultRoomRows {
  const groups = useBotGroups(useBotsEnabled())
  const memberBots = useTeamMemberBots()
  const folders = useAppStore(selectFolderWorkspaces)
  return useMemo(() => {
    const homePathOf = (id: string) =>
      folders?.find((folder) => folder.id === id)?.folderPath ?? null
    // A team member's own chats are listed only in its team.
    const memberHomePaths = new Set(
      memberBots.flatMap((bot) => homePathOf(bot.folderWorkspaceId) ?? [])
    )
    return {
      place: (rows) =>
        placeBotGroupRoomRows(dropBotTeamMemberRows(rows, memberHomePaths), groups, homePathOf),
      fold: (rows) => collapseBotGroupRoomRows(rows, groups)
    }
  }, [folders, groups, memberBots])
}
