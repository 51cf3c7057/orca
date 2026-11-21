import React, { useEffect, useState } from 'react'
import { openBotSettings } from './bot-settings-open'
import { Copy, CopyPlus, Pause, Play, Settings, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu'
import { useWorktreeActivityStatus } from '@/components/sidebar/workspace-card/activity/use-worktree-activity-status'
import { useWorktreeAgentRows } from '@/components/sidebar/workspace-card/activity/useWorktreeAgentRows'
import { useTranslate } from '@/i18n/use-translate'
import { openBotHome, updateBot } from '@/lib/bot-catalog'
import { useBotHostOffline } from '@/lib/bot-host-views'
import { WorktreeHostContextBadge } from '@/components/sidebar/workspace-card/host/WorktreeHostContextBadge'
import { useBotUpNextUnseen } from '@/lib/bot-up-next-unseen'
import { formatAgentToolPreview } from '../../../../shared/agent-status/presentation/agent-row-tool-preview'
import { getWorktreeStatusLabel } from '@/lib/workspace/activity/worktree-status'
import type { Bot } from '../../../../shared/bot-types'
import { getLocalExecutionHostLabel } from '../../../../shared/execution-host/execution-host'
import type { FolderWorkspace } from '../../../../shared/folder-workspaces/folder-workspace-types'
import { getAgentRowPrimaryText } from '../../../../shared/agent-status/presentation/agent-row-primary-text'
import { folderWorkspaceKey } from '../../../../shared/workspace/identity/workspace-scope'
import { botErrorMessage, botFolderDisplay } from './bot-presentation'
import { foldBotStatus, type BotRowStatus } from '../../../../shared/bots/bot-row-status'
import { botFoldLiveStatus, rollUpBotStatus } from '../../../../shared/bots/bot-sidebar-workspaces'
import { BotAvatar } from './BotAvatar'
import { BotRowFoldToggle, type BotRowFold } from './BotRowFoldToggle'
import { useBotSoulDescription } from './bot-soul-description'
import {
  botRowLineAge,
  BotHoverLatestLine,
  BotRowLineView,
  useBotRowLine
} from './BotRowActivityLine'
import { BotSidebarRow } from './BotSidebarRow'
import { usageLimitStopTip } from './BotUsageLimitMark'
import { BotUpNextCount } from './BotUpNextCount'
import { useBotHostLabel } from './use-bot-host-label'
import { revealBotUpNext } from './bot-up-next-reveal'
import { useDeleteBot } from './use-delete-bot'
import { setBotPurpose } from './bot-purpose-cache'
import { botSidebarEntryKey } from './bot-sidebar-entry-keys'
import { NewBotDialog } from './NewBotDialog'
import { useBotCanClone } from './NewBotCloneParts'

type BotRowProps = {
  bot: Bot
  home: FolderWorkspace
  isActive: boolean
  onOpen: () => void
  /** The fold toggle for a bot with workspaces. */
  fold?: BotRowFold | null
  /** The Bots section's reorder: this row is where a drag starts. */
  dragHandle?: boolean
}

export function BotRow({
  bot,
  home,
  isActive,
  onOpen,
  fold = null,
  dragHandle = false
}: BotRowProps): React.JSX.Element {
  const t = useTranslate()
  const workspaceId = folderWorkspaceKey(home.id)
  // Its own turn and its live workers in one badge; a failed worker shows only on the fold strip.
  const workers = fold ? botFoldLiveStatus(fold.counts) : null
  const status = foldBotStatus(
    rollUpBotStatus(useWorktreeActivityStatus(workspaceId), workers ? [workers] : []),
    bot.paused
  )
  const hostLabel = useBotHostLabel(bot.hostId)
  // Its server is down: the row stays from the last read, dimmed, with its actions off.
  const offline = useBotHostOffline(bot.hostId)
  const isUnread = home.isUnread && !offline
  const upNextNew = useBotUpNextUnseen(bot)
  const { line, limit, now } = useBotRowLine(bot, home)
  const age = offline ? null : botRowLineAge(line, now)
  // Doing nothing: neither its own turn nor any of its workspaces works or waits on you.
  const idle = !offline && (status === 'active' || status === 'inactive')
  const hostPill = hostLabel ? <WorktreeHostContextBadge label={hostLabel} /> : null
  // With no recent activity the line falls back to what the bot is for, so the row never shows a blank line.
  const description = useBotSoulDescription({ bot, folderPath: home.folderPath })
  // The Bots search matches purposes from what each listed row shows; it never reads SOUL.md.
  const purposeKey = botSidebarEntryKey(bot)
  useEffect(() => {
    setBotPurpose(purposeKey, description)
  }, [purposeKey, description])
  useEffect(() => () => setBotPurpose(purposeKey, null), [purposeKey])

  // Opening never unfolds; only the chevron folds. A double-click's second click renames, a held key repeats.
  const open = (event: { detail: number; repeat?: boolean }): void => {
    if (!(event.detail > 1 || event.repeat)) {
      openBotFromSidebar(bot, onOpen)
    }
  }
  const run = (work: Promise<unknown>): void => {
    work.catch((error: unknown) => toast.error(botErrorMessage(error)))
  }
  const handleDelete = useDeleteBot(bot)
  const [cloning, setCloning] = useState(false)
  const canClone = useBotCanClone(bot.hostId)

  return (
    <>
      <BotSidebarRow
        avatar={<BotAvatar bot={bot} className="size-9 rounded-md text-sm" />}
        name={bot.name}
        workspaceId={workspaceId}
        hostId={bot.hostId}
        status={offline ? null : status}
        stopTip={!offline && limit ? usageLimitStopTip(t, limit.stop) : null}
        isUnread={isUnread}
        isActive={isActive}
        expanded={fold ? !fold.folded : undefined}
        dimmed={bot.paused || offline}
        actionsDisabled={offline}
        dragHandle={dragHandle}
        onOpen={open}
        onRename={async (name) => {
          try {
            await updateBot(bot, { name })
          } catch (error) {
            throw new Error(botErrorMessage(error))
          }
        }}
        age={age}
        idle={idle}
        line={
          // Time by the name, Up next count under it; both end where the fold strip starts.
          line || limit || description || fold || upNextNew > 0 || hostPill || offline ? (
            <BotRowLineView
              line={line}
              limit={offline ? null : limit}
              fallback={description}
              unread={isUnread}
              now={now}
              disconnected={offline}
              leading={hostPill}
              trailing={
                upNextNew > 0 && !offline ? (
                  <BotUpNextCount
                    count={upNextNew}
                    onReveal={() => {
                      if (openBotFromSidebar(bot, onOpen)) {
                        revealBotUpNext(bot.id)
                      }
                    }}
                  />
                ) : null
              }
            />
          ) : null
        }
        trailing={fold ? <BotRowFoldToggle name={bot.name} fold={fold} /> : null}
        hoverDetails={() => (
          <BotHoverDetails
            bot={bot}
            home={home}
            workspaceId={workspaceId}
            status={status}
            hostLabel={hostLabel}
            offline={offline}
            latest={<BotHoverLatestLine line={line} now={now} />}
          />
        )}
        menuItems={
          <>
            <ContextMenuItem onSelect={() => openBotSettings(bot.id)}>
              <Settings className="size-3.5" />
              {t('bots.row.settings', 'Bot settings…')}
            </ContextMenuItem>
            {canClone ? (
              <ContextMenuItem disabled={offline} onSelect={() => setCloning(true)}>
                <CopyPlus className="size-3.5" />
                {t('bots.row.clone', 'Clone bot…')}
              </ContextMenuItem>
            ) : null}
            <ContextMenuItem
              disabled={offline}
              onSelect={() => run(updateBot(bot, { paused: !bot.paused }))}
            >
              {bot.paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
              {bot.paused ? t('bots.row.resume', 'Resume bot') : t('bots.row.pause', 'Pause bot')}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => window.api.ui.writeClipboardText(home.folderPath)}>
              <Copy className="size-3.5" />
              {t('bots.row.copyPath', 'Copy Path')}
            </ContextMenuItem>
          </>
        }
        menuFooter={
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              variant="destructive"
              disabled={offline}
              onSelect={() => void handleDelete()}
            >
              <Trash2 className="size-3.5" />
              {t('bots.row.delete', 'Delete bot')}
            </ContextMenuItem>
          </>
        }
      />
      {cloning ? (
        // The dialog's portal still bubbles React events through the sidebar entry; keep them from
        // dragging or opening rows there.
        <span
          className="contents"
          onPointerDown={stopEvent}
          onMouseDown={stopEvent}
          onClick={stopEvent}
          onDoubleClick={stopEvent}
          onKeyDown={stopEvent}
          onDragOver={stopEvent}
          onDrop={stopEvent}
        >
          <NewBotDialog open onOpenChange={setCloning} cloneFrom={bot} />
        </span>
      ) : null}
    </>
  )
}

const stopEvent = (event: React.SyntheticEvent): void => event.stopPropagation()

/** Opens the bot's home as clicking its sidebar row does; false when its home can't open yet. */
export function openBotFromSidebar(bot: Bot, onOpened: () => void): boolean {
  if (!openBotHome(bot)) {
    return false
  }
  onOpened()
  return true
}

function BotHoverDetails({
  bot,
  home,
  workspaceId,
  status,
  hostLabel,
  offline,
  latest
}: {
  bot: Bot
  home: FolderWorkspace
  workspaceId: string
  /** The row's badge: the bot's own turn rolled up with its live workers. */
  status: BotRowStatus
  /** Its paired server's name; null for this computer. */
  hostLabel: string | null
  offline: boolean
  /** The row's second line, whole. */
  latest: React.ReactNode
}): React.JSX.Element {
  const t = useTranslate()
  const current = useWorktreeAgentRows(workspaceId).find((row) => row.state === 'working')
  const description = useBotSoulDescription({ bot, folderPath: home.folderPath })
  const action = current
    ? formatAgentToolPreview(current.entry, current.state) || getAgentRowPrimaryText(current.entry)
    : ''
  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-3">
        <BotAvatar bot={bot} className="size-14 rounded-lg text-xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
          <div className="break-words text-[13px] font-semibold leading-snug text-foreground">
            {bot.name}
          </div>
          {description ? (
            <div className="line-clamp-2 text-xs text-foreground">{description}</div>
          ) : null}
          <div className="text-muted-foreground">
            {offline
              ? t('bots.row.hostDisconnected', '{{host}} disconnected', {
                  host: hostLabel ?? getLocalExecutionHostLabel()
                })
              : bot.paused
                ? t('bots.row.paused', 'Paused')
                : action ||
                  (status === 'active'
                    ? t('bots.row.idle', 'Idle')
                    : getWorktreeStatusLabel(status))}
          </div>
        </div>
      </div>
      {latest}
      <div className="mt-2.5 truncate border-t border-border pt-2 font-mono text-[11px] leading-snug text-muted-foreground">
        {hostLabel ?? getLocalExecutionHostLabel()} · {botFolderDisplay(bot.folder)}
      </div>
    </div>
  )
}
