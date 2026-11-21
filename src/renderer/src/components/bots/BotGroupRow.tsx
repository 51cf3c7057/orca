import React from 'react'
import { callBotRpc } from '@/lib/bot-hosts'
import { Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu'
import { useNow } from '@/lib/window-activity/use-now'
import { useAppStore } from '@/store'
import { useTranslate } from '@/i18n/use-translate'
import { openBotGroup } from '@/lib/bot-group-catalog'
import type { Bot } from '../../../../shared/bot-types'
import type { BotGroup } from '../../../../shared/bots/bot-group'
import type { FolderWorkspace } from '../../../../shared/folder-workspaces/folder-workspace-types'
import { LOCAL_EXECUTION_HOST_ID } from '../../../../shared/execution-host/execution-host'
import { folderWorkspaceKey } from '../../../../shared/workspace/identity/workspace-scope'
import { getLineageGroupKey } from '../../../../shared/sidebar-list/sections/group-keys'
import type { BotWorkspaceLiveCounts } from '../../../../shared/bots/bot-sidebar-workspaces'
import { BotAvatar } from './BotAvatar'
import { botRowLineAge, BotHoverLatestLine, BotRowLineView } from './BotRowActivityLine'
import type { BotRowLine } from './bot-row-activity-line'
import { botGroupStatus } from '../../../../shared/bots/bot-group-status'
import { botGroupRowLine } from '../../../../shared/bots/bot-sidebar-entries'
import { BotSidebarRow } from './BotSidebarRow'
import { botErrorMessage } from './bot-presentation'
import { botGroupFaces } from '../../../../shared/bots/bot-group-face-layout'
import { BotGroupFaces } from './BotGroupFaces'
import { BotRowFoldToggle, type BotRowFold } from './BotRowFoldToggle'
import { BotGroupThreadLines } from './BotGroupThreadLines'

// Threads have no live workspaces, so a folded team shows no status dot.
const NO_LIVE_COUNTS: BotWorkspaceLiveCounts = { permission: 0, working: 0, failed: 0 }

/** A group in the Bots section: its members' faces, the room's newest post, then its threads. */
export function BotGroupRow({
  group,
  home,
  members,
  isActive,
  onOpen,
  onManageMembers,
  onDelete,
  dragHandle = false
}: {
  group: BotGroup
  home: FolderWorkspace
  /** Its members' bots, as loaded. */
  members: readonly Bot[]
  isActive: boolean
  onOpen: () => void
  onManageMembers: () => void
  onDelete: () => void
  dragHandle?: boolean
}): React.JSX.Element {
  const t = useTranslate()
  const workspaceId = folderWorkspaceKey(home.id)
  const groupKey = getLineageGroupKey(workspaceId)
  const folded = useAppStore((s) => s.collapsedGroups.has(groupKey))
  const toggleCollapsedGroup = useAppStore((s) => s.toggleCollapsedGroup)
  const threadCount = group.threads?.length ?? 0
  const fold: BotRowFold | null =
    threadCount > 0
      ? {
          folded,
          total: threadCount,
          counts: NO_LIVE_COUNTS,
          onToggle: () => toggleCollapsedGroup(groupKey)
        }
      : null
  const now = useNow(60_000)
  // Rerun on every store change, so a freshness epoch bump re-reads the clock.
  const status = useAppStore((state) =>
    botGroupStatus(group, state.agentStatusByPaneKey, Date.now())
  )
  const line: BotRowLine = {
    kind: 'activity',
    place: null,
    ...botGroupRowLine(group, members, t('bots.groups.you', 'You'))
  }
  return (
    <>
      <BotSidebarRow
        avatar={
          <BotGroupFaces
            faces={botGroupFaces(members, (bot) => bot.id)}
            className="size-9"
            slot={36}
          />
        }
        name={group.name}
        workspaceId={workspaceId}
        hostId={LOCAL_EXECUTION_HOST_ID}
        status={status}
        isUnread={home.isUnread}
        isActive={isActive}
        expanded={fold ? !fold.folded : undefined}
        dragHandle={dragHandle}
        onOpen={() => {
          void openBotGroup(group)
            .then(onOpen)
            .catch((error: unknown) => toast.error(String(error)))
        }}
        onRename={async (name) => {
          try {
            await callBotRpc(group, 'bots.groups.update', {
              groupId: group.id,
              revision: group.revision,
              name
            })
          } catch (error) {
            throw new Error(botErrorMessage(error))
          }
        }}
        age={botRowLineAge(line, now)}
        idle={status === null}
        line={<BotRowLineView line={line} unread={home.isUnread} now={now} />}
        trailing={fold ? <BotRowFoldToggle name={group.name} fold={fold} /> : null}
        hoverDetails={() => (
          <BotGroupHoverDetails
            group={group}
            members={members}
            latest={<BotHoverLatestLine line={line} now={now} />}
          />
        )}
        menuItems={
          <ContextMenuItem onSelect={onManageMembers}>
            <Users className="size-3.5" />
            {t('bots.groups.manageMembersMenu', 'Manage members…')}
          </ContextMenuItem>
        }
        menuFooter={
          <>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 className="size-3.5" />
              {t('bots.groups.deleteGroupMenu', 'Delete group…')}
            </ContextMenuItem>
          </>
        }
      />
      {fold && !fold.folded ? <BotGroupThreadLines group={group} /> : null}
    </>
  )
}

function BotGroupHoverDetails({
  group,
  members,
  latest
}: {
  group: BotGroup
  members: readonly Bot[]
  /** The row's second line, whole. */
  latest: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <div className="break-words text-[13px] font-semibold leading-snug text-foreground">
        {group.name}
      </div>
      <div className="flex flex-col gap-1.5">
        {members.map((bot) => (
          <div key={bot.id} className="flex items-center gap-2 text-xs text-foreground">
            <BotAvatar bot={bot} className="size-5 rounded text-2xs" />
            <span className="min-w-0 truncate">{bot.name}</span>
          </div>
        ))}
      </div>
      {latest}
    </div>
  )
}
