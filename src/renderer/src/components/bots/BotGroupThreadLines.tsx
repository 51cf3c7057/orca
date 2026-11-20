import React, { useMemo } from 'react'
import { MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/class-names'
import { useAppStore } from '@/store'
import { selectDrawsNewWorktreeCards } from '@/store/appearance/worktree-card-style'
import { openBotGroupRoom, selectActiveBotGroupRoomId } from '@/lib/bot-group-catalog'
import { botGroupRoomLabel } from '@/lib/bot-group-room-label'
import type { BotGroup } from '../../../../shared/bots/bot-group'
import {
  BOT_WORKSPACE_LINE_INDENT,
  BOT_WORKSPACE_LINE_INDENT_NEW_CARD_STYLE
} from './BotSidebarEntry'

/** A team's threads under its row, oldest first as their tabs opened; each line opens its room. */
export function BotGroupThreadLines({ group }: { group: BotGroup }): React.JSX.Element | null {
  const newCardStyle = useAppStore(selectDrawsNewWorktreeCards)
  const activeRoomId = useAppStore(selectActiveBotGroupRoomId)
  const threads = useMemo(
    () => [...(group.threads ?? [])].sort((a, b) => a.createdAt - b.createdAt),
    [group.threads]
  )
  if (threads.length === 0) {
    return null
  }
  return (
    <div
      className="flex flex-col gap-1"
      style={{
        marginLeft: newCardStyle
          ? BOT_WORKSPACE_LINE_INDENT_NEW_CARD_STYLE
          : BOT_WORKSPACE_LINE_INDENT
      }}
    >
      {threads.map((thread) => {
        const label = botGroupRoomLabel(group, thread.id)
        const active = thread.id === activeRoomId
        return (
          <button
            key={thread.id}
            type="button"
            aria-current={active ? 'true' : undefined}
            className={cn(
              'flex h-6 w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-md pr-0.5 pl-1 text-left text-xs text-muted-foreground outline-none hover:bg-sidebar-accent focus-visible:ring-[3px] focus-visible:ring-ring/50',
              active && 'bg-sidebar-accent'
            )}
            onClick={() => {
              void openBotGroupRoom(group, thread.id, label).catch((error: unknown) =>
                toast.error(String(error))
              )
            }}
          >
            <MessageSquare aria-hidden className="size-3 shrink-0 text-muted-foreground" />
            <span
              className={cn('min-w-0 flex-1 truncate text-foreground', active && 'font-semibold')}
            >
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
