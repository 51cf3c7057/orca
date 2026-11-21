import { useMemo, useState } from 'react'

import { migrationUnsupportedToAgentStatusEntry } from '../../../../../shared/agent-status/presentation/migration-unsupported-agent-entry'
import { useAppStore } from '@/store'
import { createAgentStatusEpochSelector } from '@/lib/agent-status/evidence/agent-status-epoch-selector'
import type { AppState } from '@/store/types'
import type { AgentStatusEntry } from '../../../../../shared/agent-status/contracts/agent-status-types'

import { freshActivityLiveAgentState, isHistoricalActivityState } from './activity-event-state'
import { useTeamMemberBots } from '@/components/bots/use-bot-teams'
import { folderWorkspaceKey } from '../../../../../shared/workspace/identity/workspace-scope'

const NO_IDS: readonly string[] = []

type ActivityUnreadCountSource = Pick<
  AppState,
  'acknowledgedAgentsByPaneKey' | 'agentStatusByPaneKey' | 'migrationUnsupportedByPtyId'
> & {
  /** Per-pane "Clear completed" cutoffs; hidden events must not count as unread. */
  activityClearedAtByPaneKey?: Record<string, number>
  /** Workspaces Activity doesn't list, such as a team member's home, and the tabs they hold. */
  hidden?: { workspaceIds: ReadonlySet<string>; tabIds: readonly string[] }
}

/** Whether the entry's pane is in a workspace Activity doesn't list, by its attribution or its tab. */
function isHiddenEntry(
  entry: AgentStatusEntry,
  hidden: ActivityUnreadCountSource['hidden']
): boolean {
  if (!hidden) {
    return false
  }
  if (entry.worktreeId && hidden.workspaceIds.has(entry.worktreeId)) {
    return true
  }
  // A pane key starts with its tab id; tab ids may hold colons, so match the whole prefix.
  return hidden.tabIds.some((tabId) => entry.paneKey.startsWith(`${tabId}:`))
}

/** Counts unread historical activity and fresh current turns. */
export function countActivityUnread(source: ActivityUnreadCountSource, now = Date.now()): number {
  let count = 0
  const seenPaneKeys = new Set<string>()

  // Workspace unread flags have no Activity row to clear and must not light this badge.
  const countEntry = (entry: AgentStatusEntry, ackAt: number, live = false): void => {
    if (isHiddenEntry(entry, source.hidden)) {
      return
    }
    // Treat Clear completed’s per-pane cutoff as an acknowledgement floor so hidden events cannot keep the badge lit.
    const clearedAt = source.activityClearedAtByPaneKey?.[entry.paneKey] ?? 0
    const mutedAt = Math.max(ackAt, clearedAt)
    // Mirror the feed’s historical done/blocked/waiting event count.
    for (const history of entry.stateHistory) {
      if (isHistoricalActivityState(history.state) && mutedAt < history.startedAt) {
        count += 1
      }
    }
    // Session-boundary idle connects (STA-3386) and monitoring snapshots create no unread events, so counting either would leave a badge with no row to clear.
    if (
      (isHistoricalActivityState(entry.state) ||
        (live && freshActivityLiveAgentState(entry, now) === 'working')) &&
      entry.sessionBoundary !== true &&
      mutedAt < entry.stateStartedAt
    ) {
      count += 1
    }
  }

  for (const [paneKey, entry] of Array.from(source.agentStatusByPaneKey.entries())) {
    seenPaneKeys.add(paneKey)
    countEntry(entry, source.acknowledgedAgentsByPaneKey[paneKey] ?? 0, true)
  }
  for (const unsupported of Object.values(source.migrationUnsupportedByPtyId)) {
    const entry = migrationUnsupportedToAgentStatusEntry(unsupported)
    if (entry && !seenPaneKeys.has(entry.paneKey)) {
      seenPaneKeys.add(entry.paneKey)
      countEntry(entry, source.acknowledgedAgentsByPaneKey[entry.paneKey] ?? 0)
    }
  }

  return count
}

// Same-turn heartbeats preserve receipts; reducer/freshness epoch changes cover turn/state changes, stale revival and expiry.
const createActivityUnreadCountSelector = () =>
  createAgentStatusEpochSelector(
    (
      state: AppState,
      migrationUnsupportedByPtyId: AppState['migrationUnsupportedByPtyId'],
      acknowledgedAgentsByPaneKey: AppState['acknowledgedAgentsByPaneKey'],
      activityClearedAtByPaneKey: AppState['activityClearedAtByPaneKey'],
      hidden: ActivityUnreadCountSource['hidden']
    ) =>
      countActivityUnread({
        agentStatusByPaneKey: state.agentStatusByPaneKey,
        migrationUnsupportedByPtyId,
        acknowledgedAgentsByPaneKey,
        activityClearedAtByPaneKey,
        hidden
      })
  )

export function useActivityUnreadCount(): number {
  const [selectActivityUnreadCount] = useState(createActivityUnreadCountSelector)
  // A team member's own chats are listed only in its team, as Activity's scope filter hides them.
  const memberBots = useTeamMemberBots()
  const workspaceIds = useMemo(
    () => new Set(memberBots.map((bot) => folderWorkspaceKey(bot.folderWorkspaceId))),
    [memberBots]
  )
  // Joined ids keep the selector's result stable between unrelated store writes.
  const tabKey = useAppStore((state) =>
    [...workspaceIds]
      .flatMap((id) => [
        ...(state.tabsByWorktree[id] ?? []).map((tab) => tab.id),
        ...(state.unifiedTabsByWorktree[id] ?? []).map((tab) => tab.id)
      ])
      .join('\n')
  )
  const hidden = useMemo(
    () => ({ workspaceIds, tabIds: tabKey ? tabKey.split('\n') : NO_IDS }),
    [workspaceIds, tabKey]
  )
  return useAppStore((state) =>
    selectActivityUnreadCount(
      state,
      state.migrationUnsupportedByPtyId,
      state.acknowledgedAgentsByPaneKey,
      state.activityClearedAtByPaneKey,
      hidden
    )
  )
}
