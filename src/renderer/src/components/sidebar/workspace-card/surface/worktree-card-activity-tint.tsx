import React from 'react'

import { cn } from '@/lib/class-names'
import type { WorktreeStatus } from '../../../../../../shared/worktree/row-display/worktree-status-rollup'
import { useWorktreeActivityStatus } from '../activity/use-worktree-activity-status'
import { laneStatusWithLineage } from './worktree-card-lineage-lane-status'
import { useWorktreeCardLineageLaneStatus } from './worktree-card-title-status'

type ActivityTint = 'waiting' | 'working' | 'idle'

// Needs you outranks working, which outranks everything quiet (done, failed, stopped, no agents).
function activityTint(status: WorktreeStatus): ActivityTint {
  if (status === 'permission') {
    return 'waiting'
  }
  return status === 'working' || status === 'monitoring' ? 'working' : 'idle'
}

const TINT_CLASS_NAMES: Record<ActivityTint, string> = {
  waiting:
    'border-workspace-activity-waiting bg-workspace-activity-waiting/10 dark:bg-workspace-activity-waiting/15',
  working:
    'border-workspace-activity-working bg-workspace-activity-working/10 dark:bg-workspace-activity-working/15',
  idle: 'border-workspace-activity-idle bg-workspace-activity-idle/[0.07] dark:bg-workspace-activity-idle/10'
}

/** The "Activity color" wash and left accent; paints under the card's content (the surface isolates it). */
export function WorktreeCardActivityTint({
  worktreeId
}: {
  worktreeId: string
}): React.JSX.Element {
  // Same roll-up as the status lane, so a collapsed child that needs you tints its parent too.
  const status = laneStatusWithLineage(
    useWorktreeActivityStatus(worktreeId),
    useWorktreeCardLineageLaneStatus()
  )
  const tint = activityTint(status)
  return (
    <span
      aria-hidden="true"
      data-worktree-activity-tint={tint}
      className={cn(
        'pointer-events-none absolute inset-0 -z-10 border-l-[3px] transition-colors duration-200',
        TINT_CLASS_NAMES[tint]
      )}
    />
  )
}
