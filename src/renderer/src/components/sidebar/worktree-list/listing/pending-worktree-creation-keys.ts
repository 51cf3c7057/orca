import type { AppState } from '@/store/types'
import { pendingWorktreeCreationIsVisible } from '@/lib/workspace/creation/pending-worktree-creation'

// Why frozen: the sidebar row model is always mounted and this list is empty
// almost always, so one shared identity serves every read.
export const EMPTY_PENDING_WORKTREE_CREATION_KEYS: string[] = Object.freeze(
  []
) as unknown as string[]

const keysBySource = new WeakMap<object, { visible: string[]; hidden: string[] }>()

// NUL cannot occur in a repo id or a path, so it ends the repo id unambiguously.
const WORKTREE_ID_SEPARATOR = '\0'

/** Split on the first space because UUID creation IDs cannot contain spaces. */
export function parsePendingWorktreeCreationKey(key: string): {
  creationId: string
  repoId: string
  worktreeId?: string
} {
  const space = key.indexOf(' ')
  const end = key.indexOf(WORKTREE_ID_SEPARATOR, space)
  return end === -1
    ? { creationId: key.slice(0, space), repoId: key.slice(space + 1) }
    : {
        creationId: key.slice(0, space),
        repoId: key.slice(space + 1, end),
        worktreeId: key.slice(end + 1)
      }
}

/** Cache creationId/repoId keys per slice; a creation still handing off its created worktree names it too. */
export function selectPendingWorktreeCreationKeys(
  pendingWorktreeCreations: AppState['pendingWorktreeCreations'] | undefined,
  visibility: 'visible' | 'hidden' = 'visible'
): string[] {
  if (!pendingWorktreeCreations) {
    return EMPTY_PENDING_WORKTREE_CREATION_KEYS
  }
  const cached = keysBySource.get(pendingWorktreeCreations)
  if (cached) {
    return cached[visibility]
  }
  const keys: { visible: string[]; hidden: string[] } = { visible: [], hidden: [] }
  for (const creation of Object.values(pendingWorktreeCreations)) {
    const key = `${creation.creationId} ${creation.request.repoId}`
    keys[pendingWorktreeCreationIsVisible(creation) ? 'visible' : 'hidden'].push(
      // A failed handoff keeps its own row: that row holds the retry.
      creation.status === 'creating' && creation.worktreeId
        ? `${key}${WORKTREE_ID_SEPARATOR}${creation.worktreeId}`
        : key
    )
  }
  if (keys.visible.length === 0) {
    keys.visible = EMPTY_PENDING_WORKTREE_CREATION_KEYS
  }
  if (keys.hidden.length === 0) {
    keys.hidden = EMPTY_PENDING_WORKTREE_CREATION_KEYS
  }
  keysBySource.set(pendingWorktreeCreations, keys)
  return keys[visibility]
}
