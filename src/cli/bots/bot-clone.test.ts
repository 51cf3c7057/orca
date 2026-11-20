import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ORCA_AGENT_SESSION_ID_ENV } from '../../shared/agent-session/lifecycle/launch/agent-session-caller-env'
import type { RuntimeClient } from '../runtime/client'
import { BOT_CLONE_HANDLERS } from './bot-clone'

let folder: string
let calls: { method: string; params: unknown }[]

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'orca-bot-clone-cli-'))
  calls = []
})

/** What the command proposed: its bots.createOffer calls. */
const offers = () => calls.filter((entry) => entry.method === 'bots.createOffer')

afterEach(() => {
  rmSync(folder, { recursive: true, force: true })
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

const BOTS = [
  { id: 'b-scout', name: 'Scout' },
  { id: 'b-harbor', name: 'Harbor' }
]

async function clone(flags: [string, string | boolean][]) {
  vi.stubEnv(ORCA_AGENT_SESSION_ID_ENV, 'chat-1')
  const call = vi.fn(async (method: string, params?: unknown) => {
    calls.push({ method, params })
    const result = method === 'bots.list' ? { bots: BOTS } : { offered: true, message: 'shown' }
    return { id: 'r', ok: true as const, result, _meta: { runtimeId: 'rt' } }
  })
  vi.spyOn(console, 'log').mockImplementation(() => {})
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the handler reads only client.call.
  const client = { call } as unknown as RuntimeClient
  await BOT_CLONE_HANDLERS['bot clone']!({
    flags: new Map<string, string | boolean>(flags),
    client,
    cwd: folder,
    json: false
  })
  return offers()
}

describe('orca bot clone', () => {
  it('never creates a bot directly: without --offer it refuses and calls nothing', async () => {
    await expect(
      clone([
        ['from', 'Scout'],
        ['name', 'Scout 2']
      ])
    ).rejects.toThrow(
      'A bot can’t create a bot. Propose one with --offer; your owner creates it from the card.'
    )
    expect(calls).toEqual([])
  })

  it('proposes a clone of the bot named in any case, with the default purpose', async () => {
    expect(
      await clone([
        ['offer', true],
        ['from', 'sCOUT'],
        ['name', 'Scout 2']
      ])
    ).toEqual([
      {
        method: 'bots.createOffer',
        params: {
          callerSessionId: 'chat-1',
          name: 'Scout 2',
          purpose: 'A clone of Scout: its traits, none of its work.',
          cloneFrom: { botId: 'b-scout', name: 'Scout' }
        }
      }
    ])
  })

  it('finds the bot by id and sends a soul file as the soul', async () => {
    writeFileSync(join(folder, 'soul.md'), '# Lighthouse\nKeeps watch.\n')
    expect(
      await clone([
        ['offer', true],
        ['from', 'b-harbor'],
        ['name', 'Lighthouse'],
        ['purpose', 'Keeps watch over the harbor.'],
        ['soul-file', 'soul.md']
      ])
    ).toEqual([
      {
        method: 'bots.createOffer',
        params: {
          callerSessionId: 'chat-1',
          name: 'Lighthouse',
          purpose: 'Keeps watch over the harbor.',
          cloneFrom: { botId: 'b-harbor', name: 'Harbor' },
          soul: '# Lighthouse\nKeeps watch.\n'
        }
      }
    ])
  })

  it('names the bots there are when --from matches none', async () => {
    await expect(
      clone([
        ['offer', true],
        ['from', 'Atlas'],
        ['name', 'Atlas 2']
      ])
    ).rejects.toThrow('No bot named Atlas. The bots here are: Scout, Harbor.')
  })

  it('offers nothing for a soul file that is missing, empty or too long', async () => {
    writeFileSync(join(folder, 'blank.md'), ' \n\n')
    writeFileSync(join(folder, 'long.md'), 'x'.repeat(20001))
    const cases: [string, string][] = [
      ['missing.md', "--soul-file: can't read missing.md."],
      ['blank.md', '--soul-file: blank.md is empty.'],
      ['long.md', '--soul-file: long.md is longer than 20000 characters.']
    ]
    for (const [file, why] of cases) {
      await expect(
        clone([
          ['offer', true],
          ['from', 'Scout'],
          ['name', 'Scout 2'],
          ['soul-file', file]
        ])
      ).rejects.toThrow(why)
      expect(offers()).toEqual([])
    }
  })
})
