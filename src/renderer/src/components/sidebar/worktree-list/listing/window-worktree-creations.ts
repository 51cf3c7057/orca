import type { SidebarFeedDomains } from '../../../../../../shared/sidebar-list/feed/sidebar-feed-domains'
import type { WorkspaceCreation } from '../../../../../../shared/sidebar-list/feed-facts/workspace-creations'
import { parsePendingWorktreeCreationKey } from './pending-worktree-creation-keys'

/** Combine main’s shared creations with window-only preflight/server work and exclude locally completed requests. */
export function withWindowCreations(
  domains: SidebarFeedDomains,
  pendingCreationKeys: readonly string[],
  endedCreationIds: ReadonlySet<string>,
  hiddenCreationKeys: readonly string[] = []
): SidebarFeedDomains {
  let creations: Map<string, WorkspaceCreation> | null = null
  for (const creationId of endedCreationIds) {
    if (domains.creations.has(creationId)) {
      creations ??= new Map(domains.creations)
      creations.delete(creationId)
    }
  }
  for (const key of hiddenCreationKeys) {
    const { creationId } = parsePendingWorktreeCreationKey(key)
    if (domains.creations.has(creationId)) {
      creations ??= new Map(domains.creations)
      creations.delete(creationId)
    }
  }
  for (const key of pendingCreationKeys) {
    const { creationId, ...creation } = parsePendingWorktreeCreationKey(key)
    if (!domains.creations.has(creationId)) {
      creations ??= new Map(domains.creations)
      // Main drops its creation once the workspace is listed; the window's still names it while the chat opens.
      creations.set(creationId, creation)
    }
  }
  return creations ? { ...domains, creations } : domains
}
