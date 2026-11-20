import type { ExecutionHostId } from '../../../../src/shared/execution-host/execution-host'
import type { HiddenProjects } from '../../../../src/shared/project/catalog/hidden-projects'
import { getArchivedSectionKey } from '../../../../src/shared/sidebar-list/sections/archived-section-rows'
import {
  getProjectGroupingForRepo,
  type ProjectGroupingIndex
} from '../../../../src/shared/sidebar-list/sections/project-section-grouping'
import type { Repo } from '../../../../src/shared/repository/repo-types'
import { composeWorktreeHostIdentity } from '../../../../src/shared/worktree/host-qualified-identity'
import { translate } from '../../i18n/mobile-i18n'
import { getMobileOccurrenceRows } from '../agent-lineage/mobile-workspace-lineage'
import type { WorktreeOccurrencePlan } from '../../../../src/shared/sidebar-list/lineage/worktree-occurrence-plan'
import { getWorktreeRowIdentity } from '../row-presentation/worktree-host-row-identity'
import type { WorktreeHostContextOf } from '../row-presentation/worktree-host-context-labels'
import {
  placeInProjectGroupTree,
  type GroupTreePlacement
} from '../project-sections/project-group-tree-sections'
import { filterWorktrees } from './workspace-row-filtering'
import type { FilterState, Section, SectionRepo, Worktree } from './workspace-list-types'

/** Project grouping files a merged or hand-archived workspace under Archived. Main, pinned and restored rows stay active. */
export function isPhoneSidebarArchived(
  worktree: Worktree,
  pinnedIds: ReadonlySet<string>,
  restoredKeys: ReadonlySet<string>
): boolean {
  if (worktree.isArchived === true) {
    return true
  }
  if (
    worktree.workspaceKind === 'folder-workspace' ||
    worktree.isMainWorktree === true ||
    worktree.isPinned === true ||
    pinnedIds.has(worktree.worktreeId)
  ) {
    return false
  }
  if (restoredKeys.has(composeWorktreeHostIdentity(worktree.hostId, worktree.worktreeId))) {
    return false
  }
  return worktree.linkedPR?.state === 'merged'
}

export function selectPhoneArchivedRows(args: {
  worktrees: readonly Worktree[]
  groupMode: string
  pinnedIds: ReadonlySet<string>
  restoredKeys: ReadonlySet<string>
  filters: FilterState
  search: string
  repoHostIdByRepoId: ReadonlyMap<string, ExecutionHostId>
  hiddenProjects: HiddenProjects
  childrenByParentIdentity?: ReadonlyMap<string, readonly Worktree[]>
}): { active: Worktree[]; archived: Worktree[] } {
  if (args.groupMode !== 'repo') {
    return { active: [...args.worktrees], archived: [] }
  }
  const candidates = args.worktrees.filter((row) =>
    isPhoneSidebarArchived(row, args.pinnedIds, args.restoredKeys)
  )
  const identities = new Set(candidates.map(getWorktreeRowIdentity))
  const active =
    identities.size === 0
      ? [...args.worktrees]
      : args.worktrees.filter((row) => !identities.has(getWorktreeRowIdentity(row)))
  return {
    active: filterWorktrees(
      active,
      args.filters,
      args.search,
      args.repoHostIdByRepoId,
      args.hiddenProjects,
      args.childrenByParentIdentity
    ),
    archived: filterWorktrees(
      candidates,
      { ...args.filters, hideSleepingWorkspaces: false },
      args.search,
      args.repoHostIdByRepoId,
      args.hiddenProjects,
      args.childrenByParentIdentity,
      true
    )
  }
}

export function groupPhoneArchivedByProject(
  rows: readonly Worktree[],
  repoMap: ReadonlyMap<string, Repo | SectionRepo>,
  projectIndex: ProjectGroupingIndex | null
): Map<string, Worktree[]> {
  const byKey = new Map<string, Worktree[]>()
  for (const row of rows) {
    const key = getProjectGroupingForRepo(row.repoId, repoMap, projectIndex).key
    const list = byKey.get(key)
    if (list) {
      list.push(row)
    } else {
      byKey.set(key, [row])
    }
  }
  return byKey
}

type PhoneOccurrencePlan = WorktreeOccurrencePlan<Worktree> & {
  sections: ReadonlyArray<{ key: string; data: Worktree[]; items?: unknown; placement?: string }>
}

export function renderPhoneSectionsWithArchived(
  plan: PhoneOccurrencePlan,
  placements: ReadonlyMap<string, GroupTreePlacement>,
  archivedByProjectKey: ReadonlyMap<string, readonly Worktree[]>,
  collapsed: ReadonlySet<string>,
  hostContextOf: WorktreeHostContextOf
): Section[] {
  const listed = plan.sections.flatMap((section) => {
    const { items: _items, placement: _placement, data: _data, ...rest } = section
    const placed = placeInProjectGroupTree(
      {
        ...(rest as Omit<Section, 'data'>),
        data: getMobileOccurrenceRows(plan, section.key, collapsed, hostContextOf)
      },
      placements.get(section.key),
      collapsed
    )
    return placed ? [placed] : []
  })
  return appendPhoneArchivedSections(listed, archivedByProjectKey, collapsed, hostContextOf)
}

export function appendPhoneArchivedSections(
  sections: readonly Section[],
  archivedByProjectKey: ReadonlyMap<string, readonly Worktree[]>,
  collapsed: ReadonlySet<string>,
  hostContextOf: WorktreeHostContextOf
): Section[] {
  if (archivedByProjectKey.size === 0) {
    return [...sections]
  }
  const withArchived: Section[] = []
  for (const section of sections) {
    withArchived.push(section)
    const archived = archivedByProjectKey.get(section.key)
    if (!archived?.length || collapsed.has(section.key)) {
      continue
    }
    withArchived.push({
      key: getArchivedSectionKey(section.key),
      title: translate('worktree.workspaceListSections.archived', 'Archived'),
      count: archived.length,
      ...(section.repo ? { repo: section.repo } : {}),
      data: archived.map((row) => ({ row, view: hostContextOf(row) ?? {} }))
    })
  }
  return withArchived
}
