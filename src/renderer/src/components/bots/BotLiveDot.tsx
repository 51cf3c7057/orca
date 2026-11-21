import React from 'react'
import { cn } from '@/lib/class-names'

export type BotLiveDotKind = 'permission' | 'working' | 'ready'

const DOT_COLOR: Record<BotLiveDotKind, string> = {
  permission: 'bg-workspace-activity-waiting',
  working: 'bg-workspace-activity-working',
  ready: 'bg-workspace-activity-ready'
}

/** A still dot in a live kind's colour: needs you, working or ready for input. The words go beside it. */
export function BotLiveDot({ kind }: { kind: BotLiveDotKind }): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      data-bot-live-dot={kind}
      className={cn('block size-1.5 shrink-0 rounded-full', DOT_COLOR[kind])}
    />
  )
}
