// Create a clone: a new bot with another bot's traits and none of its work. The source is read the way
// Share bot reads it and turned into the files a share package carries; then the bot is made the normal
// way and the package applied, so any failure deletes the new bot. The source is only read.
import { join } from 'node:path'
import type { Bot } from '../../shared/bot-types'
import { soulForName } from '../../shared/bots/bot-clone'
import { BOT_PACKAGE_SOUL_PATH, planBotFromPackage } from '../../shared/bots/bot-package'
import { redactBotText, scanBotText } from '../../shared/bots/bot-text-scan'
import type { BotCreateParams } from '../../shared/rpc-contract/bots-params'
import { InvalidArgumentError } from '../runtime/rpc/core'
import type { BotController, BotOrigin } from './bot-controller'
import { botHomeFolder } from './bot-home'
import {
  applyBotPackage,
  type BotPackageApply,
  type BotPackageApplyDeps
} from './bot-package-apply'
import { buildBotPackageContent } from './sharing/bot-package-content'
import { sharerRawFiles } from './sharing/bot-package-content-files'
import { botPackageFor } from './sharing/bot-package-export'
import type { BotShareable } from './sharing/bot-share-sources'

export type BotCloneCreateParams = BotCreateParams & {
  cloneFrom: NonNullable<BotCreateParams['cloneFrom']>
}

export type BotCloneCreateDeps = BotPackageApplyDeps & {
  bots: Pick<BotController, 'list' | 'create' | 'delete' | 'update'>
  /** The source as Share bot reads it (record, home, its own automations), from the runtime that
   *  already does that read for Share. */
  readShareable: (bot: Bot) => Promise<BotShareable>
}

export const BOT_CLONE_ERRORS = {
  gone: 'The bot to clone is gone.',
  secret: 'That soul text looks like it holds a secret. Nothing was created.'
} as const

/** The keys of a Claude bot's `.claude/settings.json` that carry over: its model settings, nothing that
 *  grants, runs or signs in. */
const CLONED_CLAUDE_SETTINGS = [
  'model',
  'effortLevel',
  'alwaysThinkingEnabled',
  'autoCompactEnabled',
  'modelSettings'
] as const

const CLAUDE_SETTINGS_PATH = ['.claude', 'settings.json'] as const

/** Refuses a soul text the owner or a bot gave when it looks like it holds a secret; never echoes it. */
export function assertSoulHoldsNoSecret(soul: string): void {
  if (scanBotText(soul).some((flag) => flag.kind === 'secret')) {
    throw new InvalidArgumentError(BOT_CLONE_ERRORS.secret)
  }
}

/** A line of the source's text that looks like it holds a secret stays behind, marked. */
const withoutSecretLines = (text: string): string =>
  scanBotText(text).some((flag) => flag.kind === 'secret') ? redactBotText(text).text : text

/** The source's settings file with only the allowed keys it has; null when there is nothing to carry. */
async function clonedClaudeSettings(
  deps: BotCloneCreateDeps,
  sourceHome: string
): Promise<string | null> {
  const text = await deps.filesystem.readText(join(sourceHome, ...CLAUDE_SETTINGS_PATH))
  let parsed: unknown
  try {
    parsed = text === null ? null : JSON.parse(text)
  } catch {
    return null
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null
  }
  const source = new Map(Object.entries(parsed))
  const kept = Object.fromEntries(
    CLONED_CLAUDE_SETTINGS.flatMap((key) => (source.has(key) ? [[key, source.get(key)]] : []))
  )
  return Object.keys(kept).length === 0 ? null : `${JSON.stringify(kept, null, 2)}\n`
}

/** How a clone makes a bot: its create params and origin, then, once the bot exists, the source's
 *  traits applied inside the same delete-on-failure. Throws before anything is made when the source is
 *  gone or a given soul holds a secret. */
export async function botCloneCreation(
  deps: BotCloneCreateDeps,
  input: BotCloneCreateParams
): Promise<{ params: BotCreateParams; origin: BotOrigin; finish: (bot: Bot) => Promise<Bot> }> {
  const { cloneFrom, soul: givenSoul, ...params } = input
  // Group homes are not bots, so a group's id is never found here.
  const source = deps.bots.list().find((bot) => bot.id === cloneFrom.botId)
  if (!source) {
    throw new InvalidArgumentError(BOT_CLONE_ERRORS.gone)
  }
  if (givenSoul !== undefined) {
    assertSoulHoldsNoSecret(givenSoul)
  }
  const sourceHome = botHomeFolder(source, deps.botsRoot())
  const shareable = await deps.readShareable(source)
  // Everything Share bot would offer, memory never: the same package value, so the same parts stay out.
  const declared = botPackageFor(source, shareable, { memory: [] })
  const content = buildBotPackageContent({
    bot: declared,
    files: await sharerRawFiles(shareable, declared)
  })
  const agent = params.agent ?? source.agent
  // A launch belongs to its agent, so the source's carries over only to the same agent.
  const launch = params.launch ?? (agent === source.agent ? source.launch : undefined)
  const permissionMode = params.permissionMode ?? source.permissionMode
  return {
    params: {
      ...params,
      agent,
      ...(launch ? { launch } : {}),
      ...(permissionMode ? { permissionMode } : {})
    },
    origin: { clonedFrom: { botId: source.id, name: source.name, clonedAt: Date.now() } },
    finish: (bot) => {
      const plan = planBotFromPackage(
        content.bot,
        content.files.map((file) => ({ path: file.path, executable: false })),
        { agent: bot.agent, toolIds: content.bot.tools.map((tool) => tool.id) }
      )
      const textOf = (path: string) => content.files.find((file) => file.path === path)?.text ?? ''
      const pkg: BotPackageApply = {
        files: plan.files.map((file) => ({
          to: file.to,
          text:
            file.from === BOT_PACKAGE_SOUL_PATH
              ? soulForName(givenSoul ?? withoutSecretLines(textOf(file.from)), bot.name)
              : withoutSecretLines(textOf(file.from))
        })),
        tools: plan.tools,
        schedules: plan.schedules,
        setup: {
          clonedFrom: source.name,
          connectors: plan.connectors,
          toolsToSignIn: plan.tools.map((tool) => tool.name),
          schedulesOff: plan.schedules.map((schedule) => schedule.name),
          eventsSuggested: plan.eventSuggestions.map(({ name, source: from, event }) => ({
            name,
            source: from,
            event
          }))
        }
      }
      return applyBotPackage(deps, bot, pkg, async (made) => {
        const linked = source.skillProjects?.length
          ? await deps.bots.update(made.id, { skillProjects: [...source.skillProjects] })
          : made
        if (source.agent === 'claude' && linked.agent === 'claude') {
          const settings = await clonedClaudeSettings(deps, sourceHome)
          if (settings !== null) {
            const home = botHomeFolder(linked, deps.botsRoot())
            await deps.filesystem.makeDirectory(join(home, CLAUDE_SETTINGS_PATH[0]))
            await deps.filesystem.writeText(join(home, ...CLAUDE_SETTINGS_PATH), settings)
          }
        }
        return linked
      })
    }
  }
}

/** A new bot from `input.cloneFrom`'s traits; throws InvalidArgumentError when the source is gone or a
 *  given soul trips the secret scan. */
export async function createBotFromClone(
  deps: BotCloneCreateDeps,
  input: BotCloneCreateParams
): Promise<Bot> {
  const made = await botCloneCreation(deps, input)
  return made.finish(await deps.bots.create(made.params, made.origin))
}
