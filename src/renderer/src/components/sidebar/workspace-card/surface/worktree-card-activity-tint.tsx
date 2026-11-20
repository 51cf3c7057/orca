import React from 'react'

import { cn } from '@/lib/class-names'
import type { WorktreeStatus } from '../../../../../../shared/worktree/row-display/worktree-status-rollup'
import { useWorktreeActivityStatus } from '../activity/use-worktree-activity-status'
import type { SlotException } from '../slots/worktree-card-slot-signal'
import { useWorktreeCardLineageExceptions } from './worktree-card-title-status'

type ActivityTint = 'waiting' | 'working' | 'merged' | 'ready'

/** Needs you, then any agent still working (a failed one never hides it), then a merged PR, then ready for input. */
export function activityTint(
  own: WorktreeStatus,
  collapsedLineage: readonly SlotException[],
  prMerged: boolean
): ActivityTint {
  if (own === 'permission' || collapsedLineage.some((e) => e.kind === 'needs')) {
    return 'waiting'
  }
  if (
    own === 'working' ||
    own === 'monitoring' ||
    collapsedLineage.some((e) => e.kind === 'working')
  ) {
    return 'working'
  }
  return prMerged ? 'merged' : 'ready'
}

const TINT_CLASS_NAMES: Record<ActivityTint, string> = {
  waiting:
    'border-workspace-activity-waiting bg-workspace-activity-waiting/10 dark:bg-workspace-activity-waiting/15',
  working:
    'border-workspace-activity-working bg-workspace-activity-working/10 dark:bg-workspace-activity-working/15',
  merged:
    'border-workspace-activity-merged bg-workspace-activity-merged/[0.07] dark:bg-workspace-activity-merged/10',
  ready:
    'border-workspace-activity-ready bg-workspace-activity-ready/[0.07] dark:bg-workspace-activity-ready/10'
}

/**
 * The "Activity color" wash and left accent, behind the parent's own content (the surface isolates it).
 * Top, right and, without children, bottom overshoot into the surface's padding, which clips them.
 */
export function WorktreeCardActivityTint({
  worktreeId,
  prMerged,
  surfacePaddingLeft,
  hasExpandedChildren
}: {
  worktreeId: string
  prMerged: boolean
  surfacePaddingLeft: string | undefined
  hasExpandedChildren: boolean
}): React.JSX.Element {
  const tint = activityTint(
    useWorktreeActivityStatus(worktreeId, { ignoreFailed: true }),
    useWorktreeCardLineageExceptions(),
    prMerged
  )
  return (
    <span
      aria-hidden="true"
      data-worktree-activity-tint={tint}
      className={cn(
        'pointer-events-none absolute -top-4 -z-10 border-l-[3px] transition-colors duration-200',
        // With children it ends inside the card, so it matches the surface's pr-1.5 to round both corners.
        hasExpandedChildren ? '-right-1.5 -bottom-1 rounded-b-lg' : '-right-4 -bottom-4',
        TINT_CLASS_NAMES[tint]
      )}
      style={{ left: surfacePaddingLeft ? `calc(-1 * ${surfacePaddingLeft})` : 0 }}
    />
  )
}
