// Whether a team row shows its sleeping "zzz": its room and every member, workers included, are idle.
import { useMemo } from 'react'
import { useWorktreeActivityStatuses } from '@/components/sidebar/workspace-card/activity/use-worktree-activity-statuses'
import { useBotHostOffline } from '@/lib/bot-host-views'
import { useAppStore } from '@/store'
import { selectSidebarChildrenByParentIdentity } from '@/store/slices/worktrees/metadata/cross-store-lineage-parents'
import type { Bot } from '../../../../shared/bot-types'
import type { BotGroup } from '../../../../shared/bots/bot-group'
import { botGroupStatus, botTeamSleeping } from '../../../../shared/bots/bot-group-status'
import { foldBotStatus } from '../../../../shared/bots/bot-row-status'
import { countLiveBotWorkspaces } from '../../../../shared/bots/bot-sidebar-workspaces'
import { getFolderWorkspaceChildWorktrees } from '../../../../shared/folder-workspace-child-worktrees'
import type { FolderWorkspace } from '../../../../shared/folder-workspaces/folder-workspace-types'
import { getFolderWorkspaceHostIdentity } from '../../../../shared/folder-workspaces/folder-workspace-worktree'
import { folderWorkspaceKey } from '../../../../shared/workspace/identity/workspace-scope'
import { useLiveWorkspaceStatuses } from './use-bot-worker-statuses'

/** `members` holds only members whose home has loaded; the team stays awake until all have. */
export function useBotTeamSleeping(
  group: BotGroup,
  members: readonly { bot: Bot; home: FolderWorkspace }[]
): boolean {
  // Rerun on every store change, so a freshness epoch bump re-reads the clock.
  const roomStatus = useAppStore((state) =>
    botGroupStatus(group, state.agentStatusByPaneKey, Date.now())
  )
  const homeIds = useMemo(() => members.map(({ home }) => folderWorkspaceKey(home.id)), [members])
  const homeStatuses = useWorktreeActivityStatuses(homeIds)
  const childrenByParent = useAppStore(selectSidebarChildrenByParentIdentity)
  const workerIds = useMemo(
    () =>
      members.flatMap(({ home }) =>
        getFolderWorkspaceChildWorktrees(
          getFolderWorkspaceHostIdentity(home),
          childrenByParent
        ).childWorktrees.map((worktree) => worktree.id)
      ),
    [members, childrenByParent]
  )
  const workerStatuses = useLiveWorkspaceStatuses(workerIds)
  const offline = useBotHostOffline(group.hostId)
  return botTeamSleeping({
    roomStatus,
    memberCount: group.members.length,
    memberStatuses: members.flatMap(({ bot }, index) => {
      const status = homeStatuses.get(homeIds[index])
      return status === undefined ? [] : [foldBotStatus(status, bot.paused)]
    }),
    workerCounts: countLiveBotWorkspaces(workerStatuses),
    offline
  })
}
