// A bot made from another bot: its traits (soul, agent, skills, tools, schedules) and none of its work.
// What the New bot dialog, a bot's card and the CLI share about it.
import { BOT_NAME_MAX_LENGTH } from '../bot-types'

/** Longest soul text accepted from a file or a card, in UTF-16 units. */
export const BOT_SOUL_TEXT_MAX = 20000

const FRONT_MATTER_FENCE = /^---\s*$/
const LEVEL_ONE_HEADING = /^#(?:[ \t]|$)/

/** `text` with its first Markdown heading line (`# …`) replaced by `# <name>`.
 *  With no level-one heading in the first 5 non-empty lines, `# <name>` and a blank line are put in front.
 *  A leading YAML front matter block (`---` … `---`) is removed first. Line endings become `\n`,
 *  and the result ends with exactly one `\n`. */
export function soulForName(text: string, name: string): string {
  let lines = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n')
  if (FRONT_MATTER_FENCE.test(lines[0] ?? '')) {
    const end = lines.findIndex((line, index) => index > 0 && FRONT_MATTER_FENCE.test(line))
    if (end !== -1) {
      lines = lines.slice(end + 1)
    }
  }
  const first = lines.findIndex((line) => line.trim() !== '')
  lines = first === -1 ? [] : lines.slice(first)
  const heading = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.trim() !== '')
    .slice(0, 5)
    .find(({ line }) => LEVEL_ONE_HEADING.test(line))
  if (heading) {
    lines[heading.index] = `# ${name}`
  } else {
    lines = [`# ${name}`, '', ...lines]
  }
  return `${lines.join('\n').replace(/\n+$/, '')}\n`
}

/** `stem` cut so `stem + tail` fits the bot name limit, never splitting a character in two. */
function fitted(stem: string, tail: string): string {
  const room = BOT_NAME_MAX_LENGTH - tail.length
  if (stem.length <= room) {
    return `${stem}${tail}`
  }
  let cut = stem.slice(0, Math.max(0, room))
  if (/[\uD800-\uDBFF]$/.test(cut)) {
    cut = cut.slice(0, -1)
  }
  return `${tail.startsWith(' ') ? cut.trimEnd() : cut}${tail}`
}

/** A free name for a clone of `source`, given the names in use (compared ignoring case).
 *  A name that ends in digits counts up: "Architect#1" -> "Architect#2", "Bot 9" -> "Bot 10".
 *  Any other name gets " 2", then " 3": "Scout" -> "Scout 2". Never longer than the bot name limit:
 *  the stem is cut to fit. */
export function cloneName(source: string, taken: readonly string[]): string {
  const used = new Set(taken.map((name) => name.trim().toLowerCase()))
  const trimmed = source.trim()
  const numbered = /^(.*?)(\d+)$/.exec(trimmed)
  const stem = numbered ? numbered[1]! : trimmed
  const separator = numbered ? '' : ' '
  // Digits can outrun a safe integer; counting stays exact.
  let count = numbered ? BigInt(numbered[2]!) + 1n : 2n
  for (;;) {
    const name = fitted(stem, `${separator}${count}`)
    if (!used.has(name.toLowerCase())) {
      return name
    }
    count += 1n
  }
}

/** What a clone copies and what it leaves, as short English labels for the dialog, the card and the CLI. */
export const BOT_CLONE_COPIED: readonly string[] = [
  'Soul',
  'Agent and model',
  'Skills',
  'Tools (sign in again)',
  'Schedules (turned off)'
]

export const BOT_CLONE_NOT_COPIED: readonly string[] = [
  'Memory',
  'Chats and items',
  'Workspaces',
  'Connectors and sign-ins',
  'Picture'
]
