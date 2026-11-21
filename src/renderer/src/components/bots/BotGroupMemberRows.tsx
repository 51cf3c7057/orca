import React, { useMemo } from 'react'
import { Settings } from 'lucide-react'
import { ContextMenuItem } from '@/components/ui/context-menu'
import { useWorktreeActivityStatus } from '@/components/sidebar/workspace-card/activity/use-worktree-activity-status'
import { useTranslate } from '@/i18n/use-translate'
import { updateBot } from '@/lib/bot-catalog'
import { useAppStore } from '@/store'
import { selectDrawsNewWorktreeCards } from '@/store/appearance/worktree-card-style'
import type { Bot } from '../../../../shared/bot-types'
import type { BotGroup } from '../../../../shared/bots/bot-group'
import { groupedBotIds } from '../../../../shared/bots/bot-group-membership'
import type { BotSidebarEntry } from '../../../../shared/bots/bot-sidebar-entries'
import type { FolderWorkspace } from '../../../../shared/folder-workspaces/folder-workspace-types'
import { foldBotStatus } from '../../../../shared/bots/bot-row-status'
import { folderWorkspaceKey } from '../../../../shared/workspace/identity/workspace-scope'
import { BotAvatar } from './BotAvatar'
import { openBotSettings } from './bot-settings-open'
import { botErrorMessage } from './bot-presentation'
import { BotSidebarRow } from './BotSidebarRow'
import {
  BOT_WORKSPACE_LINE_INDENT,
  BOT_WORKSPACE_LINE_INDENT_NEW_CARD_STYLE
} from './BotSidebarEntry'

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
  members
}: {
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
        <BotGroupMemberRow key={bot.id} bot={bot} home={home} />
      ))}
    </div>
  )
}

const doNothing = (): void => {}

function BotGroupMemberRow({ bot, home }: BotGroupMember): React.JSX.Element {
  const t = useTranslate()
  const workspaceId = folderWorkspaceKey(home.id)
  const status = foldBotStatus(useWorktreeActivityStatus(workspaceId), bot.paused)
  return (
    <BotSidebarRow
      avatar={<BotAvatar bot={bot} className="size-7 rounded-md text-xs" />}
      name={bot.name}
      workspaceId={workspaceId}
      hostId={bot.hostId}
      status={status}
      isUnread={false}
      isActive={false}
      dimmed={bot.paused}
      // A member opens nothing; its team's room is where it talks.
      onOpen={doNothing}
      // The shared row always offers Rename, so it renames the bot rather than dropping the edit.
      onRename={async (name) => {
        try {
          await updateBot(bot, { name })
        } catch (error) {
          throw new Error(botErrorMessage(error))
        }
      }}
      age={null}
      line={null}
      hoverDetails={() => (
        <div className="flex items-center gap-2 text-xs text-foreground">
          <BotAvatar bot={bot} className="size-5 rounded text-2xs" />
          <span className="min-w-0 break-words">{bot.name}</span>
        </div>
      )}
      menuItems={
        <ContextMenuItem onSelect={() => openBotSettings(bot.id)}>
          <Settings className="size-3.5" />
          {t('bots.row.settings', 'Bot settings…')}
        </ContextMenuItem>
      }
      menuFooter={null}
    />
  )
}
