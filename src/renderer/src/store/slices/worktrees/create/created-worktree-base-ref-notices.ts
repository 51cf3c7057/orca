import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import { runtimeEnvironmentSupportsCapability } from '@/runtime/rpc/compatibility/runtime-capability-proof'
import type { GlobalSettings } from '../../../../../../shared/settings/global-settings-types'
import type { RuntimeClientTarget } from '../../../../../../shared/remote-runtime/host-catalog/runtime-client-target'
import { WORKTREE_CREATE_HOST_OWNED_SETTINGS_RUNTIME_CAPABILITY } from '../../../../../../shared/remote-runtime/protocol/worktree-runtime-capabilities'
import type { ExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import type { CreateWorktreeResult } from '../../../../../../shared/worktree/create-types'
import type { AppState } from '@/store/types'
import { showLocalBaseRefUpdateSuggestionToast } from '@/components/sidebar/workspace-creation/base-ref-update/local-base-ref-suggestion-toast'
import { requestWorktreeBaseFallbackNotice } from '@/components/sidebar/workspace-creation/base-ref-update/worktree-base-fallback-notice'
import { showLocalBaseRefRefreshToast } from './local-base-ref-refresh-toast'

type SettingsWriter = {
  updateSettings: (updates: Partial<GlobalSettings>) => Promise<void>
  getSettings: () => GlobalSettings | null
}

/** Where a toast about a create saves its choice: the host that made the workspace, when it owns its create settings. */
function creationHostSettingsWriter(
  target: RuntimeClientTarget,
  local: SettingsWriter
): SettingsWriter {
  if (target.kind !== 'environment') {
    return local
  }
  let saved: Partial<GlobalSettings> = {}
  return {
    updateSettings: async (updates) => {
      // Older hosts take this app's values with each create, so the choice belongs here.
      if (
        !(await runtimeEnvironmentSupportsCapability(
          target.environmentId,
          WORKTREE_CREATE_HOST_OWNED_SETTINGS_RUNTIME_CAPABILITY
        ))
      ) {
        await local.updateSettings(updates)
        return
      }
      await callRuntimeRpc(target, 'settings.update', updates, { timeoutMs: 15_000 })
      saved = { ...saved, ...updates }
    },
    getSettings: () => {
      const settings = local.getSettings()
      return settings ? { ...settings, ...saved } : settings
    }
  }
}

/** The base-ref notices after a create; their buttons save where the create's settings live. */
export function showCreatedWorktreeBaseRefNotices(
  result: CreateWorktreeResult,
  target: RuntimeClientTarget,
  creationHostId: ExecutionHostId,
  get: () => Pick<
    AppState,
    'updateSettings' | 'settings' | 'openSettingsPage' | 'openSettingsTarget'
  >
): void {
  const state = get()
  const writer = creationHostSettingsWriter(target, {
    updateSettings: state.updateSettings,
    getSettings: () => get().settings
  })
  showLocalBaseRefRefreshToast(result.localBaseRefRefresh, result.worktree, {
    updateSettings: writer.updateSettings,
    executionHostId: creationHostId
  })
  if (result.baseFallback) {
    requestWorktreeBaseFallbackNotice(result.baseFallback)
  }
  showLocalBaseRefUpdateSuggestionToast(result.localBaseRefUpdateSuggestion, {
    ...writer,
    settingsHostScope: target,
    openSettingsPage: state.openSettingsPage,
    openSettingsTarget: state.openSettingsTarget
  })
}
