import type { PersistedUIState } from '../../../../../shared/orca-profiles/persisted-ui-state-types'
import type { UISlice, UISliceSet } from './ui-slice-contract'
import { hydrateWslMovedSection } from './ui-slice-wsl-moved-section-actions'

// Bounds a profile that restores merged workspaces for years; the oldest marks drop first.
const MAX_ARCHIVE_RESTORED_WORKSPACE_KEYS = 500

function boundedKeys(keys: Iterable<unknown>): string[] {
  return [...new Set([...keys].filter((key): key is string => typeof key === 'string'))].slice(
    -MAX_ARCHIVE_RESTORED_WORKSPACE_KEYS
  )
}

export function hydrateArchivedSection(
  ui: PersistedUIState
): Pick<UISlice, 'archiveRestoredWorkspaceKeys'> {
  const keys = Array.isArray(ui.archiveRestoredWorkspaceKeys) ? ui.archiveRestoredWorkspaceKeys : []
  return { archiveRestoredWorkspaceKeys: new Set(boundedKeys(keys)) }
}

/** Both persisted sidebar sections, so hydration stays one spread (max-lines). */
export function hydrateSidebarSectionState(ui: PersistedUIState) {
  return { ...hydrateWslMovedSection(ui), ...hydrateArchivedSection(ui) }
}

export function createUiArchivedSectionActions(set: UISliceSet): Partial<UISlice> {
  return {
    archiveRestoredWorkspaceKeys: new Set<string>(),
    setArchiveRestoredWorkspace: (key, restored) =>
      set((s) => {
        if (s.archiveRestoredWorkspaceKeys.has(key) === restored) {
          return s
        }
        const next = new Set(s.archiveRestoredWorkspaceKeys)
        if (restored) {
          next.add(key)
        } else {
          next.delete(key)
        }
        const kept = boundedKeys(next)
        window.api.ui.set({ archiveRestoredWorkspaceKeys: kept }).catch(console.error)
        return { archiveRestoredWorkspaceKeys: new Set(kept) }
      })
  }
}
