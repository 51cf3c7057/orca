import React from 'react'
import { ChevronDown } from 'lucide-react'
import StatusIndicator from '@/components/sidebar/workspace-card/surface/StatusIndicator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import type { BotWorkspaceLiveCounts } from '../../../../shared/bots/bot-sidebar-workspaces'
import { FOLD_TOGGLE_CLASS } from './BotChatRowControls'
import { BotLiveDot, type BotLiveDotKind } from './BotLiveDot'

export type BotRowFold = {
  folded: boolean
  counts: BotWorkspaceLiveCounts
  /** A team's member count; bot rows show their live counts alone. */
  total?: number
  onToggle: () => void
}

const LIVE_KINDS: readonly BotLiveDotKind[] = ['permission', 'working', 'ready']

/** The fold strip at a sidebar row's right edge, for a bot or a team. */
export function BotRowFoldToggle({
  name,
  fold
}: {
  name: string
  fold: BotRowFold
}): React.JSX.Element {
  const t = useTranslate()
  const { folded, total = 0, counts } = fold
  const failed = counts.failed > 0
  const live = folded ? LIVE_KINDS.filter((kind) => counts[kind] > 0) : []
  const toggleLabel = folded
    ? t('bots.chats.unfold', 'Unfold {{name}}', { name })
    : t('bots.chats.fold', 'Fold {{name}}', { name })
  const liveWords = live.map((kind) => {
    const count = counts[kind]
    if (kind === 'permission') {
      return t('bots.panel.needYou', '{{count}} need you', {
        count,
        defaultValue_one: '{{count}} needs you'
      })
    }
    return kind === 'working'
      ? t('bots.panel.working', '{{count}} working', { count })
      : t('bots.panel.ready', '{{count}} ready', { count })
  })
  const label = liveWords.length > 0 ? `${toggleLabel}: ${liveWords.join(', ')}` : toggleLabel
  const toggle = (
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
      {folded && (failed || live.length > 0 || total > 0) ? (
        // A failed workspace first, then how many need you, work or are ready; a team adds its member count.
        <span className="flex items-center gap-1.5">
          {failed ? <StatusIndicator status="failed" showTooltip={false} /> : null}
          {live.map((kind) => (
            <span key={kind} className="flex items-center gap-0.5">
              <BotLiveDot kind={kind} />
              {counts[kind]}
            </span>
          ))}
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
  if (liveWords.length === 0) {
    return toggle
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>{toggle}</TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}
