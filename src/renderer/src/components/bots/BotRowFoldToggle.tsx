import React from 'react'
import { ChevronDown } from 'lucide-react'
import StatusIndicator from '@/components/sidebar/workspace-card/surface/StatusIndicator'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import {
  botFoldLiveStatus,
  type BotWorkspaceLiveCounts
} from '../../../../shared/bots/bot-sidebar-workspaces'
import { FOLD_TOGGLE_CLASS } from './BotChatRowControls'

export type BotRowFold = {
  folded: boolean
  total: number
  counts: BotWorkspaceLiveCounts
  onToggle: () => void
}

/** The fold strip at a sidebar row's right edge, for a bot or a team. */
export function BotRowFoldToggle({
  name,
  fold
}: {
  name: string
  fold: BotRowFold
}): React.JSX.Element {
  const t = useTranslate()
  const { folded, total, counts } = fold
  const live = botFoldLiveStatus(counts)
  const label = folded
    ? t('bots.chats.unfold', 'Unfold {{name}}', { name })
    : t('bots.chats.fold', 'Fold {{name}}', { name })
  return (
    // The row's whole right edge, top to bottom, so it is easy to hit; a folded summary widens it
    // leftward.
    <button
      type="button"
      className={cn(
        FOLD_TOGGLE_CLASS,
        // Negative margins cancel the row's padding so the strip spans its full height and right
        // edge; the row's rounded overflow clips its corners.
        '-mt-1.25 -mr-1.5 -mb-1.25 min-w-10 gap-0.5 self-stretch rounded-none px-1.5 text-xs tabular-nums',
        'focus-visible:ring-2 focus-visible:ring-inset',
        // A narrow row keeps its width for the name and time where a pointer can hover: at rest the
        // strip shrinks to what it shows (nothing while unfolded), and widens on row hover or its own
        // focus. Touch keeps the full strip, since nothing would reveal it.
        'can-hover:pointer-fine:@max-[15rem]/bot-row:mr-0 can-hover:pointer-fine:@max-[15rem]/bot-row:min-w-0 can-hover:pointer-fine:@max-[15rem]/bot-row:px-0',
        'can-hover:pointer-fine:@max-[15rem]/bot-row:group-hover/bot-row:-mr-1.5 can-hover:pointer-fine:@max-[15rem]/bot-row:group-hover/bot-row:min-w-10 can-hover:pointer-fine:@max-[15rem]/bot-row:group-hover/bot-row:px-1.5',
        'can-hover:pointer-fine:@max-[15rem]/bot-row:focus-visible:-mr-1.5 can-hover:pointer-fine:@max-[15rem]/bot-row:focus-visible:min-w-10 can-hover:pointer-fine:@max-[15rem]/bot-row:focus-visible:px-1.5',
        !folded &&
          'can-hover:pointer-fine:@max-[15rem]/bot-row:-ml-1 can-hover:pointer-fine:@max-[15rem]/bot-row:w-0 can-hover:pointer-fine:@max-[15rem]/bot-row:overflow-hidden can-hover:pointer-fine:@max-[15rem]/bot-row:group-hover/bot-row:ml-0 can-hover:pointer-fine:@max-[15rem]/bot-row:group-hover/bot-row:w-auto can-hover:pointer-fine:@max-[15rem]/bot-row:focus-visible:ml-0 can-hover:pointer-fine:@max-[15rem]/bot-row:focus-visible:w-auto'
      )}
      aria-label={label}
      aria-expanded={!folded}
      onClick={(event) => {
        event.stopPropagation()
        fold.onToggle()
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {folded && (live || total > 0) ? (
        // The status of its most urgent live workspace, then how many it has in all.
        <span className="flex items-center gap-0.5">
          {live ? <StatusIndicator status={live} showTooltip={false} /> : null}
          {total > 0 ? total : null}
        </span>
      ) : null}
      <span className="flex size-4 items-center justify-center">
        <ChevronDown
          className={cn(
            'size-3.5 transition-transform',
            folded
              ? '-rotate-90'
              : "can-hover:opacity-0 group-hover/bot-row:opacity-100 [[class~='group/bot-row']:has(:focus-visible)_&]:opacity-100"
          )}
        />
      </span>
    </button>
  )
}
