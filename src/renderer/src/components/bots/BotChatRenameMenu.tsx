import React, { useMemo, useState } from 'react'
import { Pencil } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { WorktreeTitleInlineRename } from '@/components/sidebar/workspace-card/identity/WorktreeTitleInlineRename'
import { useTranslate } from '@/i18n/use-translate'
import type { BotOnHost } from '@/lib/bot-hosts'
import { useBotHostOffline } from '@/lib/bot-host-views'
import type { BotChatTreeChat } from '../../../../shared/bots/bot-chat-tree'
import { renameBotChat } from './bot-chat-rename'

/** One chat row's rename: requested by its menu, carried out by its title. */
export type BotChatRename = {
  requested: boolean
  request: () => void
  consumed: () => void
  save: (name: string) => Promise<void>
}

/** Null for a row that cannot be renamed: the Home Chat, an automation run, or an offline host. */
export function useBotChatRename(
  bot: BotOnHost,
  chat: Pick<BotChatTreeChat, 'chatId' | 'sessionId' | 'origin' | 'run'>
): BotChatRename | null {
  const offline = useBotHostOffline(bot.hostId)
  const [requested, setRequested] = useState(false)
  const renameable = chat.origin !== 'home' && !chat.run && !offline
  const { chatId, sessionId } = chat
  return useMemo(
    () =>
      renameable
        ? {
            requested,
            request: () => setRequested(true),
            consumed: () => setRequested(false),
            save: (name) => renameBotChat(bot, { chatId, sessionId }, name)
          }
        : null,
    [bot, chatId, sessionId, renameable, requested]
  )
}

/** The row's right-click menu; a row with nothing to offer opens none. */
export function BotChatRenameMenu({
  rename,
  children
}: {
  rename: BotChatRename | null
  children: React.ReactElement
}): React.JSX.Element {
  const t = useTranslate()
  if (!rename) {
    return children
  }
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onSelect={rename.request}>
          <Pencil className="size-3.5" />
          {t('bots.row.rename', 'Rename')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

/** The chat's name; a double-click or the menu turns it into a field while rename is offered. */
export function BotChatRenameTitle({
  rename,
  title,
  className,
  onRenameStart
}: {
  rename: BotChatRename | null
  title: string
  className?: string
  /** Runs when a double-click starts the rename. */
  onRenameStart?: () => void
}): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  if (!rename) {
    return <span className={className}>{title}</span>
  }
  // The field mounts only for an edit, so an idle name stays a plain span: no tab stop, no tooltip.
  if (!rename.requested && !editing) {
    return (
      <span
        className={className}
        onDoubleClick={() => {
          onRenameStart?.()
          rename.request()
        }}
      >
        {title}
      </span>
    )
  }
  return (
    <WorktreeTitleInlineRename
      displayName={title}
      className={className}
      editingClassName="flex-1"
      onRename={rename.save}
      onEditingChange={setEditing}
      beginEditing={rename.requested}
      onBeginEditingConsumed={rename.consumed}
    />
  )
}
