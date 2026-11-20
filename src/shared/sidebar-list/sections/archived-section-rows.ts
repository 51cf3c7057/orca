import type { Worktree } from '../../worktree/types'
import { getWorktreeHostIdentity } from '../../worktree/host-qualified-identity'
import type { GroupHeaderRow, RepoOfWorktree, Row } from '../row-types'

const ARCHIVED_SECTION_KEY_PREFIX = 'archived-open:'

/** The section folds by default, so the persisted collapse set holds the open ones. */
export function getArchivedSectionKey(projectKey: string): string {
  return `${ARCHIVED_SECTION_KEY_PREFIX}${projectKey}`
}

export function isArchivedSectionKey(key: string): boolean {
  return key.startsWith(ARCHIVED_SECTION_KEY_PREFIX)
}

function appendArchivedSection(
  result: Row[],
  header: GroupHeaderRow & { repo: NonNullable<GroupHeaderRow['repo']> },
  worktrees: readonly Worktree[],
  args: { collapsedGroups: ReadonlySet<string>; repoOf: RepoOfWorktree }
): void {
  const key = getArchivedSectionKey(header.key)
  const open = args.collapsedGroups.has(key)
  const groupDepth = header.projectGroupDepth ?? 0
  result.push({
    type: 'archived-section',
    key,
    repo: header.repo,
    count: worktrees.length,
    open,
    groupDepth
  })
  if (!open) {
    return
  }
  // Flat cards: an archived row keeps no lineage nesting and no manual order.
  for (const worktree of worktrees) {
    result.push({
      type: 'item',
      rowKey: `${key}:${getWorktreeHostIdentity(worktree)}`,
      sectionKey: key,
      worktree,
      repo: args.repoOf(worktree),
      depth: 0,
      groupDepth,
      isLastLineageChild: false,
      lineageChildCount: 0
    })
  }
}

/** Repo ids that still need a project header so their Archived section has a place to sit. */
export function placeholderRepoIdsCoveringArchivedProjects(
  placeholders: ReadonlySet<string>,
  archivedRepoIds: Iterable<string>
): Set<string> {
  const next = new Set(placeholders)
  for (const repoId of archivedRepoIds) {
    next.add(repoId)
  }
  return next
}

/** Keys to toggle so reveal can scroll to a card filed under Archived.
 *  The section stores who is open, the opposite of every other group. */
export function collapsedGroupKeysToRevealArchivedCard(args: {
  collapsedGroups: ReadonlySet<string>
  projectKey: string
  hostKey?: string
}): string[] {
  const keys: string[] = []
  if (args.hostKey && args.collapsedGroups.has(args.hostKey)) {
    keys.push(args.hostKey)
  }
  if (args.collapsedGroups.has(args.projectKey)) {
    keys.push(args.projectKey)
  }
  const archivedKey = getArchivedSectionKey(args.projectKey)
  if (!args.collapsedGroups.has(archivedKey)) {
    keys.push(archivedKey)
  }
  return keys
}

/** Ends each expanded project's rows with its Archived section; a project's rows run to the next header. */
export function withArchivedSectionRows(
  rows: Row[],
  args: {
    archivedWorktreesByRepo: ReadonlyMap<string, readonly Worktree[]>
    collapsedGroups: ReadonlySet<string>
    repoOf: RepoOfWorktree
  }
): Row[] {
  if (args.archivedWorktreesByRepo.size === 0) {
    return rows
  }
  const result: Row[] = []
  let project: (GroupHeaderRow & { repo: NonNullable<GroupHeaderRow['repo']> }) | null = null
  const closeProject = (): void => {
    const archived = project ? args.archivedWorktreesByRepo.get(project.repo.id) : undefined
    if (project && archived?.length) {
      appendArchivedSection(result, project, archived, args)
    }
    project = null
  }
  for (const row of rows) {
    if (row.type === 'header') {
      closeProject()
      if (row.icon.kind === 'project' && row.repo && !args.collapsedGroups.has(row.key)) {
        project = { ...row, repo: row.repo }
      }
    }
    result.push(row)
  }
  closeProject()
  return result
}
