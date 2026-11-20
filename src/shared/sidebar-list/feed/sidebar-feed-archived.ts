import type { Repo } from '../../repository/repo-types'
import type { Worktree } from '../../worktree/types'
import { getWorktreeHostIdentity } from '../../worktree/host-qualified-identity'
import type { SidebarFeedDomains } from './sidebar-feed-domains'
import type { SidebarFeedView } from './sidebar-feed-rows'
import type { SidebarFeedWindowExtras } from '../sidebar-feed-extras'
import { withArchivedSectionRows } from '../sections/archived-section-rows'
import type { Row } from '../row-types'

export type FeedArchivedFiling = {
  isArchived: (worktree: Worktree) => boolean
  byRepo: ReadonlyMap<string, readonly Worktree[]>
}

/** Phone lists file merged and hand-archived workspaces under Archived. Other callers keep the flag-only rule. */
export function feedArchivedFiling(
  extras: SidebarFeedWindowExtras,
  view: SidebarFeedView,
  domains: SidebarFeedDomains,
  worktrees: readonly Worktree[]
): FeedArchivedFiling {
  const restored = new Set(view.archiveRestoredWorkspaceKeys ?? [])
  const isArchived = (worktree: Worktree): boolean => {
    if (!extras.fileUnderArchived) {
      return worktree.isArchived
    }
    if (worktree.isArchived) {
      return true
    }
    return (
      view.groupBy === 'repo' &&
      !worktree.isMainWorktree &&
      !worktree.isPinned &&
      !restored.has(getWorktreeHostIdentity(worktree)) &&
      domains.review.get(getWorktreeHostIdentity(worktree))?.reviewState === 'merged'
    )
  }
  const byRepo = new Map<string, Worktree[]>()
  if (extras.fileUnderArchived && view.groupBy === 'repo') {
    const filed = [...worktrees]
      .filter(isArchived)
      .sort((a, b) => b.lastActivityAt - a.lastActivityAt)
    for (const worktree of filed) {
      const list = byRepo.get(worktree.repoId)
      if (list) {
        list.push(worktree)
      } else {
        byRepo.set(worktree.repoId, [worktree])
      }
    }
  }
  return { isArchived, byRepo }
}

export function coverArchivedRepoPlaceholders(
  placeholders: Set<string>,
  byRepo: ReadonlyMap<string, readonly unknown[]>
): void {
  for (const repoId of byRepo.keys()) {
    placeholders.add(repoId)
  }
}

export function feedRowsWithArchivedSection(
  planned: {
    plan: { render: (groups: Set<string>) => Row[] }
    hostScoped: boolean
    archivedWorktreesByRepo: ReadonlyMap<string, readonly Worktree[]>
    repoOf: (worktree: Worktree) => Repo | undefined
  },
  collapsed: Set<string>,
  deferHostSectionCollapse: (groups: Set<string>) => Set<string>
): Row[] {
  return withArchivedSectionRows(
    planned.plan.render(planned.hostScoped ? deferHostSectionCollapse(collapsed) : collapsed),
    {
      archivedWorktreesByRepo: planned.archivedWorktreesByRepo,
      collapsedGroups: collapsed,
      repoOf: planned.repoOf
    }
  )
}
