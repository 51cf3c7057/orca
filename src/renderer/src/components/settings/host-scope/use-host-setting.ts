import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import { useAppStateValue } from '@/store/retained-views/app-state-view'
import type { Translate } from '@/i18n/use-translate'
import type { GlobalSettings } from '../../../../../shared/settings/global-settings-types'
import type { RuntimeClientTarget } from '../../../../../shared/remote-runtime/host-catalog/runtime-client-target'
import { getLocalExecutionHostLabel } from '../../../../../shared/execution-host/execution-host'
import { errorMessage } from '../../../../../shared/errors/error-message'
import {
  readHostOwnedSetting,
  resolveHostOwnedSetting,
  type HostOwnedSettingKey,
  type HostOwnedSettings
} from '../../../../../shared/settings/host-owned-settings'

/** `unsupported`: an older host that neither reports nor accepts the setting. */
export type HostSetting<V> =
  | { state: 'loading' }
  | { state: 'unsupported' }
  | { state: 'ready'; value: V }

type HostSettings = { settings: Record<string, unknown> }

const HOST_SETTINGS_TIMEOUT_MS = 15_000
// Rows of one pane mount together; they share one settings.get per host.
const inFlightReads = new Map<string, Promise<HostSettings>>()

function readHostSettings(environmentId: string): Promise<HostSettings> {
  const pending = inFlightReads.get(environmentId)
  if (pending) {
    return pending
  }
  const read = callRuntimeRpc<HostSettings>(
    { kind: 'environment', environmentId },
    'settings.get',
    undefined,
    { timeoutMs: HOST_SETTINGS_TIMEOUT_MS }
  ).finally(() => inFlightReads.delete(environmentId))
  inFlightReads.set(environmentId, read)
  return read
}

function toHostSetting<K extends HostOwnedSettingKey>(
  settings: Record<string, unknown>,
  key: K
): HostSetting<HostOwnedSettings[K]> {
  // settings.update is strict, so writing the key to a host that does not report it would fail.
  const value = readHostOwnedSetting(settings, key)
  return value === undefined ? { state: 'unsupported' } : { state: 'ready', value }
}

/** The picked host's name, or this computer's. */
export function useSettingsHostLabel(owner: RuntimeClientTarget): string {
  const environmentId = owner.kind === 'environment' ? owner.environmentId : null
  const hostName = useAppStateValue((state) =>
    environmentId
      ? state.runtimeEnvironments.find((entry) => entry.id === environmentId)?.name
      : null
  )
  return hostName ?? getLocalExecutionHostLabel()
}

/** Reads and writes one setting on the host that owns it: this app's settings, or a server's. */
export function useHostSetting<K extends HostOwnedSettingKey>(args: {
  owner: RuntimeClientTarget
  settingKey: K
  /** This app's own settings, used when the owner is this app. */
  localSettings: Partial<GlobalSettings>
  updateLocalSettings: (updates: Partial<GlobalSettings>) => Promise<void> | void
  updateFailedMessage: string
}): {
  setting: HostSetting<HostOwnedSettings[K]>
  update: (value: HostOwnedSettings[K]) => Promise<void>
} {
  const { owner, settingKey, localSettings, updateLocalSettings, updateFailedMessage } = args
  const environmentId = owner.kind === 'environment' ? owner.environmentId : null
  const [remote, setRemote] = useState<{
    environmentId: string
    setting: HostSetting<HostOwnedSettings[K]>
  } | null>(null)
  // A slower reply to an earlier write must not undo a later one (text rows write per keystroke).
  const writeGeneration = useRef(0)

  useEffect(() => {
    if (!environmentId) {
      return
    }
    let current = true
    // A reply to a write sent to the previous host must not replace this host's value.
    const generation = ++writeGeneration.current
    void readHostSettings(environmentId).then(
      (result) => {
        if (current && generation === writeGeneration.current) {
          setRemote({ environmentId, setting: toHostSetting(result.settings, settingKey) })
        }
      },
      (error: unknown) => console.error(`Failed to load the host setting ${settingKey}:`, error)
    )
    return () => {
      current = false
    }
  }, [environmentId, settingKey])

  if (!environmentId) {
    return {
      setting: {
        state: 'ready',
        value: resolveHostOwnedSetting(localSettings, settingKey)
      },
      update: async (value) => {
        try {
          await updateLocalSettings({ [settingKey]: value })
        } catch (error) {
          toast.error(updateFailedMessage, { description: errorMessage(error) })
        }
      }
    }
  }
  return {
    setting: remote?.environmentId === environmentId ? remote.setting : { state: 'loading' },
    update: async (value) => {
      const generation = ++writeGeneration.current
      try {
        const result = await callRuntimeRpc<HostSettings>(
          { kind: 'environment', environmentId },
          'settings.update',
          { [settingKey]: value },
          { timeoutMs: HOST_SETTINGS_TIMEOUT_MS }
        )
        if (generation === writeGeneration.current) {
          setRemote({ environmentId, setting: toHostSetting(result.settings, settingKey) })
        }
      } catch (error) {
        // Text rows write per keystroke; one toast per host and setting.
        toast.error(updateFailedMessage, {
          id: `host-setting:${environmentId}:${settingKey}`,
          description: errorMessage(error)
        })
      }
    }
  }
}

export function getHostSettingUnsupportedNote(host: string, t: Translate): string {
  return t(
    'components.settings.hostScope.updateHostToChange',
    'Update Orca on {{host}} to change this setting there.',
    { host }
  )
}

export function getHostSettingUpdateFailedMessage(host: string, t: Translate): string {
  return t(
    'components.settings.hostScope.updateFailed',
    "Couldn't update the setting on {{host}}.",
    { host }
  )
}
