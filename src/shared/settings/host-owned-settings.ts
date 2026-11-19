import * as z from 'zod'
import type { GlobalSettings } from './global-settings-types'

function hostOwned<T extends z.ZodType>(schema: T, fallback: z.output<T>) {
  return { schema, fallback }
}

/** Settings a host reads for its own work, so Settings edits them on the host its picker names.
 * `fallback` is what the host uses when its profile has no value. */
export const HOST_OWNED_SETTINGS = {
  branchPrefix: hostOwned(z.enum(['git-username', 'custom', 'none']), 'git-username'),
  branchPrefixCustom: hostOwned(z.string(), ''),
  codexShareHistoryAcrossAccounts: hostOwned(z.boolean(), true),
  deleteChatHistoryWithWorkspace: hostOwned(z.boolean(), false),
  nativeChatAutoContinueAfterUsageLimit: hostOwned(z.boolean(), false)
} satisfies {
  [K in keyof GlobalSettings]?: {
    schema: z.ZodType<NonNullable<GlobalSettings[K]>>
    fallback: NonNullable<GlobalSettings[K]>
  }
}

export type HostOwnedSettingKey = keyof typeof HOST_OWNED_SETTINGS

export type HostOwnedSettings = {
  [K in HostOwnedSettingKey]: (typeof HOST_OWNED_SETTINGS)[K]['fallback']
}

export const HOST_OWNED_SETTING_KEYS = Object.keys(HOST_OWNED_SETTINGS) as HostOwnedSettingKey[]

/** Optional fields for the strict settings.update schema. */
export const HOST_OWNED_SETTING_UPDATE_SHAPE = Object.fromEntries(
  HOST_OWNED_SETTING_KEYS.map((key) => [key, HOST_OWNED_SETTINGS[key].schema.optional()])
) as {
  [K in HostOwnedSettingKey]: z.ZodOptional<(typeof HOST_OWNED_SETTINGS)[K]['schema']>
}

/** A host's reported value, or undefined when an older host neither reports nor accepts the key. */
export function readHostOwnedSetting<K extends HostOwnedSettingKey>(
  settings: Readonly<Record<string, unknown>>,
  key: K
): HostOwnedSettings[K] | undefined {
  const parsed = HOST_OWNED_SETTINGS[key].schema.safeParse(settings[key])
  return parsed.success ? (parsed.data as HostOwnedSettings[K]) : undefined
}

/** Every key, always present, so a client can tell this host accepts it (settings.update is strict). */
export function projectHostOwnedSettings(
  settings: Readonly<Partial<Record<HostOwnedSettingKey, unknown>>>
): HostOwnedSettings {
  return Object.fromEntries(
    HOST_OWNED_SETTING_KEYS.map((key) => [
      key,
      readHostOwnedSetting(settings, key) ?? HOST_OWNED_SETTINGS[key].fallback
    ])
  ) as HostOwnedSettings
}
