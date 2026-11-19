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

/** The host whose own settings decided this create: a capable server, else this app (older hosts take ours). */
async function createSettingsOwner(target: RuntimeClientTarget): Promise<RuntimeClientTarget> {
  if (target.kind !== 'environment') {
    return target
  }
  const owns = await runtimeEnvironmentSupportsCapability(
    target.environmentId,
    WORKTREE_CREATE_HOST_OWNED_SETTINGS_RUNTIME_CAPABILITY
  ).catch(() => false)
  return owns ? target : { kind: 'local' }
}

function ownerSettingsWriter(owner: RuntimeClientTarget, local: SettingsWriter): SettingsWriter {
  if (owner.kind !== 'environment') {
    return local
  }
  // A host suggests keeping local main up to date only while its own switch is off.
  let saved: Partial<GlobalSettings> = { refreshLocalBaseRefOnWorktreeCreate: false }
  return {
    updateSettings: async (updates) => {
      await callRuntimeRpc(owner, 'settings.update', updates, { timeoutMs: 15_000 })
      saved = { ...saved, ...updates }
    },
    getSettings: () => {
      const settings = local.getSettings()
      return settings ? { ...settings, ...saved } : settings
    }
  }
}

/** The base-ref notices after a create; their buttons save where the create's settings live. */
export async function showCreatedWorktreeBaseRefNotices(
  result: CreateWorktreeResult,
  target: RuntimeClientTarget,
  creationHostId: ExecutionHostId,
  get: () => Pick<
    AppState,
    'updateSettings' | 'settings' | 'openSettingsPage' | 'openSettingsTarget'
  >
): Promise<void> {
  const owner = await createSettingsOwner(target)
  const state = get()
  const writer = ownerSettingsWriter(owner, {
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
    ...(owner.kind === 'environment' ? { settingsHostScope: owner } : {}),
    openSettingsPage: state.openSettingsPage,
    openSettingsTarget: state.openSettingsTarget
  })
}
