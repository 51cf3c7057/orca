import React, { useState } from 'react'
import { Bell, BellOff, Pencil } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { HoverCardContent } from '@/components/ui/hover-card'
import { ActivityThreadHoverCardRoot } from '@/components/activity/thread-preview/activity-thread-hover-card-root'
import { WORKTREE_CARD_SURFACE_CLASS_NAME } from '@/components/sidebar/workspace-card/surface/worktree-card-surface'
import { WorktreeTitleInlineRename } from '@/components/sidebar/workspace-card/identity/WorktreeTitleInlineRename'
import { IdleZzz } from '@/components/sidebar/workspace-card/slots/IdleZzz'
import type { WorktreeStatus } from '../../../../shared/worktree/row-display/worktree-status-rollup'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { useAppStore } from '@/store'
import type { ExecutionHostId } from '../../../../shared/execution-host/execution-host'
import {
  BotAvatarStatusBadge,
  botAvatarBadgeCutout,
  useBotAvatarBadgeSleeping
} from './bot-avatar-status-badge'

/** One row of the Bots section, a bot's or a group's: picture, name and time, then its newest line. */
export type BotSidebarRowProps = {
  /** The row's picture: a bot's avatar, or a group's member faces. */
  avatar: React.ReactNode
  name: string
  /** Its home's key: the status and unread mark are the home's. */
  workspaceId: string
  hostId: ExecutionHostId
  /** The avatar shows activity and exceptions; healthy states stay unmarked. */
  status: WorktreeStatus | null
  /** Its chat, worker or run stopped on a usage limit while the row is quiet: the corner's tooltip. */
  stopTip?: string | null
  isUnread: boolean
  isActive: boolean
  dimmed?: boolean
  /** Its host is disconnected: Rename and Mark Read/Unread are off, as the caller's items are. */
  actionsDisabled?: boolean
  /** The Bots section's reorder: this row is where a drag starts. */
  dragHandle?: boolean
  /** Set for a row that folds: whether it is unfolded. */
  expanded?: boolean
  onOpen: (event: { detail: number; target: EventTarget; repeat?: boolean }) => void
  onRename: (name: string) => Promise<void>
  /** How long ago its newest line happened; shown only in the sleep pill. */
  age: string | null
  /** Doing nothing: a purple pill after the name with a sleeping "zzz" and the age. */
  idle?: boolean
  /** The second line, under the name. */
  line: React.ReactNode
  /** A column after both lines at the row's right edge, such as the fold toggle's strip. */
  trailing?: React.ReactNode
  /** What the hover card shows, rendered only while it is open. */
  hoverDetails: () => React.ReactNode
  /** Rename and Mark Read/Unread lead the menu; these follow. */
  menuItems: React.ReactNode
  menuFooter: React.ReactNode
  /** False: the picture never shows the sleeping moon; its other badges still show. */
  sleepBadge?: boolean
  /** False: no Rename item, and the title can't be edited. */
  renamable?: boolean
  /** False: no Mark Read/Unread item. */
  readToggle?: boolean
}

export function BotSidebarRow({
  avatar,
  name,
  workspaceId,
  hostId,
  status,
  stopTip = null,
  isUnread,
  isActive,
  expanded,
  dimmed = false,
  actionsDisabled = false,
  dragHandle = false,
  onOpen,
  onRename,
  age,
  idle = false,
  line,
  trailing = null,
  hoverDetails,
  menuItems,
  menuFooter,
  sleepBadge = true,
  renamable = true,
  readToggle = true
}: BotSidebarRowProps): React.JSX.Element {
  const t = useTranslate()
  const setWorkspaceUnreadByUser = useAppStore((s) => s.setWorkspaceUnreadByUser)
  const [renameRequested, setRenameRequested] = useState(false)
  const [hoverOpen, setHoverOpen] = useState(false)
  const toggleUnread = (): void => setWorkspaceUnreadByUser(workspaceId, !isUnread, hostId)
  const sleeping = useBotAvatarBadgeSleeping(workspaceId, status)
  const badge = { status, sleeping: sleepBadge && sleeping, stopTip }
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          data-worktree-card-surface="true"
          data-worktree-card-active={isActive ? 'primary' : undefined}
          aria-expanded={expanded}
          data-project-group-header-drag-handle={dragHandle ? '' : undefined}
          // A title that can't be renamed isn't a focus stop, so the row takes it for its menu.
          tabIndex={renamable ? undefined : 0}
          className={cn(
            WORKTREE_CARD_SURFACE_CLASS_NAME,
            // A two-line workspace card's padding, so bots sit as tight as Projects' rows.
            // A size container: the fold strip slims down in a narrow sidebar.
            'group/bot-row @container/bot-row flex items-center pt-1.25 pb-1.25 pl-1.25',
            !isActive && 'worktree-sidebar-card-hover',
            !renamable &&
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-worktree-sidebar-ring',
            dimmed && 'opacity-60'
          )}
          onClick={onOpen}
          onContextMenu={() => setHoverOpen(false)}
          // The title is the row's focus stop; its rename input keeps its own keys.
          onKeyDown={(event) => {
            // The unread bell is a button of its own.
            if (event.target instanceof Element && event.target.closest('button')) {
              return
            }
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onOpen(event)
            }
          }}
        >
          {/* The status sits on the picture's corner, the same in both card styles. */}
          <span className="relative mr-2 shrink-0">
            <span className="flex" style={botAvatarBadgeCutout(badge)}>
              {avatar}
            </span>
            <BotAvatarStatusBadge {...badge} />
          </span>
          {/* Opens on pointer rest like Activity's cards, so sweeping across rows doesn't flash them.
              The trigger runs to the row's end, fold toggle included, so the card always opens past
              the sidebar's edge as a workspace row's does. */}
          <ActivityThreadHoverCardRoot
            open={hoverOpen}
            onOpenChange={setHoverOpen}
            closeDelay={120}
            trigger={
              <div className="flex min-w-0 flex-1 gap-1 self-stretch">
                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <WorktreeTitleInlineRename
                      displayName={name}
                      disabled={!renamable}
                      showUnreadEmphasis={isUnread}
                      dimReadTitle
                      className="text-[13px] leading-5"
                      editingClassName="flex-1"
                      onRename={onRename}
                      // The hover card already shows the full name.
                      titleWrapper={(title) => title}
                      beginEditing={renameRequested}
                      onBeginEditingConsumed={() => setRenameRequested(false)}
                    />
                    {/* Asleep: the zzz and how long since its newest activity, in a pill by the name. */}
                    {idle ? (
                      <span className="inline-flex h-4 shrink-0 items-center gap-1 rounded-full bg-bot-sleep px-1.5 text-2xs leading-4 font-medium text-bot-sleep-foreground tabular-nums">
                        <IdleZzz label={t('bots.row.idle', 'Idle')} trailingGap={false} />
                        {age}
                      </span>
                    ) : null}
                  </div>
                  {line}
                </div>
                {trailing}
              </div>
            }
          >
            <HoverCardContent
              side="right"
              align="start"
              sideOffset={8}
              variant="workspace-details"
              // Portal clicks still bubble to the row through React.
              onClick={(event) => event.stopPropagation()}
            >
              {hoverOpen ? hoverDetails() : null}
            </HoverCardContent>
          </ActivityThreadHoverCardRoot>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        {renamable ? (
          <ContextMenuItem disabled={actionsDisabled} onSelect={() => setRenameRequested(true)}>
            <Pencil className="size-3.5" />
            {t('bots.row.rename', 'Rename')}
          </ContextMenuItem>
        ) : null}
        {menuItems}
        {readToggle ? (
          <ContextMenuItem disabled={actionsDisabled} onSelect={toggleUnread}>
            {isUnread ? <BellOff className="size-3.5" /> : <Bell className="size-3.5" />}
            {isUnread
              ? t('bots.row.markRead', 'Mark Read')
              : t('bots.row.markUnread', 'Mark Unread')}
          </ContextMenuItem>
        ) : null}
        {menuFooter}
      </ContextMenuContent>
    </ContextMenu>
  )
}
