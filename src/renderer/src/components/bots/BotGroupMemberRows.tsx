import React, { useMemo } from 'react'
import { Settings } from 'lucide-react'
import { ContextMenuItem } from '@/components/ui/context-menu'
import { useWorktreeActivityStatus } from '@/components/sidebar/workspace-card/activity/use-worktree-activity-status'
import { useTranslate } from '@/i18n/use-translate'
import { useBotHostOffline } from '@/lib/bot-host-views'
import { useAppStore } from '@/store'
import { selectDrawsNewWorktreeCards } from '@/store/appearance/worktree-card-style'
import type { Bot } from '../../../../shared/bot-types'
import type { BotGroup } from '../../../../shared/bots/bot-group'
import { groupedBotIds } from '../../../../shared/bots/bot-group-membership'
import type { BotSidebarEntry } from '../../../../shared/bots/bot-sidebar-entries'
import type { FolderWorkspace } from '../../../../shared/folder-workspaces/folder-workspace-types'
import { foldBotStatus } from '../../../../shared/bots/bot-row-status'
import { rollUpBotStatus } from '../../../../shared/bots/bot-sidebar-workspaces'
import { folderWorkspaceKey } from '../../../../shared/workspace/identity/workspace-scope'
import { BotAvatar } from './BotAvatar'
import { openBotSettings } from './bot-settings-open'
import { BotGroupDetachMenuItem } from './BotGroupDetachMenuItem'
import { BotSidebarRow } from './BotSidebarRow'
import {
  BOT_WORKSPACE_LINE_INDENT,
  BOT_WORKSPACE_LINE_INDENT_NEW_CARD_STYLE
} from './BotSidebarEntry'
import { useBotWorkerWorkspaces, useLiveWorkspaceStatuses } from './use-bot-worker-statuses'

type BotGroupMember = { bot: Bot; home: FolderWorkspace }
type Entry = BotSidebarEntry<Bot, BotGroup, FolderWorkspace>

/**
 * A team's members draw under its row, not as rows: drops them from the saved and arranged lists,
 * and maps every listed bot to its home for those member rows.
 */
export function useBotGroupMemberSplit(
  groups: readonly BotGroup[],
  saved: readonly Entry[],
  arranged: readonly Entry[]
): { savedEntries: Entry[]; entries: Entry[]; botHomes: ReadonlyMap<string, FolderWorkspace> } {
  return useMemo(() => {
    const grouped = groupedBotIds(groups)
    const shown = (e: Entry): boolean => e.kind === 'group' || !grouped.has(e.bot.id)
    return {
      savedEntries: saved.filter(shown),
      entries: arranged.filter(shown),
      botHomes: new Map(
        saved.flatMap((e) => (e.kind === 'bot' ? [[e.bot.id, e.home] as const] : []))
      )
    }
  }, [groups, saved, arranged])
}

/** A team's members under its row, joined by a line down their left edge. */
export function BotGroupMemberRows({
  group,
  members
}: {
  group: BotGroup
  members: readonly BotGroupMember[]
}): React.JSX.Element | null {
  const newCardStyle = useAppStore(selectDrawsNewWorktreeCards)
  if (members.length === 0) {
    return null
  }
  return (
    <div
      className="flex flex-col gap-1 border-l border-worktree-sidebar-border pl-1.5"
      style={{
        marginLeft: newCardStyle
          ? BOT_WORKSPACE_LINE_INDENT_NEW_CARD_STYLE
          : BOT_WORKSPACE_LINE_INDENT
      }}
    >
      {members.map(({ bot, home }) => (
        <BotGroupMemberRow key={bot.id} group={group} bot={bot} home={home} />
      ))}
    </div>
  )
}

const doNothing = (): void => {}
const doNothingAsync = async (): Promise<void> => {}

function BotGroupMemberRow({
  group,
  bot,
  home
}: BotGroupMember & { group: BotGroup }): React.JSX.Element {
  const t = useTranslate()
  const workspaceId = folderWorkspaceKey(home.id)
  // BotRow's badge: its own turn rolled up with its live workers; blank and dimmed while its host is down.
  const { childWorktrees } = useBotWorkerWorkspaces(home)
  const workerIds = useMemo(() => childWorktrees.map((worktree) => worktree.id), [childWorktrees])
  const workers = useLiveWorkspaceStatuses(workerIds)
  const status = foldBotStatus(
    rollUpBotStatus(useWorktreeActivityStatus(workspaceId), workers),
    bot.paused
  )
  const offline = useBotHostOffline(bot.hostId)
  return (
    <BotSidebarRow
      avatar={<BotAvatar bot={bot} className="size-7 rounded-md text-xs" />}
      name={bot.name}
      workspaceId={workspaceId}
      hostId={bot.hostId}
      status={offline ? null : status}
      isUnread={false}
      isActive={false}
      dimmed={bot.paused || offline}
      // A member opens nothing; its team's room is where it talks.
      onOpen={doNothing}
      onRename={doNothingAsync}
      // A member's sleep shows only as its team's; its working and needs-you badges stay.
      sleepBadge={false}
      renamable={false}
      readToggle={false}
      age={null}
      line={null}
      hoverDetails={() => (
        <div className="flex items-center gap-2 text-xs text-foreground">
          <BotAvatar bot={bot} className="size-5 rounded text-2xs" />
          <span className="min-w-0 break-words">{bot.name}</span>
        </div>
      )}
      menuItems={
        <>
          <ContextMenuItem onSelect={() => openBotSettings(bot.id)}>
            <Settings className="size-3.5" />
            {t('bots.row.settings', 'Bot settings…')}
          </ContextMenuItem>
          <BotGroupDetachMenuItem group={group} bot={bot} />
        </>
      }
      menuFooter={null}
    />
  )
}
